'use strict';

const fs = require('fs');
const vm = require('vm');

const dashboard = fs.readFileSync('Phase9_ExecutiveDashboard.html', 'utf8');
const files = [
  'ZZ_DashboardRoutingPatch.js',
  'ZZZ_DashboardNotificationsPatch.js',
  'ZZZZ_DashboardHealthDrilldownPatch.js',
  'ZZZZZ_DashboardKpiNavigationPatch.js',
  'ZZZZZZ_DashboardHashRoutingPatch.js',
  'ZZZZZZZ_DashboardMobileNavigationPatch.js',
  'ZZZZZZZZ_DashboardDailyBriefingPatch.js',
  'ZZZZZZZZZ_DashboardActivityRecoveryPatch.js'
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
patched = sandbox.applyDashboardHashRoutingPatch_(patched);
patched = sandbox.applyDashboardMobileNavigationPatch_(patched);
patched = sandbox.applyDashboardDailyBriefingPatch_(patched);
patched = sandbox.applyDashboardActivityRecoveryPatch_(patched);
[
  'id="activityRecoveryButton"',
  'id="activityRecoveryCenter"',
  'id="activityRecoverySummary"',
  'id="activityRecoveryList"',
  'function collectGovernedActivitySnapshot()',
  'function refreshActivityRecoveryCenter()',
  'function toggleActivityRecoveryCenter()',
  "data-recovery-required",
  "'Verified'",
  "'Failed'",
  "'Expired'",
  "'Recovery Required'"
].forEach((expected) => {
  if (!patched.includes(expected)) throw new Error(`Missing activity recovery control: ${expected}`);
});
console.log('Dashboard activity and recovery validation passed.');
