'use strict';

const fs = require('fs');
const vm = require('vm');

const dashboard = fs.readFileSync('Phase9_ExecutiveDashboard.html', 'utf8');
const files = [
  'ZZ_DashboardRoutingPatch.js',
  'ZZZ_DashboardNotificationsPatch.js',
  'ZZZZ_DashboardHealthDrilldownPatch.js',
  'ZZZZZ_DashboardKpiNavigationPatch.js',
  'ZZZZZZ_DashboardHashRoutingPatch.js'
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
[
  'function restoreCommandCenterModuleFromHash()',
  "String(window.location.hash || '').replace(/^#/, '')",
  'Object.prototype.hasOwnProperty.call(COMMAND_CENTER_MODULES, moduleId)',
  'activateCommandCenterModule(moduleId, false)',
  "window.addEventListener('hashchange'",
  "window.addEventListener('load'"
].forEach((expected) => {
  if (!patched.includes(expected)) throw new Error(`Missing hash routing control: ${expected}`);
});
console.log('Dashboard hash routing validation passed.');
