'use strict';

function turoArray_(value) {
  return Array.isArray(value) ? value : [];
}

function turoNumber_(value) {
  var number = Number(value);
  return isFinite(number) ? number : 0;
}

function turoText_(value) {
  return value == null ? '' : String(value).trim();
}

function turoOpen_(status) {
  return !/^(complete|completed|closed|resolved|cancelled|canceled|paid|archived)$/i.test(turoText_(status));
}

function buildTuroOperationsLifecycle(input) {
  input = input || {};
  var bookings = turoArray_(input.bookings);
  var customers = turoArray_(input.customers);
  var communications = turoArray_(input.communications);
  var callLogs = turoArray_(input.callLogs);
  var revenue = turoArray_(input.revenue);
  var expenses = turoArray_(input.expenses);
  var incidents = turoArray_(input.incidents);
  var documents = turoArray_(input.documents);
  var tasks = turoArray_(input.tasks);

  var bookedRevenue = bookings.reduce(function (sum, booking) {
    return sum + turoNumber_(booking.grossRevenue || booking.amount);
  }, 0);
  var recognizedRevenue = revenue.reduce(function (sum, item) {
    return sum + (/^(received|paid|cleared|complete|completed)$/i.test(turoText_(item.status)) ? turoNumber_(item.amount) : 0);
  }, 0);
  var clearedExpenses = expenses.reduce(function (sum, item) {
    return sum + (/^(paid|cleared|complete|completed)$/i.test(turoText_(item.status)) ? turoNumber_(item.amount) : 0);
  }, 0);

  var activeBookings = bookings.filter(function (booking) {
    return /^(confirmed|active|in progress|upcoming)$/i.test(turoText_(booking.status));
  });
  var overdueTasks = tasks.filter(function (task) {
    return turoOpen_(task.status) && task.overdue === true;
  });
  var openIncidents = incidents.filter(function (incident) {
    return turoOpen_(incident.status);
  });
  var pendingCommunications = communications.filter(function (item) {
    return turoOpen_(item.status) || /^(draft|pending approval|queued)$/i.test(turoText_(item.status));
  });
  var missingDocuments = documents.filter(function (doc) {
    return doc.required === true && !/^(complete|received|verified|stored)$/i.test(turoText_(doc.status));
  });
  var unlinkedCustomers = customers.filter(function (customer) {
    return !turoText_(customer.customerId || customer.id);
  });

  var blockers = [];
  if (overdueTasks.length) blockers.push(overdueTasks.length + ' overdue operational task(s)');
  if (openIncidents.length) blockers.push(openIncidents.length + ' open incident(s)');
  if (missingDocuments.length) blockers.push(missingDocuments.length + ' required document(s) missing');
  if (unlinkedCustomers.length) blockers.push(unlinkedCustomers.length + ' customer record(s) missing an ID');
  if (pendingCommunications.length) blockers.push(pendingCommunications.length + ' communication(s) require review or follow-up');

  var nextRecommendedWork = 'Review active bookings and upcoming turnover tasks.';
  if (openIncidents.length) nextRecommendedWork = 'Resolve open incidents before expanding fleet operations.';
  else if (overdueTasks.length) nextRecommendedWork = 'Complete overdue operational tasks.';
  else if (missingDocuments.length) nextRecommendedWork = 'Collect and verify required trip and vehicle documents.';
  else if (pendingCommunications.length) nextRecommendedWork = 'Review pending customer communications through governed approval.';
  else if (!bookings.length) nextRecommendedWork = 'Create the first governed booking record and operating checklist.';

  return {
    bookingCount: bookings.length,
    activeBookingCount: activeBookings.length,
    customerCount: customers.length,
    communicationCount: communications.length,
    callLogCount: callLogs.length,
    bookedRevenue: bookedRevenue,
    recognizedRevenue: recognizedRevenue,
    clearedExpenses: clearedExpenses,
    netOperatingCashFlow: recognizedRevenue - clearedExpenses,
    openIncidentCount: openIncidents.length,
    overdueTaskCount: overdueTasks.length,
    missingDocumentCount: missingDocuments.length,
    pendingCommunicationCount: pendingCommunications.length,
    blockers: blockers,
    nextRecommendedWork: nextRecommendedWork,
    governance: {
      externalMessagingEnabled: false,
      bookingMutationEnabled: false,
      paymentExecutionEnabled: false,
      refundExecutionEnabled: false,
      requiresExecutiveReview: true,
      requiresGovernedExecution: true
    }
  };
}

if (typeof module !== 'undefined') {
  module.exports = { buildTuroOperationsLifecycle: buildTuroOperationsLifecycle };
}
