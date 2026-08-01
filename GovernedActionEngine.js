/**
 * Moore Holdings AI Command Center — Governed Action Engine
 *
 * Shared lifecycle:
 * preview -> queue -> approve -> execute -> verify -> audit
 *
 * Execution adapters remain deny-by-default. An action type cannot perform
 * external work until a validated adapter is explicitly registered.
 */

const GOVERNED_ACTION_ENGINE = Object.freeze({
  version: '1.0.0',
  approvalCode: 'ERNEST_APPROVES_GOVERNED_ACTION',
  approvalTtlByRiskMs: Object.freeze({
    LOW: 24 * 60 * 60 * 1000,
    MEDIUM: 4 * 60 * 60 * 1000,
    HIGH: 60 * 60 * 1000,
    CRITICAL: 15 * 60 * 1000
  }),
  propertyPrefix: 'MHC_GOVERNED_ACTION_',
  auditProperty: 'MHC_GOVERNED_ACTION_AUDIT',
  maxAuditEntries: 100,
  statuses: Object.freeze({
    PREVIEWED: 'PREVIEWED',
    QUEUED: 'QUEUED',
    APPROVED: 'APPROVED',
    EXECUTING: 'EXECUTING',
    VERIFIED: 'VERIFIED',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED'
  }),
  riskByType: Object.freeze({
    CREATE_TASK: 'LOW',
    SAVE_INTERNAL_NOTE: 'LOW',
    AIRTABLE_RECORD_UPDATE: 'MEDIUM',
    CREATE_DOCUMENT: 'MEDIUM',
    CREATE_CALENDAR_EVENT: 'MEDIUM',
    SEND_EXTERNAL_MESSAGE: 'HIGH',
    SUBMIT_DISPUTE: 'HIGH',
    SUBMIT_APPLICATION: 'HIGH',
    AUTHORIZE_PURCHASE: 'CRITICAL',
    AUTHORIZE_PAYMENT: 'CRITICAL',
    SIGN_CONTRACT: 'CRITICAL',
    PLACE_TRADE: 'CRITICAL',
    DELETE_RECORD: 'CRITICAL'
  })
});


function previewGovernedAction(request) {
  const normalized = normalizeGovernedActionRequest_(request);
  const now = new Date().toISOString();
  const action = {
    actionId: buildGovernedActionId_(normalized, now),
    idempotencyKey: normalized.idempotencyKey,
    module: normalized.module,
    lifecycleStage: normalized.lifecycleStage,
    actionType: normalized.actionType,
    riskLevel: GOVERNED_ACTION_ENGINE.riskByType[normalized.actionType],
    target: normalized.target,
    payload: normalized.payload,
    reason: normalized.reason,
    requestedBy: normalized.requestedBy,
    status: GOVERNED_ACTION_ENGINE.statuses.PREVIEWED,
    approvalRequired: true,
    approval: null,
    execution: null,
    verification: null,
    failure: null,
    createdAt: now,
    updatedAt: now,
    sideEffectsPreview: describeGovernedActionEffects_(normalized),
    safety: {
      dryRun: true,
      externalActionPerformed: false,
      airtableRecordsChanged: 0,
      messagesSent: 0,
      filesCreated: 0,
      calendarEventsCreated: 0,
      paymentsAuthorized: 0,
      applicationsSubmitted: 0,
      purchasesAuthorized: 0,
      tradesPlaced: 0,
      recordsDeleted: 0
    }
  };

  appendGovernedActionAudit_('PREVIEW_CREATED', action, {});
  return sanitizeGovernedActionForDashboard_(action);
}


function queueGovernedAction(request) {
  const preview = previewGovernedAction(request);
  const action = Object.assign({}, preview, {
    status: GOVERNED_ACTION_ENGINE.statuses.QUEUED,
    updatedAt: new Date().toISOString()
  });

  saveGovernedAction_(action);
  appendGovernedActionAudit_('ACTION_QUEUED', action, {});
  return sanitizeGovernedActionForDashboard_(action);
}


function approveGovernedAction(actionId, confirmationCode, executiveNote) {
  if (confirmationCode !== GOVERNED_ACTION_ENGINE.approvalCode) {
    throw new Error('Exact executive approval confirmation is required.');
  }

  const action = requireGovernedAction_(actionId);
  requireGovernedActionStatus_(
    action,
    [GOVERNED_ACTION_ENGINE.statuses.QUEUED]
  );

  const now = Date.now();
  action.status = GOVERNED_ACTION_ENGINE.statuses.APPROVED;
  action.approval = {
    approvedBy: 'Ernest Moore Jr.',
    approvedAt: new Date(now).toISOString(),
    expiresAt: new Date(
      now + getGovernedActionApprovalTtlMs_(action.riskLevel)
    ).toISOString(),
    executiveNote: String(executiveNote || '').trim()
  };
  action.updatedAt = action.approval.approvedAt;

  saveGovernedAction_(action);
  appendGovernedActionAudit_('ACTION_APPROVED', action, {
    executiveNote: action.approval.executiveNote
  });

  return sanitizeGovernedActionForDashboard_(action);
}


function executeApprovedGovernedAction(actionId, confirmationCode) {
  if (confirmationCode !== GOVERNED_ACTION_ENGINE.approvalCode) {
    throw new Error('Exact execution confirmation is required.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const action = requireGovernedAction_(actionId);

    if (action.status === GOVERNED_ACTION_ENGINE.statuses.VERIFIED) {
      return sanitizeGovernedActionForDashboard_(action);
    }

    requireGovernedActionStatus_(
      action,
      [GOVERNED_ACTION_ENGINE.statuses.APPROVED]
    );
    requireUnexpiredGovernedActionApproval_(action);
    requireNoVerifiedIdempotencyDuplicate_(action);

    const executor = getGovernedActionExecutor_(action.actionType);
    if (typeof executor !== 'function') {
      throw new Error(
        'Execution adapter is not registered for ' +
        action.actionType +
        '. Action stopped safely.'
      );
    }

    action.status = GOVERNED_ACTION_ENGINE.statuses.EXECUTING;
    action.updatedAt = new Date().toISOString();
    saveGovernedAction_(action);
    appendGovernedActionAudit_('EXECUTION_STARTED', action, {});

    const executionResult = executor(action);
    if (
      !executionResult ||
      executionResult.completed !== true ||
      executionResult.verified !== true
    ) {
      throw new Error(
        'Execution adapter did not return completed and verified evidence.'
      );
    }

    action.status = GOVERNED_ACTION_ENGINE.statuses.VERIFIED;
    action.execution = {
      completedAt: new Date().toISOString(),
      result: executionResult.result || {},
      sideEffects: executionResult.sideEffects || {}
    };
    action.verification = {
      verified: true,
      verifiedAt: new Date().toISOString(),
      evidence: executionResult.evidence || {}
    };
    action.updatedAt = action.verification.verifiedAt;

    saveGovernedAction_(action);
    appendGovernedActionAudit_('ACTION_VERIFIED', action, {
      evidence: action.verification.evidence
    });

    return sanitizeGovernedActionForDashboard_(action);
  } catch (error) {
    recordGovernedActionFailure_(actionId, error);
    throw error;
  } finally {
    lock.releaseLock();
  }
}


function cancelGovernedAction(actionId, reason) {
  const action = requireGovernedAction_(actionId);

  if (
    action.status === GOVERNED_ACTION_ENGINE.statuses.EXECUTING ||
    action.status === GOVERNED_ACTION_ENGINE.statuses.VERIFIED
  ) {
    throw new Error('Executing or verified actions cannot be cancelled.');
  }

  action.status = GOVERNED_ACTION_ENGINE.statuses.CANCELLED;
  action.updatedAt = new Date().toISOString();
  action.failure = {
    reason: String(reason || 'Cancelled by executive').trim()
  };

  saveGovernedAction_(action);
  appendGovernedActionAudit_('ACTION_CANCELLED', action, action.failure);
  return sanitizeGovernedActionForDashboard_(action);
}


function getGovernedActionQueue() {
  const properties = PropertiesService.getScriptProperties().getProperties();
  const actions = Object.keys(properties)
    .filter(function(key) {
      return key.indexOf(GOVERNED_ACTION_ENGINE.propertyPrefix) === 0;
    })
    .map(function(key) {
      try {
        return JSON.parse(properties[key]);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort(function(a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

  return {
    engineVersion: GOVERNED_ACTION_ENGINE.version,
    actions: actions.map(sanitizeGovernedActionForDashboard_),
    audit: getGovernedActionAudit_(),
    executionAdaptersLockedByDefault: true
  };
}


function normalizeGovernedActionRequest_(request) {
  request = request && typeof request === 'object' ? request : {};

  const required = [
    'module',
    'lifecycleStage',
    'actionType',
    'target',
    'reason'
  ];

  required.forEach(function(field) {
    if (!String(request[field] || '').trim()) {
      throw new Error('Governed action requires ' + field + '.');
    }
  });

  const actionType = String(request.actionType).trim().toUpperCase();
  if (!GOVERNED_ACTION_ENGINE.riskByType[actionType]) {
    throw new Error('Unsupported governed action type: ' + actionType);
  }

  const payload =
    request.payload && typeof request.payload === 'object'
      ? JSON.parse(JSON.stringify(request.payload))
      : {};

  return {
    module: String(request.module).trim(),
    lifecycleStage: String(request.lifecycleStage).trim(),
    actionType: actionType,
    target: String(request.target).trim(),
    payload: payload,
    reason: String(request.reason).trim(),
    requestedBy: String(request.requestedBy || 'Command Center').trim(),
    idempotencyKey: String(
      request.idempotencyKey ||
      [
        request.module,
        actionType,
        request.target,
        JSON.stringify(payload)
      ].join('|')
    )
  };
}


function describeGovernedActionEffects_(action) {
  return {
    summary:
      action.actionType + ' for ' + action.target,
    module: action.module,
    lifecycleStage: action.lifecycleStage,
    riskLevel: GOVERNED_ACTION_ENGINE.riskByType[action.actionType],
    proposedPayload: maskGovernedActionPayload_(action.payload),
    warnings: [
      'No action has been executed.',
      'Executive approval is required.',
      'Execution will fail closed unless a validated adapter is registered.',
      'A verified audit record is required before completion.'
    ]
  };
}


function getGovernedActionExecutor_(actionType) {
  const registry = getGovernedActionExecutorRegistry_();
  return registry[actionType] || null;
}


function getGovernedActionExecutorRegistry_() {
  return {};
}


function getGovernedActionApprovalTtlMs_(riskLevel) {
  const ttl = GOVERNED_ACTION_ENGINE.approvalTtlByRiskMs[riskLevel];

  if (!ttl) {
    throw new Error('Approval expiration is not configured for ' + riskLevel);
  }

  return ttl;
}


function requireUnexpiredGovernedActionApproval_(action) {
  const expiresAt =
    action.approval && Date.parse(action.approval.expiresAt);

  if (!expiresAt || Date.now() > expiresAt) {
    action.status = GOVERNED_ACTION_ENGINE.statuses.EXPIRED;
    action.updatedAt = new Date().toISOString();
    saveGovernedAction_(action);
    appendGovernedActionAudit_('APPROVAL_EXPIRED', action, {});
    throw new Error('Executive approval expired; preview and approve again.');
  }
}


function requireNoVerifiedIdempotencyDuplicate_(action) {
  const queue = getGovernedActionQueue().actions;
  const duplicate = queue.some(function(candidate) {
    return (
      candidate.actionId !== action.actionId &&
      candidate.idempotencyKey === action.idempotencyKey &&
      candidate.status === GOVERNED_ACTION_ENGINE.statuses.VERIFIED
    );
  });

  if (duplicate) {
    throw new Error('A verified action already used this idempotency key.');
  }
}


function requireGovernedAction_(actionId) {
  const value = PropertiesService.getScriptProperties().getProperty(
    GOVERNED_ACTION_ENGINE.propertyPrefix + actionId
  );

  if (!value) {
    throw new Error('Governed action was not found: ' + actionId);
  }

  return JSON.parse(value);
}


function requireGovernedActionStatus_(action, allowedStatuses) {
  if (allowedStatuses.indexOf(action.status) === -1) {
    throw new Error(
      'Action status ' + action.status +
      ' is not allowed for this operation.'
    );
  }
}


function saveGovernedAction_(action) {
  PropertiesService.getScriptProperties().setProperty(
    GOVERNED_ACTION_ENGINE.propertyPrefix + action.actionId,
    JSON.stringify(action)
  );
}


function appendGovernedActionAudit_(eventType, action, details) {
  const properties = PropertiesService.getScriptProperties();
  const current = properties.getProperty(
    GOVERNED_ACTION_ENGINE.auditProperty
  );
  let audit = [];

  if (current) {
    try {
      audit = JSON.parse(current);
    } catch (error) {
      audit = [];
    }
  }

  audit.unshift({
    eventId: Utilities.getUuid(),
    eventType: eventType,
    actionId: action.actionId,
    module: action.module,
    actionType: action.actionType,
    status: action.status,
    occurredAt: new Date().toISOString(),
    details: maskGovernedActionPayload_(details || {})
  });

  audit = audit.slice(0, GOVERNED_ACTION_ENGINE.maxAuditEntries);
  properties.setProperty(
    GOVERNED_ACTION_ENGINE.auditProperty,
    JSON.stringify(audit)
  );
}


function getGovernedActionAudit_() {
  const value = PropertiesService.getScriptProperties().getProperty(
    GOVERNED_ACTION_ENGINE.auditProperty
  );

  if (!value) return [];

  try {
    return JSON.parse(value);
  } catch (error) {
    return [];
  }
}


function recordGovernedActionFailure_(actionId, error) {
  try {
    const action = requireGovernedAction_(actionId);
    action.status = GOVERNED_ACTION_ENGINE.statuses.FAILED;
    action.failure = {
      failedAt: new Date().toISOString(),
      message: error && error.message ? error.message : String(error),
      recoveryRequired: true
    };
    action.updatedAt = action.failure.failedAt;
    saveGovernedAction_(action);
    appendGovernedActionAudit_('ACTION_FAILED', action, action.failure);
  } catch (ignored) {
    console.error('Unable to record governed-action failure: ' + ignored);
  }
}


function buildGovernedActionId_(action, timestamp) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    [
      action.idempotencyKey,
      timestamp,
      Utilities.getUuid()
    ].join('|')
  );

  return Utilities.base64EncodeWebSafe(digest)
    .replace(/=+$/g, '')
    .slice(0, 24);
}


function maskGovernedActionPayload_(value) {
  if (!value || typeof value !== 'object') return value;

  const masked = Array.isArray(value) ? [] : {};
  const sensitive = /token|secret|password|ssn|accountnumber|routing/i;

  Object.keys(value).forEach(function(key) {
    if (sensitive.test(key.replace(/[^a-z0-9]/gi, ''))) {
      masked[key] = '[REDACTED]';
    } else if (value[key] && typeof value[key] === 'object') {
      masked[key] = maskGovernedActionPayload_(value[key]);
    } else {
      masked[key] = value[key];
    }
  });

  return masked;
}


function sanitizeGovernedActionForDashboard_(action) {
  const copy = JSON.parse(JSON.stringify(action));
  copy.payload = maskGovernedActionPayload_(copy.payload || {});
  if (copy.approval) {
    delete copy.approval.confirmationCode;
  }
  return copy;
}


function testGovernedActionEngineContract() {
  const source = String(GOVERNED_ACTION_ENGINE.version);
  const supportedTypes = Object.keys(
    GOVERNED_ACTION_ENGINE.riskByType
  );

  if (
    source !== '1.0.0' ||
    supportedTypes.length < 10 ||
    getGovernedActionApprovalTtlMs_('LOW') !== 24 * 60 * 60 * 1000 ||
    getGovernedActionApprovalTtlMs_('MEDIUM') !== 4 * 60 * 60 * 1000 ||
    getGovernedActionApprovalTtlMs_('HIGH') !== 60 * 60 * 1000 ||
    getGovernedActionApprovalTtlMs_('CRITICAL') !== 15 * 60 * 1000 ||
    typeof getGovernedActionExecutorRegistry_() !== 'object' ||
    Object.keys(getGovernedActionExecutorRegistry_()).length !== 0
  ) {
    throw new Error('Governed Action Engine contract validation failed.');
  }

  return {
    completed: true,
    executionAdaptersLockedByDefault: true,
    supportedActionTypes: supportedTypes.length,
    safety: {
      externalActionsPerformed: 0,
      liveAdaptersRegistered: 0
    }
  };
}
