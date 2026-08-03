/**
 * Release 3 reusable lifecycle model for Personal and Business Credit.
 *
 * This layer is read-only. It normalizes existing records into the permanent
 * Command Center Lifecycle Law and recommends the next governed work item.
 */
const CREDIT_LIFECYCLE = Object.freeze({
  stages: Object.freeze([
    'INTAKE',
    'RESEARCH_VALIDATION',
    'PLANNING',
    'APPROVAL_STARTUP',
    'DAILY_OPERATIONS',
    'MONITORING_REPORTING',
    'GROWTH_OPTIMIZATION',
    'RENEWAL_EXIT',
    'RETAINED_KNOWLEDGE'
  ]),
  personalTypes: Object.freeze([
    'CREDIT_REPORT', 'SCORE', 'ACCOUNT', 'BUREAU', 'DISPUTE',
    'VALIDATION', 'LETTER', 'EVIDENCE', 'CERTIFIED_MAIL', 'RESPONSE',
    'ATTACHMENT', 'FOLLOW_UP'
  ]),
  businessTypes: Object.freeze([
    'FOUNDATION', 'DUNS', 'VENDOR', 'TRADELINE', 'BUREAU_REPORTING',
    'CARD', 'FUNDING_READINESS', 'APPLICATION', 'DOCUMENT', 'APPROVAL',
    'GROWTH', 'EXIT'
  ])
});

function buildCreditLifecycleWorkspace(moduleName, records) {
  const module = normalizeCreditModule_(moduleName);
  const allowedTypes = module === 'PERSONAL_CREDIT'
    ? CREDIT_LIFECYCLE.personalTypes
    : CREDIT_LIFECYCLE.businessTypes;
  const normalizedRecords = (Array.isArray(records) ? records : []).map(function(record, index) {
    return normalizeCreditLifecycleRecord_(module, record, index, allowedTypes);
  });

  const stageCounts = CREDIT_LIFECYCLE.stages.reduce(function(result, stage) {
    result[stage] = normalizedRecords.filter(function(record) {
      return record.lifecycleStage === stage;
    }).length;
    return result;
  }, {});

  const attention = normalizedRecords
    .filter(function(record) { return record.requiresAttention; })
    .sort(compareCreditLifecyclePriority_);

  return {
    module: module,
    lifecycleLawVersion: 1,
    stages: CREDIT_LIFECYCLE.stages.slice(),
    records: normalizedRecords,
    stageCounts: stageCounts,
    attentionCount: attention.length,
    nextRecommendedWork: attention.length ? buildCreditLifecycleRecommendation_(attention[0]) : null,
    readOnly: true,
    governedExecutionRequired: true
  };
}

function normalizeCreditModule_(value) {
  const module = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (module !== 'PERSONAL_CREDIT' && module !== 'BUSINESS_CREDIT') {
    throw new Error('Credit lifecycle module must be PERSONAL_CREDIT or BUSINESS_CREDIT.');
  }
  return module;
}

function normalizeCreditLifecycleRecord_(module, record, index, allowedTypes) {
  const source = record && typeof record === 'object' ? record : {};
  const type = String(source.type || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const stage = String(source.lifecycleStage || 'INTAKE').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const priority = String(source.priority || 'NORMAL').trim().toUpperCase();
  const status = String(source.status || 'OPEN').trim().toUpperCase();

  if (allowedTypes.indexOf(type) === -1) throw new Error('Unsupported ' + module + ' record type: ' + type);
  if (CREDIT_LIFECYCLE.stages.indexOf(stage) === -1) throw new Error('Unsupported credit lifecycle stage: ' + stage);
  if (['CRITICAL', 'HIGH', 'NORMAL', 'LOW'].indexOf(priority) === -1) throw new Error('Unsupported credit priority: ' + priority);

  return {
    recordId: String(source.recordId || module + '-' + (index + 1)),
    module: module,
    type: type,
    title: String(source.title || type).trim(),
    lifecycleStage: stage,
    status: status,
    priority: priority,
    dueAt: normalizeOptionalCreditDate_(source.dueAt),
    evidenceCount: Math.max(0, Number(source.evidenceCount || 0)),
    documentCount: Math.max(0, Number(source.documentCount || 0)),
    communicationCount: Math.max(0, Number(source.communicationCount || 0)),
    approvalStatus: String(source.approvalStatus || 'NOT_REQUIRED').trim().toUpperCase(),
    requiresAttention: status !== 'COMPLETED' && status !== 'CLOSED',
    sourceRecordId: String(source.sourceRecordId || '').trim()
  };
}

function normalizeOptionalCreditDate_(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new Error('Credit lifecycle dueAt must be a valid date.');
  return date.toISOString();
}

function compareCreditLifecyclePriority_(a, b) {
  const rank = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  const priorityDifference = rank[a.priority] - rank[b.priority];
  if (priorityDifference) return priorityDifference;
  if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
  if (a.dueAt) return -1;
  if (b.dueAt) return 1;
  return a.title.localeCompare(b.title);
}

function buildCreditLifecycleRecommendation_(record) {
  return {
    recordId: record.recordId,
    module: record.module,
    lifecycleStage: record.lifecycleStage,
    priority: record.priority,
    title: record.title,
    recommendedAction: 'REVIEW_AND_PREVIEW_GOVERNED_WORK',
    executionAllowed: false,
    approvalRequired: true
  };
}
