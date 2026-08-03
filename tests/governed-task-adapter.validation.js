'use strict';

const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('ZZZZZZZZZZZZZZZZZ_GovernedTaskAdapter.js', 'utf8');
[
  'CREATE_TASK: executeGovernedInternalTask_',
  'PropertiesService.getScriptProperties',
  'internalTasksCreated: 1',
  'readBackVerified: true',
  "status: 'OPEN'",
  'normalizeGovernedTaskPriority_',
  'normalizeGovernedTaskDueAt_'
].forEach((expected) => {
  if (!source.includes(expected)) throw new Error(`Missing governed task control: ${expected}`);
});

const store = {};
const properties = {
  setProperty: (key, value) => { store[key] = value; },
  getProperty: (key) => store[key] || null
};
const sandbox = {
  Utilities: { getUuid: () => 'uuid-123' },
  PropertiesService: { getScriptProperties: () => properties },
  executeGovernedAirtableRecordUpdate_: function () {},
  executeGovernedCalendarEvent_: function () {},
  executeGovernedGmailMessage_: function () {},
  executeGovernedDriveDocument_: function () {}
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const result = sandbox.executeGovernedInternalTask_({
  actionId: 'action-123',
  module: 'Executive HQ',
  payload: {
    title: 'Review approval queue',
    description: 'Review pending governed actions.',
    priority: 'HIGH',
    dueAt: '2026-08-04T17:00:00.000Z'
  }
});
if (!result.completed || !result.verified) throw new Error('Task adapter did not verify completion.');
if (result.sideEffects.internalTasksCreated !== 1) throw new Error('Task side-effect count incorrect.');
if (!result.evidence.readBackVerified) throw new Error('Task read-back evidence missing.');
if (sandbox.getGovernedActionExecutorRegistry_().CREATE_TASK !== sandbox.executeGovernedInternalTask_) {
  throw new Error('Task adapter not registered.');
}
console.log('Governed task adapter validation passed.');
