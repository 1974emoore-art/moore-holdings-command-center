/** Release 3 mailbox-only physical mail lifecycle for Personal Credit. */
const PHYSICAL_MAIL_STAGES = Object.freeze([
  'DRAFT_PREPARED','PRINT_READY','HANDED_TO_MAILER','ACCEPTED_BY_USPS',
  'IN_TRANSIT','DELIVERED','RESPONSE_WINDOW_OPEN','RESPONSE_RECEIVED',
  'FOLLOW_UP_DUE','CLOSED'
]);

function buildPersonalCreditPhysicalMailLifecycle(input) {
  const source = input && typeof input === 'object' ? input : {};
  const stage = String(source.stage || 'DRAFT_PREPARED').trim().toUpperCase();
  if (PHYSICAL_MAIL_STAGES.indexOf(stage) === -1) throw new Error('Unsupported physical mail stage.');
  const trackingNumber = String(source.trackingNumber || '').replace(/\s+/g, '');
  if (['ACCEPTED_BY_USPS','IN_TRANSIT','DELIVERED','RESPONSE_WINDOW_OPEN','RESPONSE_RECEIVED','FOLLOW_UP_DUE','CLOSED'].indexOf(stage) !== -1 && !trackingNumber) {
    throw new Error('USPS tracking number is required after physical handoff.');
  }
  const mailedAt = normalizePhysicalMailDate_(source.mailedAt);
  const deliveredAt = normalizePhysicalMailDate_(source.deliveredAt);
  const responseReceivedAt = normalizePhysicalMailDate_(source.responseReceivedAt);
  const responseDays = Math.max(1, Number(source.responseDays || 30));
  const responseDueAt = deliveredAt ? new Date(new Date(deliveredAt).getTime() + responseDays * 86400000).toISOString() : null;
  return {
    mailItemId: String(source.mailItemId || '').trim(),
    creditRecordId: String(source.creditRecordId || '').trim(),
    recipient: String(source.recipient || '').trim(),
    documentTitle: String(source.documentTitle || '').trim(),
    stage: stage,
    trackingNumber: trackingNumber,
    mailedAt: mailedAt,
    deliveredAt: deliveredAt,
    responseDueAt: responseDueAt,
    responseReceivedAt: responseReceivedAt,
    responseDocumentId: String(source.responseDocumentId || '').trim(),
    followUpRequired: Boolean(deliveredAt && !responseReceivedAt && responseDueAt && Date.now() >= new Date(responseDueAt).getTime()),
    physicalMailPerformedBySystem: false,
    physicalReceiptPerformedBySystem: false,
    mailboxOnlyWorkflow: true,
    nextAction: nextPhysicalMailAction_(stage, Boolean(responseReceivedAt), deliveredAt, responseDueAt)
  };
}

function nextPhysicalMailAction_(stage, responseReceived, deliveredAt, responseDueAt) {
  if (stage === 'DRAFT_PREPARED') return 'PRINT_AND_VERIFY_PACKET';
  if (stage === 'PRINT_READY') return 'HUMAN_HANDOFF_TO_USPS';
  if (stage === 'HANDED_TO_MAILER') return 'RECORD_USPS_ACCEPTANCE_AND_TRACKING';
  if (stage === 'ACCEPTED_BY_USPS' || stage === 'IN_TRANSIT') return 'MONITOR_USPS_TRACKING';
  if (stage === 'DELIVERED' || stage === 'RESPONSE_WINDOW_OPEN') return responseReceived ? 'ATTACH_AND_REVIEW_RESPONSE' : (responseDueAt ? 'MONITOR_RESPONSE_DEADLINE' : 'SET_RESPONSE_WINDOW');
  if (stage === 'RESPONSE_RECEIVED') return 'ATTACH_AND_REVIEW_RESPONSE';
  if (stage === 'FOLLOW_UP_DUE') return 'PREVIEW_GOVERNED_FOLLOW_UP';
  return 'NO_ACTION_REQUIRED';
}

function normalizePhysicalMailDate_(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new Error('Physical mail date must be valid.');
  return date.toISOString();
}
