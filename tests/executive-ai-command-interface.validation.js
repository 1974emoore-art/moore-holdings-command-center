'use strict';

const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('ExecutiveAICommandInterface.js', 'utf8');
[
  'PREVIEW_ONLY',
  'QUEUED_FOR_APPROVAL',
  'approvalPerformed: false',
  'executionPerformed: false',
  'previewGovernedAction(request)',
  'queueGovernedAction(request)',
  'Unsupported executive intent. No action was created.'
].forEach((expected) => {
  if (!source.includes(expected)) throw new Error(`Missing AI interface control: ${expected}`);
});
if (/approveGovernedAction\s*\(/.test(source) || /executeApprovedGovernedAction\s*\(/.test(source)) {
  throw new Error('AI interface must not approve or execute governed actions.');
}

const calls = [];
const sandbox = {
  Utilities: {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    computeDigest: () => [1, 2, 3, 4]
  },
  previewGovernedAction: (request) => { calls.push({ type: 'preview', request }); return { status: 'PREVIEWED' }; },
  queueGovernedAction: (request) => { calls.push({ type: 'queue', request }); return { status: 'QUEUED' }; }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const preview = sandbox.runExecutiveAICommand({
  intent: 'CREATE_TASK',
  command: 'Create a follow-up task',
  task: { title: 'Review approvals', priority: 'HIGH' }
});
if (preview.mode !== 'PREVIEW_ONLY' || calls[0].type !== 'preview') throw new Error('Preview-only default failed.');
if (preview.approvalPerformed || preview.executionPerformed) throw new Error('Unsafe AI action state.');

const queued = sandbox.runExecutiveAICommand({
  intent: 'CREATE_DOCUMENT',
  command: 'Prepare the weekly briefing',
  queue: true,
  document: { title: 'Weekly briefing', body: 'Draft content' }
});
if (queued.mode !== 'QUEUED_FOR_APPROVAL' || calls[1].type !== 'queue') throw new Error('Queue path failed.');
if (calls[1].request.requestedBy !== 'Executive AI Interface') throw new Error('Request attribution missing.');

let rejected = false;
try { sandbox.runExecutiveAICommand({ intent: 'AUTHORIZE_PAYMENT', command: 'Pay invoice' }); }
catch (error) { rejected = /Unsupported executive intent/.test(error.message); }
if (!rejected) throw new Error('Unsupported high-risk intent was not denied.');

console.log('Executive AI command interface validation passed.');