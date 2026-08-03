'use strict';

const fs = require('fs');
const vm = require('vm');

const dashboard = fs.readFileSync('Phase9_ExecutiveDashboard.html', 'utf8');
const routing = fs.readFileSync('ZZ_DashboardRoutingPatch.js', 'utf8');
const notifications = fs.readFileSync('ZZZ_DashboardNotificationsPatch.js', 'utf8');
const health = fs.readFileSync('ZZZZ_DashboardHealthDrilldownPatch.js', 'utf8');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(routing.slice(routing.indexOf('function applyDashboardReviewRoutingPatch_')), sandbox);
vm.runInContext(notifications.slice(notifications.indexOf('function applyDashboardNotificationsPatch_')), sandbox);
vm.runInContext(health.slice(health.indexOf('function applyDashboardHealthDrilldownPatch_')), sandbox);

let patched = sandbox.applyDashboardReviewRoutingPatch_(dashboard);
patched = sandbox.applyDashboardNotificationsPatch_(patched);
patched = sandbox.applyDashboardHealthDrilldownPatch_(patched);

[
  'id="healthModuleDrilldown"',
  "activateCommandCenterModule('personalCreditModule', true)",
  "activateCommandCenterModule('businessCreditModule', true)",
  "activateCommandCenterModule('financeModule', true)",
  "activateCommandCenterModule('turoModule', true)",
  "activateCommandCenterModule('realEstateModule', true)",
  "activateCommandCenterModule('tradingModule', true)",
  "activateCommandCenterModule('growthModule', true)"
].forEach((expected) => {
  if (!patched.includes(expected)) {
    throw new Error(`Missing System Health drill-down control: ${expected}`);
  }
});

console.log('Dashboard System Health drill-down validation passed.');
