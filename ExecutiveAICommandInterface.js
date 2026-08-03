/**
 * Moore Holdings Executive AI Command Interface.
 *
 * Converts a constrained executive command into a governed-action request.
 * Default behavior is preview-only. queue:true may place the request in the
 * approval inbox, but this interface cannot approve or execute actions.
 */
function runExecutiveAICommand(input) {
  const command = input && typeof input === 'object' ? input : {};
  const intent = String(command.intent || '').trim().toUpperCase();
  const request = buildExecutiveGovernedRequest_(intent, command);
  const result = command.queue === true
    ? queueGovernedAction(request)
    : previewGovernedAction(request);

  return {
    mode: command.queue === true ? 'QUEUED_FOR_APPROVAL' : 'PREVIEW_ONLY',
    action: result,
    approvalPerformed: false,
    executionPerformed: false,
    safety: {
      externalActionPerformed: false,
      requiresExecutiveApproval: true,
      denyByDefault: true
    }
  };
}

function buildExecutiveGovernedRequest_(intent, command) {
  const builders = {
    CREATE_TASK: buildExecutiveTaskRequest_,
    CREATE_CALENDAR_EVENT: buildExecutiveCalendarRequest_,
    SEND_EXTERNAL_MESSAGE: buildExecutiveMessageRequest_,
    CREATE_DOCUMENT: buildExecutiveDocumentRequest_,
    AIRTABLE_RECORD_UPDATE: buildExecutiveAirtableRequest_
  };
  const builder = builders[intent];
  if (!builder) {
    throw new Error('Unsupported executive intent. No action was created.');
  }
  return builder(command);
}

function executiveBaseRequest_(command, actionType, target, payload) {
  const moduleName = String(command.module || 'Executive HQ').trim();
  const reason = String(command.reason || command.command || '').trim();
  if (!reason) throw new Error('Executive command requires a reason.');
  return {
    module: moduleName,
    lifecycleStage: String(command.lifecycleStage || 'OPERATIONS').trim(),
    actionType: actionType,
    target: target,
    payload: payload,
    reason: reason,
    requestedBy: 'Executive AI Interface',
    idempotencyKey: String(command.idempotencyKey || buildExecutiveIdempotencyKey_(actionType, target, payload)).trim()
  };
}

function buildExecutiveTaskRequest_(command) {
  const task = command.task || {};
  return executiveBaseRequest_(command, 'CREATE_TASK', String(task.title || '').trim(), task);
}

function buildExecutiveCalendarRequest_(command) {
  const event = command.event || {};
  return executiveBaseRequest_(command, 'CREATE_CALENDAR_EVENT', String(event.title || '').trim(), event);
}

function buildExecutiveMessageRequest_(command) {
  const message = command.message || {};
  return executiveBaseRequest_(command, 'SEND_EXTERNAL_MESSAGE', String(message.to || '').trim(), message);
}

function buildExecutiveDocumentRequest_(command) {
  const documentData = command.document || {};
  return executiveBaseRequest_(command, 'CREATE_DOCUMENT', String(documentData.title || '').trim(), documentData);
}

function buildExecutiveAirtableRequest_(command) {
  const update = command.airtable || {};
  const target = String(update.table || '').trim() + '/' + String(update.recordId || '').trim();
  return executiveBaseRequest_(command, 'AIRTABLE_RECORD_UPDATE', target, update);
}

function buildExecutiveIdempotencyKey_(actionType, target, payload) {
  const raw = JSON.stringify({ actionType: actionType, target: target, payload: payload });
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function(byte) {
    const value = (byte + 256) % 256;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}