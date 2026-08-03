'use strict';

const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('ZZZZZZZZZZZZZZZZZZZ_CreditLifecycleModel.js', 'utf8');

[
  'PERSONAL_CREDIT',
  'BUSINESS_CREDIT',
  'DUNS',
  'TRADELINE',
  'CERTIFIED_MAIL',
  'RETAINED_KNOWLEDGE',
  'governedExecutionRequired: true',
  'executionAllowed: false'
].forEach((expected) => {
  if (!source.includes(expected)) throw new Error(`Missing credit lifecycle control: ${expected}`);
});

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const business = sandbox.buildCreditLifecycleWorkspace('Business Credit', [
  {
    recordId: 'bc-1',
    type: 'DUNS',
    title: 'Confirm D-U-N-S profile',
    lifecycleStage: 'RESEARCH_VALIDATION',
    priority: 'HIGH',
    status: 'OPEN',
    dueAt: '2026-08-10T17:00:00-05:00'
  },
  {
    recordId: 'bc-2',
    type: 'VENDOR',
    title: 'Net-30 vendor review',
    lifecycleStage: 'DAILY_OPERATIONS',
    priority: 'NORMAL',
    status: 'COMPLETED'
  }
]);
if (business.module !== 'BUSINESS_CREDIT') throw new Error('Business module normalization failed.');
if (business.attentionCount !== 1) throw new Error('Business attention count incorrect.');
if (!business.nextRecommendedWork || business.nextRecommendedWork.recordId !== 'bc-1') {
  throw new Error('Business recommendation incorrect.');
}
if (business.nextRecommendedWork.executionAllowed !== false) throw new Error('Recommendation must remain non-executable.');

const personal = sandbox.buildCreditLifecycleWorkspace('Personal Credit', [
  {
    type: 'CERTIFIED_MAIL',
    title: 'Check certified-mail delivery',
    lifecycleStage: 'DAILY_OPERATIONS',
    priority: 'CRITICAL',
    status: 'OPEN'
  },
  {
    type: 'CREDIT_REPORT',
    title: 'Archive verified report',
    lifecycleStage: 'RETAINED_KNOWLEDGE',
    priority: 'LOW',
    status: 'CLOSED'
  }
]);
if (personal.module !== 'PERSONAL_CREDIT') throw new Error('Personal module normalization failed.');
if (personal.stageCounts.DAILY_OPERATIONS !== 1) throw new Error('Personal stage count incorrect.');
if (personal.nextRecommendedWork.priority !== 'CRITICAL') throw new Error('Priority ordering incorrect.');
if (!personal.readOnly || !personal.governedExecutionRequired) throw new Error('Safety boundary missing.');

console.log('Credit lifecycle model validation passed.');
