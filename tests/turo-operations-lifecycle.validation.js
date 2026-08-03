'use strict';
const assert = require('assert');
const fs = require('fs');
const source = fs.readFileSync('TuroOperationsLifecycle.js', 'utf8');
const { buildTuroOperationsLifecycle } = require('../TuroOperationsLifecycle.js');

const result = buildTuroOperationsLifecycle({
  bookings: [
    { status: 'Confirmed', grossRevenue: 620 },
    { status: 'Completed', grossRevenue: 480 }
  ],
  customers: [{ customerId: 'C-1' }, { name: 'Missing ID' }],
  communications: [{ status: 'Pending Approval' }, { status: 'Completed' }],
  callLogs: [{ outcome: 'Pickup confirmed' }],
  revenue: [{ status: 'Cleared', amount: 480 }, { status: 'Pending', amount: 620 }],
  expenses: [{ status: 'Paid', amount: 140 }, { status: 'Pending', amount: 50 }],
  incidents: [{ status: 'Open' }],
  documents: [{ required: true, status: 'Missing' }, { required: true, status: 'Verified' }],
  tasks: [{ status: 'Open', overdue: true }, { status: 'Completed', overdue: false }]
});

assert.strictEqual(result.bookingCount, 2);
assert.strictEqual(result.activeBookingCount, 1);
assert.strictEqual(result.customerCount, 2);
assert.strictEqual(result.communicationCount, 2);
assert.strictEqual(result.callLogCount, 1);
assert.strictEqual(result.bookedRevenue, 1100);
assert.strictEqual(result.recognizedRevenue, 480);
assert.strictEqual(result.clearedExpenses, 140);
assert.strictEqual(result.netOperatingCashFlow, 340);
assert.strictEqual(result.openIncidentCount, 1);
assert.strictEqual(result.overdueTaskCount, 1);
assert.strictEqual(result.missingDocumentCount, 1);
assert.strictEqual(result.pendingCommunicationCount, 1);
assert(result.blockers.some(item => item.includes('open incident')));
assert(result.blockers.some(item => item.includes('overdue operational task')));
assert.strictEqual(result.governance.externalMessagingEnabled, false);
assert.strictEqual(result.governance.bookingMutationEnabled, false);
assert.strictEqual(result.governance.paymentExecutionEnabled, false);
assert.strictEqual(result.governance.refundExecutionEnabled, false);
assert.strictEqual(result.governance.requiresExecutiveReview, true);
assert.strictEqual(result.governance.requiresGovernedExecution, true);

if (/GmailApp\.|MailApp\.|UrlFetchApp\.|sendEmail\s*\(|createBooking\s*\(|cancelBooking\s*\(|issueRefund\s*\(|executePayment\s*\(/i.test(source)) {
  throw new Error('Turo operations lifecycle must remain read-only and governed.');
}

console.log('Turo operations lifecycle validation passed.');
