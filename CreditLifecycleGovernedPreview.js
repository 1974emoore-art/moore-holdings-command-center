/**
 * Release 3 bridge from credit lifecycle recommendations to governed previews.
 *
 * This layer may preview or queue an action for approval. It cannot approve,
 * execute, submit disputes or applications, or perform any external action.
 */
function previewCreditLifecycleWork(input) {
  return processCreditLifecycleWork_(input, false);
}

function queueCreditLifecycleWorkForApproval(input) {
  return processCreditLifecycleWork_(input, true);
}

function processCreditLifecycleWork_(input, queueRequested) {
  const source = input && typeof input === 'object' ? input : {};
  const module = normalizeCreditModule_(source.module);
  const record = source.record && typeof source.record === 'object' ? source.record : {};
  const type = String(record.type || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const request = buildCreditLifecycleGovernedRequest_(module, type, record, source);
  const result = queueRequested === true ? queueGovernedAction(request) : previewGovernedAction(request);

  return {
    mode: queueRequested === true ? 'QUEUED_FOR_EXECUTIVE_APPROVAL' : 'PREVIEW_ONLY',
    governedAction: result,
    approvalPerformed: false,
    executionPerformed: false,
    disputeSubmitted: false,
    applicationSubmitted: false,
    externalActionPerformed: false
  };
}

function buildCreditLifecycleGovernedRequest_(module, type, record, source) {
  const actionType = selectCreditLifecycleActionType_(module, type);
  const title = String(record.title || type || 'Credit lifecycle work').trim();
  const recordId = String(record.recordId || record.sourceRecordId || '').trim();
  if (!recordId) throw new Error('Credit lifecycle work requires a record identifier.');

  const payload = actionType === 'CREATE_TASK'
    ? {
        title: title,
        description: String(source.recommendedWork || 'Review evidence and determine the next governed credit action.').trim(),
        module: module === 'PERSONAL_CREDIT' ? 'Personal Credit' : 'Business Credit',
        priority: String(record.priority || 'NORMAL').trim().toUpperCase(),
        dueAt: record.dueAt || null,
        owner: 'Ernest Moore Jr.',
        sourceRecordId: recordId,
        creditRecordType: type
      }
    : {
        title: title,
        body: String(source.documentBody || buildCreditLifecycleDocumentBody_(module, type, record)).trim(),
        createPdf: source.createPdf === true,
        folderId: String(source.folderId || '').trim(),
        sourceRecordId: recordId,
        creditRecordType: type
      };

  return {
    module: module === 'PERSONAL_CREDIT' ? 'Personal Credit' : 'Business Credit',
    lifecycleStage: String(record.lifecycleStage || 'DAILY_OPERATIONS').trim(),
    actionType: actionType,
    target: recordId,
    payload: payload,
    reason: String(source.reason || ('Prepare governed work for ' + title)).trim(),
    requestedBy: 'Credit Lifecycle Workspace',
    idempotencyKey: buildCreditLifecycleIdempotencyKey_(module, type, recordId, actionType, payload)
  };
}

function selectCreditLifecycleActionType_(module, type) {
  const documentTypes = ['LETTER', 'DISPUTE', 'VALIDATION', 'EVIDENCE', 'RESPONSE', 'DOCUMENT'];
  const prohibitedDirectTypes = ['APPLICATION'];
  if (prohibitedDirectTypes.indexOf(type) !== -1) return 'CREATE_TASK';
  if (documentTypes.indexOf(type) !== -1) return 'CREATE_DOCUMENT';
  return 'CREATE_TASK';
}

function buildCreditLifecycleDocumentBody_(module, type, record) {
  return [
    'Moore Holdings Credit Lifecycle Work Draft',
    'Module: ' + module,
    'Record Type: ' + type,
    'Record ID: ' + String(record.recordId || record.sourceRecordId || ''),
    'Title: ' + String(record.title || type),
    'Status: ' + String(record.status || 'OPEN'),
    'Priority: ' + String(record.priority || 'NORMAL'),
    '',
    'Draft only. Review all supporting evidence before executive approval.'
  ].join('\n');
}

function buildCreditLifecycleIdempotencyKey_(module, type, recordId, actionType, payload) {
  const raw = JSON.stringify({ module: module, type: type, recordId: recordId, actionType: actionType, payload: payload });
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(function(byte) {
    const value = (byte + 256) % 256;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}
