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
  'ZZZZZZZZ_DashboardDailyBriefingPatch.js'
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
[
  'id="dailyBriefingButton"',
  'id="dailyExecutiveBriefing"',
  'id="dailyBriefingSummary"',
  'function buildDailyExecutiveBriefing()',
  'function refreshDailyExecutiveBriefing()',
  'function toggleDailyExecutiveBriefing()',
  "label:'Top Priority'",
  "label:'Approval Inbox'",
  "label:'Pending Work'",
  "label:'Module Completion'",
  "label:'System Health'",
  "label:'Recovery Status'"
].forEach((expected) => {
  if (!patched.includes(expected)) throw new Error(`Missing daily briefing control: ${expected}`);
});
console.log('Dashboard daily executive briefing validation passed.');
