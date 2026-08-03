const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('ZZZZZZZZZZZZZZZZZZZZ_RealEstateLifecycleDashboard.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

if (typeof sandbox.getRealEstateLifecycleDashboardData !== 'function') {
  throw new Error('Real Estate lifecycle dashboard function is missing.');
}

const result = sandbox.getRealEstateLifecycleDashboardData([
  {
    propertyName: 'Hilton Head Target',
    market: 'Hilton Head Island',
    lifecycleStage: 'Underwriting',
    purchasePrice: 165000,
    monthlyNetCashFlow: 825.55,
    annualCashFlow: 9906.6,
    cashOnCashReturn: 12.4,
    underwritingComplete: true,
    financingReady: true,
    strCompliant: true,
    inspectionComplete: false,
    blockers: ['Inspection incomplete'],
    nextRecommendedWork: 'Complete inspection and due diligence.'
  }
]);

if (result.summary.trackedProperties !== 1) throw new Error('Tracked property count is incorrect.');
if (result.summary.underwritingComplete !== 1) throw new Error('Underwriting count is incorrect.');
if (result.summary.financingReady !== 1) throw new Error('Financing readiness count is incorrect.');
if (result.summary.strCompliant !== 1) throw new Error('STR compliance count is incorrect.');
if (result.summary.inspectionsComplete !== 0) throw new Error('Inspection count is incorrect.');
if (result.summary.monthlyNetCashFlow !== 825.55) throw new Error('Monthly cash flow is incorrect.');
if (result.properties[0].nextRecommendedWork !== 'Complete inspection and due diligence.') throw new Error('Next recommended work is missing.');

const governance = result.governance;
if (governance.offerSubmissionEnabled !== false) throw new Error('Offer submission must remain disabled.');
if (governance.purchaseExecutionEnabled !== false) throw new Error('Purchase execution must remain disabled.');
if (governance.contractExecutionEnabled !== false) throw new Error('Contract execution must remain disabled.');
if (governance.externalMessagingEnabled !== false) throw new Error('External messaging must remain disabled.');
if (!governance.executiveReviewRequired || !governance.governedExecutionRequired) {
  throw new Error('Executive governance requirements are missing.');
}

console.log('Real Estate lifecycle dashboard validation passed.');
