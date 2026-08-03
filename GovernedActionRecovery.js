/**
 * Moore Holdings AI Command Center — Governed Action Recovery
 *
 * Failed actions are immutable. Recovery creates one linked replacement action
 * that returns to the normal queue and requires fresh executive approval.
 */

const GOVERNED_ACTION_RECOVERY = Object.freeze({
  propertyPrefix: 'MHC_GOVERNED_RECOVERY_',
  statusesEligibleForRecovery: Object.freeze(['FAILED'])
});


function previewGovernedActionRecovery(failedActionId, recoveryReason) {
  const failed = requireRecoverableGovernedAction_(failedActionId);
  const existing = getGovernedActionRecoveryLink_(failed.actionId);

  return {
    recoveryOfActionId: failed.actionId,
    existingReplacementActionId: existing && existing.replacementActionId || null,
    module: failed.module,
    lifecycleStage: failed.lifecycleStage,
    actionType: failed.actionType,
    riskLevel: failed.riskLevel,
    target: failed.target,
    recoveryReason: requireGovernedRecoveryReason_(recoveryReason),
    failedAt: failed.failure && failed.failure.failedAt || null,
    failureMessage: failed.failure && failed.failure.message || null,
    approvalRequired: true,
    externalActionPerformed: false,
    warnings: [
      'The failed action remains immutable.',
      'Only one replacement action may be queued for this failure.',
      'The replacement requires fresh CEO approval before execution.',
      'No external action is performed by recovery preview or queueing.'
    ]
  };
}


function queueGovernedActionRecovery(failedActionId, recoveryReason) {
  const failed = requireRecoverableGovernedAction_(failedActionId);
  const reason = requireGovernedRecoveryReason_(recoveryReason);
  const properties = PropertiesService.getScriptProperties();
  const linkKey = GOVERNED_ACTION_RECOVERY.propertyPrefix + failed.actionId;
  const existing = getGovernedActionRecoveryLink_(failed.actionId);

  if (existing && existing.replacementActionId) {
    return sanitizeGovernedActionForDashboard_(
      requireGovernedAction_(existing.replacementActionId)
    );
  }

  const replacement = queueGovernedAction({
    module: failed.module,
    lifecycleStage: failed.lifecycleStage,
    actionType: failed.actionType,
    target: failed.target,
    payload: JSON.parse(JSON.stringify(failed.payload || {})),
    reason: 'Recovery for failed action ' + failed.actionId + ': ' + reason,
    requestedBy: 'Command Center Recovery',
    idempotencyKey:
      failed.idempotencyKey + '|recovery|' + failed.actionId + '|' +
      Utilities.getUuid()
  });

  const link = {
    failedActionId: failed.actionId,
    replacementActionId: replacement.actionId,
    queuedAt: new Date().toISOString(),
    recoveryReason: reason,
    requiresFreshApproval: true
  };

  properties.setProperty(linkKey, JSON.stringify(link));
  appendGovernedActionAudit_('RECOVERY_REPLACEMENT_QUEUED', failed, {
    replacementActionId: replacement.actionId,
    recoveryReason: reason,
    externalActionPerformed: false
  });

  return replacement;
}


function requireRecoverableGovernedAction_(failedActionId) {
  const action = requireGovernedAction_(String(failedActionId || '').trim());

  if (
    GOVERNED_ACTION_RECOVERY.statusesEligibleForRecovery.indexOf(action.status) === -1 ||
    !action.failure ||
    action.failure.recoveryRequired !== true
  ) {
    throw new Error(
      'Only failed governed actions marked for recovery can create replacements.'
    );
  }

  return action;
}


function requireGovernedRecoveryReason_(recoveryReason) {
  const reason = String(recoveryReason || '').trim();
  if (!reason) {
    throw new Error('Governed recovery requires a documented reason.');
  }
  return reason;
}


function getGovernedActionRecoveryLink_(failedActionId) {
  const value = PropertiesService.getScriptProperties().getProperty(
    GOVERNED_ACTION_RECOVERY.propertyPrefix + failedActionId
  );

  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error('Governed recovery link is corrupted; manual review required.');
  }
}
