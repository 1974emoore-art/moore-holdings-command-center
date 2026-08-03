/**
 * Moore Holdings AI Command Center — Governed rollback planning.
 *
 * A rollback is never automatic. It is represented as a new governed action
 * that must be reviewed, approved, executed, verified, and audited.
 */

function previewGovernedActionRollback(sourceActionId, reason) {
  const source = requireRollbackSourceAction_(sourceActionId);
  const rollback = buildGovernedRollbackRequest_(source, reason);

  return {
    sourceActionId: source.actionId,
    rollbackSupported: true,
    rollbackActionType: rollback.actionType,
    riskLevel: GOVERNED_ACTION_ENGINE.riskByType[rollback.actionType],
    target: rollback.target,
    proposedPayload: maskGovernedActionPayload_(rollback.payload),
    approvalRequired: true,
    externalActionPerformed: false,
    warning: 'Rollback has not been queued or executed.'
  };
}


function queueGovernedActionRollback(sourceActionId, reason) {
  const source = requireRollbackSourceAction_(sourceActionId);
  const existing = findGovernedRollbackAction_(source.actionId);

  if (existing) {
    return sanitizeGovernedActionForDashboard_(existing);
  }

  const queued = queueGovernedAction(
    buildGovernedRollbackRequest_(source, reason)
  );

  appendGovernedActionAudit_('ROLLBACK_QUEUED', source, {
    rollbackActionId: queued.actionId,
    reason: String(reason || '').trim()
  });

  return queued;
}


function requireRollbackSourceAction_(sourceActionId) {
  const source = requireGovernedAction_(sourceActionId);

  if (source.status !== GOVERNED_ACTION_ENGINE.statuses.VERIFIED) {
    throw new Error('Only verified governed actions can be rolled back.');
  }

  if (source.actionType !== 'AIRTABLE_RECORD_UPDATE') {
    throw new Error(
      'Rollback is not supported for governed action type ' +
      source.actionType + '.'
    );
  }

  const result = source.execution && source.execution.result;
  const evidence = source.verification && source.verification.evidence;

  if (
    !result ||
    !result.tableId ||
    !result.recordId ||
    !evidence ||
    !evidence.before ||
    !evidence.after
  ) {
    throw new Error('Verified before-and-after evidence is required for rollback.');
  }

  return source;
}


function buildGovernedRollbackRequest_(source, reason) {
  const result = source.execution.result;
  const evidence = source.verification.evidence;

  return {
    module: source.module,
    lifecycleStage: 'Rollback and recovery',
    actionType: 'AIRTABLE_RECORD_UPDATE',
    target: source.target,
    payload: {
      tableId: result.tableId,
      recordId: result.recordId,
      fields: JSON.parse(JSON.stringify(evidence.before)),
      expectedFields: JSON.parse(JSON.stringify(evidence.after)),
      rollbackOfActionId: source.actionId
    },
    reason: String(reason || 'Rollback verified governed action').trim(),
    requestedBy: 'Command Center governed rollback',
    idempotencyKey: 'ROLLBACK|' + source.actionId
  };
}


function findGovernedRollbackAction_(sourceActionId) {
  const expectedKey = 'ROLLBACK|' + sourceActionId;
  const actions = getGovernedActionQueue().actions;

  for (let index = 0; index < actions.length; index += 1) {
    if (actions[index].idempotencyKey === expectedKey) {
      return requireGovernedAction_(actions[index].actionId);
    }
  }

  return null;
}
