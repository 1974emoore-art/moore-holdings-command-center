'use strict';

const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('GovernedActionRecovery.js', 'utf8');

const required = [
  'statusesEligibleForRecovery',
  "Object.freeze(['FAILED'])",
  'recoveryRequired !== true',
  'requiresFreshApproval: true',
  'RECOVERY_REPLACEMENT_QUEUED',
  'externalActionPerformed: false',
  'Only one replacement action may be queued for this failure.',
  'The failed action remains immutable.'
];

for (const control of required) {
  if (!source.includes(control)) {
    throw new Error('Missing governed recovery control: ' + control);
  }
}

const store = {};
const failedAction = {
  actionId: 'failed-1',
  idempotencyKey: 'original-key',
  module: 'Personal Credit',
  lifecycleStage: 'Follow-up',
  actionType: 'AIRTABLE_RECORD_UPDATE',
  riskLevel: 'MEDIUM',
  target: 'record-1',
  payload: { fields: { Status: 'Approved' } },
  status: 'FAILED',
  failure: {
    failedAt: '2026-08-03T00:00:00.000Z',
    message: 'simulated failure',
    recoveryRequired: true
  }
};
let queueCalls = 0;
const actions = { 'failed-1': failedAction };
const audits = [];

const sandbox = {
  console,
  Date,
  JSON,
  Object,
  String,
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty(key) { return store[key] || null; },
        setProperty(key, value) { store[key] = value; }
      };
    }
  },
  Utilities: {
    getUuid() { return 'recovery-uuid'; }
  },
  requireGovernedAction_(id) {
    if (!actions[id]) throw new Error('missing action');
    return JSON.parse(JSON.stringify(actions[id]));
  },
  queueGovernedAction(request) {
    queueCalls += 1;
    const replacement = Object.assign({}, request, {
      actionId: 'replacement-1',
      status: 'QUEUED',
      approvalRequired: true
    });
    actions['replacement-1'] = replacement;
    return JSON.parse(JSON.stringify(replacement));
  },
  appendGovernedActionAudit_(eventType, action, details) {
    audits.push({ eventType, actionId: action.actionId, details });
  },
  sanitizeGovernedActionForDashboard_(action) {
    return JSON.parse(JSON.stringify(action));
  }
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const preview = sandbox.previewGovernedActionRecovery('failed-1', 'correct transient failure');
if (!preview.approvalRequired || preview.externalActionPerformed !== false) {
  throw new Error('Recovery preview safety contract failed.');
}

const replacement = sandbox.queueGovernedActionRecovery(
  'failed-1',
  'correct transient failure'
);
if (
  replacement.status !== 'QUEUED' ||
  replacement.approvalRequired !== true ||
  queueCalls !== 1 ||
  failedAction.status !== 'FAILED'
) {
  throw new Error('Recovery replacement contract failed.');
}

const duplicate = sandbox.queueGovernedActionRecovery(
  'failed-1',
  'correct transient failure'
);
if (duplicate.actionId !== 'replacement-1' || queueCalls !== 1) {
  throw new Error('Recovery duplicate protection failed.');
}

if (
  audits.length !== 1 ||
  audits[0].eventType !== 'RECOVERY_REPLACEMENT_QUEUED' ||
  audits[0].details.externalActionPerformed !== false
) {
  throw new Error('Recovery audit contract failed.');
}

console.log('Governed Action Recovery validation passed.');
