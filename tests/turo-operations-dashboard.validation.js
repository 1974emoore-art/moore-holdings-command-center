const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('ZZZZZZZZZZZZZZZZZZZZ_TuroOperationsDashboardPatch.js', 'utf8');

[
  'Turo Operations',
  'Active Bookings',
  'Recognized Revenue',
  'Cleared Expenses',
  'Operating Cash Flow',
  'Open Incidents',
  'Missing Documents',
  'Overdue Tasks',
  'Pending Communications',
  'Operations Blockers',
  'Next Recommended Work',
  'executive review and governed execution'
].forEach((text) => assert(source.includes(text), `missing dashboard text: ${text}`));

[
  /sendEmail\s*\(/,
  /GmailApp\./,
  /UrlFetchApp\.fetch\s*\(/,
  /createBooking\s*\(/,
  /cancelBooking\s*\(/,
  /modifyBooking\s*\(/,
  /processPayment\s*\(/,
  /issueRefund\s*\(/
].forEach((pattern) => assert(!pattern.test(source), `external action detected: ${pattern}`));

const nodes = {};
const document = {
  getElementById(id) {
    if (!nodes[id]) nodes[id] = { id, textContent: '', appendChild(child) { nodes[child.id] = child; } };
    return nodes[id];
  },
  createElement() {
    return { id: '', className: '', style: {}, innerHTML: '', appendChild() {} };
  }
};

const context = {
  console,
  document,
  globalThis: null,
  buildTuroOperationsLifecycle() {
    return {
      summary: {
        activeBookings: 2,
        recognizedRevenue: 1450,
        clearedExpenses: 510,
        netOperatingCashFlow: 940,
        openIncidents: 1,
        missingRequiredDocuments: 2,
        overdueTasks: 3,
        pendingCommunications: 4
      },
      blockers: ['Resolve open incident'],
      nextRecommendedWork: 'Complete incident documentation.'
    };
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context);
const result = context.renderTuroOperationsLifecycle({});
assert.strictEqual(result.summary.activeBookings, 2);
assert.strictEqual(nodes.turoOpsActiveBookings.textContent, 2);
assert.strictEqual(nodes.turoOpsRevenue.textContent, '$1,450');
assert.strictEqual(nodes.turoOpsNet.textContent, '$940');
assert.strictEqual(nodes.turoOpsBlockers.textContent, 'Resolve open incident');
assert.strictEqual(nodes.turoOpsNextWork.textContent, 'Complete incident documentation.');
console.log('Turo operations dashboard validation passed.');
