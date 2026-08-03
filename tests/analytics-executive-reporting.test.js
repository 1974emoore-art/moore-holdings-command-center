const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('apps-script/AnalyticsExecutiveReporting.gs', 'utf8');
const sandbox = { console, Date, Math, Number, String, Boolean, Array, Object, isFinite, isNaN };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const model = sandbox.buildAnalyticsExecutiveReportingModel({
  modules: [
    { moduleId: 'credit', moduleName: 'Credit', healthScore: 90, blockers: [], nextAction: 'Monitor' },
    { moduleId: 'turo', moduleName: 'Turo', healthScore: 70, blockers: ['Maintenance'], nextAction: 'Resolve maintenance' }
  ],
  kpis: [
    { name: 'Cash flow', actualValue: 1200, targetValue: 1000, direction: 'HIGHER_IS_BETTER', verified: true },
    { name: 'Overdue tasks', actualValue: 3, targetValue: 0, direction: 'LOWER_IS_BETTER', verified: true },
    { name: 'Unverified metric', actualValue: 2, targetValue: 1, verified: false }
  ],
  forecasts: [{ status: 'ACTIVE', verified: true }],
  reports: [
    { status: 'PENDING_APPROVAL', verified: true },
    { status: 'DRAFT', verified: false }
  ],
  reviews: [{ status: 'OPEN', dueDate: '2000-01-01' }],
  auditHistory: [{ action: 'REPORT_CREATED' }]
});

assert.strictEqual(model.kpiSummary.total, 3);
assert.strictEqual(model.kpiSummary.verified, 2);
assert.strictEqual(model.kpiSummary.onTarget, 1);
assert.strictEqual(model.kpiSummary.offTarget, 1);
assert.strictEqual(model.kpiSummary.unverified, 1);
assert.strictEqual(model.forecastSummary.currentVerified, 1);
assert.strictEqual(model.reportSummary.pendingReviewOrApproval, 2);
assert.strictEqual(model.reportSummary.unverified, 1);
assert.strictEqual(model.reviewSummary.overdue, 1);
assert.strictEqual(model.auditHistoryCount, 1);
assert.strictEqual(model.executionBoundary.canPublishExternally, false);
assert.strictEqual(model.executionBoundary.canDistributeAutomatically, false);
assert.strictEqual(model.executionBoundary.canExecuteFinancialDecisions, false);
assert.strictEqual(model.executionBoundary.requiresExecutiveApproval, true);
assert.strictEqual(model.governance.externalPublicationEnabled, false);
assert.ok(model.enterpriseHealthScore >= 0 && model.enterpriseHealthScore <= 100);
assert.ok(model.blockers.length >= 4);
assert.ok(model.nextRecommendedWork.includes('Verify KPI'));

const forbiddenPatterns = [
  /publish\s*externally\s*\(/i,
  /send\s*report\s*\(/i,
  /execute\s*financial\s*decision\s*\(/i,
  /delete\s*report\s*\(/i
];
forbiddenPatterns.forEach((pattern) => {
  assert.strictEqual(pattern.test(source), false, `Forbidden direct-action pattern found: ${pattern}`);
});

console.log('Analytics and Executive Reporting lifecycle validation passed.');
