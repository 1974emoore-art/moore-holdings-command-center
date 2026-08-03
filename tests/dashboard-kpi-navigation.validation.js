'use strict';

const fs = require('fs');
const vm = require('vm');

const dashboard = fs.readFileSync('Phase9_ExecutiveDashboard.html', 'utf8');
const files = [
  'ZZ_DashboardRoutingPatch.js',
  'ZZZ_DashboardNotificationsPatch.js',
  'ZZZZ_DashboardHealthDrilldownPatch.js',
  'ZZZZZ_DashboardKpiNavigationPatch.js'
];
const sandbox = {};
vm.createContext(sandbox);
files.forEach((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const marker = source.indexOf('function applyDashboard');
  vm.runInContext(source.slice(marker), sandbox);
});
let patched = sandbox.applyDashboardReviewRoutingPatch_(dashboard);
patched = sandbox.applyDashboardNotificationsPatch_(patched);
patched = sandbox.applyDashboardHealthDrilldownPatch_(patched);
patched = sandbox.applyDashboardKpiNavigationPatch_(patched);
[
  'function initializeActionableKpiCards()',
  'totalReviews:', 'highPriority: showHighPriority',
  'pendingReviews: showPendingOnly', 'businessCreditRecords:',
  'financeTracked:', 'turoTracked:', 'realEstateTracked:',
  'tradingTracked:', 'growthTracked:', 'healthOverall:',
  "card.setAttribute('role', 'button')",
  "card.setAttribute('tabindex', '0')",
  "event.key === 'Enter' || event.key === ' '"
].forEach((expected) => {
  if (!patched.includes(expected)) throw new Error(`Missing KPI navigation control: ${expected}`);
});
console.log('Dashboard KPI navigation validation passed.');
