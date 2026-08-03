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
  'ZZZZZZZZZ_DashboardActivityRecoveryPatch.js',
  'ZZZZZZZZZZ_DashboardOperationsTimelinePatch.js'
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
patched = sandbox.applyDashboardOperationsTimelinePatch_(patched);
[
  'id="operationsTimelineButton"',
  'id="operationsTimeline"',
  'id="timelineModuleFilter"',
  'id="timelineStatusFilter"',
  'id="timelineTypeFilter"',
  'id="operationsTimelineList"',
  'function collectOperationsTimelineEvents()',
  'return events.sort(function(a,b){ return b.timestamp-a.timestamp; })',
  'function saveOperationsTimelineFilters()',
  'function restoreOperationsTimelineFilters()',
  'function openOperationsTimelineEvent(event)',
  'function refreshOperationsTimeline()',
  'function toggleOperationsTimeline()',
  "localStorage.setItem(OPERATIONS_TIMELINE_FILTER_KEY",
  "activateCommandCenterModule(event.target,false)",
  "card.querySelector('button').onclick"
].forEach((expected) => {
  if (!patched.includes(expected)) throw new Error(`Missing operations timeline control: ${expected}`);
});
console.log('Dashboard operations timeline validation passed.');
