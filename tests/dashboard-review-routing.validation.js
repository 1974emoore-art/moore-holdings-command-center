'use strict';

const fs = require('fs');
const vm = require('vm');

const dashboard = fs.readFileSync('Phase9_ExecutiveDashboard.html', 'utf8');
const patchSource = fs.readFileSync('ZZ_DashboardRoutingPatch.js', 'utf8');

const start = patchSource.indexOf('function applyDashboardReviewRoutingPatch_(source)');
if (start < 0) {
  throw new Error('Dashboard routing patch helper is missing.');
}

const helper = patchSource.slice(start);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${helper}; this.applyPatch = applyDashboardReviewRoutingPatch_;`, sandbox);

const patched = sandbox.applyPatch(dashboard);

[
  "function showPendingOnly() {\n      activateCommandCenterModule('personalCreditModule', false);",
  "function showHighPriority() {\n      activateCommandCenterModule('personalCreditModule', false);",
  "function resetFilters() {\n      activateCommandCenterModule('personalCreditModule', false);"
].forEach((expected) => {
  if (!patched.includes(expected)) {
    throw new Error(`Missing review-filter module routing: ${expected}`);
  }
});

if (!patched.includes("window.history.replaceState(null, '', '#' + moduleId)")) {
  throw new Error('Active module URL hash synchronization is missing.');
}

if (!patched.includes("link.classList.toggle('active', isActive)")) {
  throw new Error('Active module tab synchronization is missing.');
}

console.log('Dashboard review routing validation passed.');
