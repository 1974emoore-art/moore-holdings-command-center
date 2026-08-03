const assert = require('assert');
const { buildAutomationAndAiAgentsLifecycle } = require('../src/automation_ai_agents');

const result = buildAutomationAndAiAgentsLifecycle({
  agents: [
    { name: 'Credit Agent', status: 'ACTIVE', owner: 'CEO', highRisk: true, requiresExecutiveApproval: true },
    { name: 'Turo Intelligence Agent', status: 'ACTIVE', owner: 'CEO', highRisk: false, requiresExecutiveApproval: true }
  ],
  workflows: [
    { name: 'Weekly Turo Brief', enabled: true, scheduleEnabled: true, lastVerifiedAt: '2026-08-03' }
  ],
  integrations: [
    { name: 'Airtable', status: 'HEALTHY' },
    { name: 'Gmail', status: 'HEALTHY' },
    { name: 'Google Drive', status: 'HEALTHY' }
  ],
  incidents: [
    { status: 'RESOLVED', recoveryPlan: 'Retry with exponential backoff', recoveryVerified: true }
  ],
  auditHistory: [{ action: 'PREVIEWED' }, { action: 'APPROVED' }, { action: 'VERIFIED' }]
});

assert.strictEqual(result.activeAgents, 2);
assert.strictEqual(result.approvalAwareAgents, 2);
assert.strictEqual(result.scheduledWorkflows, 1);
assert.strictEqual(result.healthyIntegrations, 3);
assert.strictEqual(result.failedIntegrations, 0);
assert.strictEqual(result.openIncidents, 0);
assert.strictEqual(result.governance.directHighRiskExecutionEnabled, false);
assert.strictEqual(result.governance.directExternalMessagingEnabled, false);
assert.strictEqual(result.governance.directPaymentEnabled, false);
assert.strictEqual(result.governance.directDeletionEnabled, false);
assert.strictEqual(result.lifecycleCoverage.failureDetection, true);
assert.strictEqual(result.lifecycleCoverage.recoveryPlanning, true);
assert.deepStrictEqual(result.blockers, []);

const unsafe = buildAutomationAndAiAgentsLifecycle({
  agents: [{ name: 'Unsafe Agent', status: 'ACTIVE', highRisk: true, requiresExecutiveApproval: false }],
  workflows: [{ name: 'Unverified Workflow', enabled: true, scheduleEnabled: true }],
  integrations: [{ name: 'Gmail', status: 'FAILED' }],
  incidents: [{ status: 'OPEN' }]
});

assert(unsafe.blockers.some(b => b.includes('high-risk')));
assert(unsafe.blockers.some(b => b.includes('not been verified')));
assert(unsafe.blockers.some(b => b.includes('integrations are failed')));
assert(unsafe.blockers.some(b => b.includes('verified recovery plan')));

console.log('Automation and AI Agents lifecycle validation passed.');
