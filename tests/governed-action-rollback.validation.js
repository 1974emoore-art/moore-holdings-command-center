'use strict';

const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('GovernedActionRollback.js', 'utf8');

[
  'previewGovernedActionRollback',
  'queueGovernedActionRollback',
  "status !== GOVERNED_ACTION_ENGINE.statuses.VERIFIED",
  "actionType !== 'AIRTABLE_RECORD_UPDATE'",
  'Verified before-and-after evidence is required for rollback.',
  "idempotencyKey: 'ROLLBACK|' + source.actionId",
  "appendGovernedActionAudit_('ROLLBACK_QUEUED'",
  'approvalRequired: true',
  'externalActionPerformed: false'
].forEach(function(control) {
  if (!source.includes(control)) {
    throw new Error('Missing governed rollback control: ' + control);
  }
});

const sandbox = {
  GOVERNED_ACTION_ENGINE: {
    statuses: { VERIFIED: 'VERIFIED' },
    riskByType: { AIRTABLE_RECORD_UPDATE: 'MEDIUM' }
  },
  maskGovernedActionPayload_: function(value) { return value; },
  appendGovernedActionAudit_: function() {},
  sanitizeGovernedActionForDashboard_: function(value) { return value; },
  getGovernedActionQueue: function() { return { actions: [] }; },
  requireGovernedAction_: function() { return sandbox.sourceAction; },
  queueGovernedAction: function(request) {
    sandbox.queuedRequest = request;
    return {
      actionId: 'rollback-action',
      status: 'QUEUED',
      approvalRequired: true,
      idempotencyKey: request.idempotencyKey
    };
  }
};

sandbox.sourceAction = {
  actionId: 'source-action',
  module: 'Personal Credit',
  target: 'rec123',
  actionType: 'AIRTABLE_RECORD_UPDATE',
  status: 'VERIFIED',
  execution: {
    result: { tableId: 'tbl123', recordId: 'rec123' }
  },
  verification: {
    evidence: {
      before: { Status: 'Pending' },
      after: { Status: 'Approved' }
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const preview = sandbox.previewGovernedActionRollback(
  'source-action',
  'Restore prior status'
);
if (
  preview.rollbackSupported !== true ||
  preview.approvalRequired !== true ||
  preview.externalActionPerformed !== false
) {
  throw new Error('Rollback preview safety contract failed.');
}

const queued = sandbox.queueGovernedActionRollback(
  'source-action',
  'Restore prior status'
);
if (
  queued.status !== 'QUEUED' ||
  sandbox.queuedRequest.payload.fields.Status !== 'Pending' ||
  sandbox.queuedRequest.payload.expectedFields.Status !== 'Approved' ||
  sandbox.queuedRequest.idempotencyKey !== 'ROLLBACK|source-action'
) {
  throw new Error('Rollback queue contract failed.');
}

sandbox.sourceAction.status = 'FAILED';
let rejected = false;
try {
  sandbox.previewGovernedActionRollback('source-action', 'invalid');
} catch (error) {
  rejected = /Only verified/.test(error.message);
}
if (!rejected) {
  throw new Error('Non-verified rollback source was not rejected.');
}

console.log('Governed action rollback validation passed.');
