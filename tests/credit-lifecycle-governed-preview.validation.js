'use strict';

const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('CreditLifecycleGovernedPreview.js', 'utf8');
[
  'PREVIEW_ONLY',
  'QUEUED_FOR_EXECUTIVE_APPROVAL',
  'approvalPerformed: false',
  'executionPerformed: false',
  'disputeSubmitted: false',
  'applicationSubmitted: false',
  'previewGovernedAction(request)',
  'queueGovernedAction(request)',
  "return 'CREATE_DOCUMENT'",
  "return 'CREATE_TASK'"
].forEach((expected) => {
  if (!source.includes(expected)) throw new Error(`Missing credit preview control: ${expected}`);
});
if (/approveGovernedAction\s*\(/.test(source) || /executeApprovedGovernedAction\s*\(/.test(source)) {
  throw new Error('Credit lifecycle bridge must not approve or execute actions.');
}

const calls = [];
const sandbox = {
  Utilities: {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    computeDigest: () => [1, 2, 3, 4]
  },
  normalizeCreditModule_: (value) => String(value).toUpperCase().replace(/\s+/g, '_'),
  previewGovernedAction: (request) => { calls.push({ type: 'preview', request }); return { status: 'PREVIEWED' }; },
  queueGovernedAction: (request) => { calls.push({ type: 'queue', request }); return { status: 'QUEUED' }; }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const dispute = sandbox.previewCreditLifecycleWork({
  module: 'Personal Credit',
  record: {
    recordId: 'pc-1',
    type: 'DISPUTE',
    title: 'Prepare bureau dispute draft',
    priority: 'HIGH',
    lifecycleStage: 'DAILY_OPERATIONS'
  }
});
if (dispute.mode !== 'PREVIEW_ONLY' || calls[0].type !== 'preview') throw new Error('Preview path failed.');
if (calls[0].request.actionType !== 'CREATE_DOCUMENT') throw new Error('Dispute should create a draft document only.');
if (dispute.disputeSubmitted || dispute.executionPerformed) throw new Error('Dispute was treated as executed.');

const application = sandbox.queueCreditLifecycleWorkForApproval({
  module: 'Business Credit',
  record: {
    recordId: 'bc-1',
    type: 'APPLICATION',
    title: 'Review funding application',
    priority: 'CRITICAL',
    lifecycleStage: 'APPROVAL_STARTUP'
  }
});
if (application.mode !== 'QUEUED_FOR_EXECUTIVE_APPROVAL' || calls[1].type !== 'queue') throw new Error('Queue path failed.');
if (calls[1].request.actionType !== 'CREATE_TASK') throw new Error('Applications must remain review tasks, not submissions.');
if (application.applicationSubmitted || application.approvalPerformed) throw new Error('Application safety boundary failed.');

console.log('Credit lifecycle governed preview validation passed.');
