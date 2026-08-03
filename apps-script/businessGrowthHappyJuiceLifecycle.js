function buildBusinessGrowthHappyJuiceLifecycle(input) {
  input = input || {};
  var ideas = input.ideas || [];
  var products = input.products || [];
  var customers = input.customers || [];
  var orders = input.orders || [];
  var tasks = input.tasks || [];
  var documents = input.documents || [];
  var expenses = input.expenses || [];
  var revenue = input.revenue || [];

  var activeIdeas = ideas.filter(function (x) { return !['REJECTED', 'CLOSED', 'ARCHIVED'].includes(String(x.status || '').toUpperCase()); });
  var approvedIdeas = ideas.filter(function (x) { return String(x.approvalStatus || '').toUpperCase() === 'APPROVED'; });
  var launchReadyProducts = products.filter(function (x) {
    return !!x.name && !!x.formulaStatus && !!x.labelStatus && !!x.packagingStatus && !!x.complianceStatus && Number(x.unitCost || 0) > 0 && Number(x.targetPrice || 0) > 0;
  });
  var activeProducts = products.filter(function (x) { return ['ACTIVE', 'LAUNCHED', 'SELLING'].includes(String(x.status || '').toUpperCase()); });
  var openOrders = orders.filter(function (x) { return !['FULFILLED', 'CANCELLED', 'REFUNDED', 'CLOSED'].includes(String(x.status || '').toUpperCase()); });
  var overdueTasks = tasks.filter(function (x) {
    return x.dueDate && new Date(x.dueDate).getTime() < Date.now() && !['DONE', 'COMPLETE', 'CLOSED'].includes(String(x.status || '').toUpperCase());
  });
  var missingDocuments = documents.filter(function (x) { return x.required && !x.fileId && !x.url; });
  var recognizedRevenue = revenue.filter(function (x) { return ['RECEIVED', 'CLEARED', 'RECOGNIZED'].includes(String(x.status || '').toUpperCase()); })
    .reduce(function (sum, x) { return sum + Number(x.amount || 0); }, 0);
  var clearedExpenses = expenses.filter(function (x) { return ['PAID', 'CLEARED', 'POSTED'].includes(String(x.status || '').toUpperCase()); })
    .reduce(function (sum, x) { return sum + Number(x.amount || 0); }, 0);
  var netCashFlow = recognizedRevenue - clearedExpenses;

  var blockers = [];
  if (!ideas.length) blockers.push('No business idea or opportunity has been entered.');
  if (ideas.length && !approvedIdeas.length) blockers.push('No business case has executive approval.');
  products.forEach(function (p) {
    var name = p.name || 'Unnamed product';
    if (!p.formulaStatus) blockers.push(name + ': formula or product specification is incomplete.');
    if (!p.labelStatus) blockers.push(name + ': label development is incomplete.');
    if (!p.packagingStatus) blockers.push(name + ': packaging development is incomplete.');
    if (!p.complianceStatus) blockers.push(name + ': compliance review is incomplete.');
    if (Number(p.targetPrice || 0) <= Number(p.unitCost || 0)) blockers.push(name + ': target price does not exceed unit cost.');
  });
  if (missingDocuments.length) blockers.push(missingDocuments.length + ' required document(s) are missing.');
  if (overdueTasks.length) blockers.push(overdueTasks.length + ' operational task(s) are overdue.');
  if (openOrders.length && !customers.length) blockers.push('Open orders exist without customer records.');

  var nextRecommendedWork = blockers.length ? blockers[0] :
    (!launchReadyProducts.length ? 'Complete the first product launch package.' :
      (!activeProducts.length ? 'Queue the approved launch plan for executive review.' :
        'Review performance, customer demand, margins, scaling, renewal, and exit options.'));

  return {
    lifecycleVersion: '1.0',
    ideaCount: ideas.length,
    activeIdeaCount: activeIdeas.length,
    approvedIdeaCount: approvedIdeas.length,
    productCount: products.length,
    launchReadyProductCount: launchReadyProducts.length,
    activeProductCount: activeProducts.length,
    customerCount: customers.length,
    openOrderCount: openOrders.length,
    recognizedRevenue: recognizedRevenue,
    clearedExpenses: clearedExpenses,
    netCashFlow: netCashFlow,
    overdueTaskCount: overdueTasks.length,
    missingDocumentCount: missingDocuments.length,
    blockers: blockers,
    nextRecommendedWork: nextRecommendedWork,
    controls: {
      externalMessagingEnabled: false,
      orderMutationEnabled: false,
      paymentExecutionEnabled: false,
      refundExecutionEnabled: false,
      productLaunchExecutionEnabled: false,
      executiveReviewRequired: true,
      governedExecutionRequired: true,
      auditRequired: true
    },
    lifecycleCoverage: [
      'idea', 'research', 'businessCase', 'approval', 'product', 'formula', 'label', 'flavor',
      'packaging', 'compliance', 'costs', 'customers', 'orders', 'tasks', 'documents', 'launch',
      'dailyOperations', 'finance', 'performance', 'scaling', 'renewal', 'shutdown', 'exit',
      'lessonsLearned', 'retainedKnowledge'
    ]
  };
}
