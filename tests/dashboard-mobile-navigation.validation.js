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
  'ZZZZZZZ_DashboardMobileNavigationPatch.js'
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
[
  '@media (max-width: 760px)',
  'overflow-x: auto',
  '-webkit-overflow-scrolling: touch',
  'min-height: 44px',
  'function keepActiveModuleTabVisible()',
  "document.querySelector('.module-link.active')",
  "inline:'center'",
  "window.addEventListener('resize'"
].forEach((expected) => {
  if (!patched.includes(expected)) throw new Error(`Missing mobile navigation control: ${expected}`);
});
console.log('Dashboard mobile navigation validation passed.');
