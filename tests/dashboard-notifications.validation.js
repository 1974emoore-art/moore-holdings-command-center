'use strict';

const fs = require('fs');
const vm = require('vm');

const dashboard = fs.readFileSync('Phase9_ExecutiveDashboard.html', 'utf8');
const routing = fs.readFileSync('ZZ_DashboardRoutingPatch.js', 'utf8');
const notifications = fs.readFileSync('ZZZ_DashboardNotificationsPatch.js', 'utf8');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(routing.slice(routing.indexOf('function applyDashboardReviewRoutingPatch_')), sandbox);
vm.runInContext(notifications.slice(notifications.indexOf('function applyDashboardNotificationsPatch_')), sandbox);

const routed = sandbox.applyDashboardReviewRoutingPatch_(dashboard);
const patched = sandbox.applyDashboardNotificationsPatch_(routed);

[
  'id="notificationButton"',
  'id="notificationCount"',
  'id="notificationCenter"',
  'function toggleNotificationCenter()',
  'function refreshNotificationCenter()',
  "target: 'governedActionPanel'",
  "target: 'personalReviewQueue'",
  "target: 'phase10ReviewPanel'",
  "activateCommandCenterModule(item.module, false)"
].forEach((expected) => {
  if (!patched.includes(expected)) throw new Error(`Missing notification control: ${expected}`);
});

console.log('Dashboard notification validation passed.');
