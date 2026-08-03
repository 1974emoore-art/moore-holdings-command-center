'use strict';

const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('GovernedActionEngine.js', 'utf8');

function requireText(text, description) {
  if (!source.includes(text)) {
    throw new Error(`Missing governed-action control: ${description} (${text})`);
  }
}

function requirePattern(pattern, description) {
  if (!pattern.test(source)) {
    throw new Error(`Missing governed-action behavior: ${description}`);
  }
}

[
  ['approvalRequired: true', 'all previews require approval'],
  ["approvalCode: 'ERNEST_APPROVES_GOVERNED_ACTION'", 'exact executive confirmation'],
  ['approvalTtlByRiskMs', 'risk-based approval expiration'],
  ["CRITICAL: 15 * 60 * 1000", 'critical approval fifteen-minute TTL'],
  ['requireUnexpiredGovernedActionApproval_(action)', 'expiration enforcement before execution'],
  ['requireNoVerifiedIdempotencyDuplicate_(action)', 'idempotency enforcement before execution'],
  ["status === GOVERNED_ACTION_ENGINE.statuses.VERIFIED", 'verified action replay safety'],
  ['Execution adapter is not registered for ', 'deny-by-default adapters'],
  ['executionResult.completed !== true', 'completed evidence requirement'],
  ['executionResult.verified !== true', 'verified evidence requirement'],
  ['expectedFields', 'optimistic concurrency input'],
  ['Airtable record changed after preview', 'optimistic concurrency rejection'],
  ['Airtable read-back verification failed', 'read-back verification rejection'],
  ['recoveryRequired: true', 'failure recovery marker'],
  ["appendGovernedActionAudit_('ACTION_FAILED'", 'failure audit entry'],
  ["appendGovernedActionAudit_('ACTION_VERIFIED'", 'verification audit entry'],
  ["masked[key] = '[REDACTED]'", 'sensitive-data redaction'],
  ['executionAdaptersLockedByDefault: true', 'dashboard safety disclosure']
].forEach(([text, description]) => requireText(text, description));

requirePattern(
  /function approveGovernedAction\([\s\S]*?confirmationCode !== GOVERNED_ACTION_ENGINE\.approvalCode/,
  'approval cannot proceed without exact executive confirmation'
);
requirePattern(
  /function executeApprovedGovernedAction\([\s\S]*?confirmationCode !== GOVERNED_ACTION_ENGINE\.approvalCode/,
  'execution cannot proceed without exact executive confirmation'
);
requirePattern(
  /function executeApprovedGovernedAction\([\s\S]*?LockService\.getScriptLock\(\)[\s\S]*?waitLock\(30000\)/,
  'concurrent execution is serialized'
);
requirePattern(
  /function executeGovernedAirtableRecordUpdate_\([\s\S]*?method:\s*'patch'[\s\S]*?fetchGovernedAirtableRecord_\(/,
  'Airtable write is followed by read-back verification'
);
requirePattern(
  /function getGovernedActionExecutorRegistry_\(\)\s*\{[\s\S]*?AIRTABLE_RECORD_UPDATE:[\s\S]*?\}/,
  'only explicitly registered adapters can execute'
);

// Execute the pure redaction helper in isolation. No Apps Script service is exposed.
const redactionStart = source.indexOf('function maskGovernedActionPayload_(value)');
const redactionEnd = source.indexOf('\n\n\nfunction sanitizeGovernedActionForDashboard_', redactionStart);
if (redactionStart < 0 || redactionEnd < 0) {
  throw new Error('Unable to isolate payload redaction helper.');
}

const redactionFunction = source.slice(redactionStart, redactionEnd);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${redactionFunction}; this.mask = maskGovernedActionPayload_;`, sandbox);
const masked = sandbox.mask({
  token: 'secret-token',
  nested: {
    accountNumber: '123456789',
    safeField: 'visible'
  },
  password: 'secret-password'
});

if (
  masked.token !== '[REDACTED]' ||
  masked.password !== '[REDACTED]' ||
  masked.nested.accountNumber !== '[REDACTED]' ||
  masked.nested.safeField !== 'visible'
) {
  throw new Error('Sensitive payload redaction regression detected.');
}

console.log('Governed Action Engine regression validation passed.');
