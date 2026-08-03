function buildRealEstateLifecycle(record) {
  record = record || {};
  var revenue = Number(record.monthlyRevenue || 0);
  var mortgage = Number(record.monthlyMortgage || 0);
  var operatingExpenses = Number(record.monthlyOperatingExpenses || 0);
  var reserves = Number(record.monthlyReserves || 0);
  var monthlyNet = revenue - mortgage - operatingExpenses - reserves;
  var cashInvested = Number(record.cashInvested || record.downPayment || 0);
  var annualCashFlow = monthlyNet * 12;
  var cashOnCashReturn = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;

  var blockers = [];
  if (!record.marketResearchComplete) blockers.push('Complete market research');
  if (!record.compsVerified) blockers.push('Verify comparable properties and revenue evidence');
  if (!record.underwritingComplete) blockers.push('Complete property underwriting');
  if (!record.financingPlanComplete) blockers.push('Complete financing plan');
  if (!record.strRulesVerified) blockers.push('Verify STR rules and licensing requirements');
  if (!record.inspectionComplete && record.stage === 'OFFER') blockers.push('Complete inspection due diligence');
  if (record.stage === 'ACTIVE' && !record.insuranceCurrent) blockers.push('Restore insurance compliance');
  if (record.stage === 'ACTIVE' && !record.maintenanceCurrent) blockers.push('Resolve maintenance backlog');
  if (record.stage === 'ACTIVE' && !record.requiredDocumentsComplete) blockers.push('Complete required property documents');
  if ((record.stage === 'OFFER' || record.stage === 'ACQUISITION') && record.ceoApproval !== 'APPROVED') blockers.push('Executive approval required');

  var nextAction = blockers.length ? blockers[0] : 'Monitor performance and prepare the next governed lifecycle decision';

  return {
    propertyId: record.propertyId || '',
    market: record.market || '',
    propertyName: record.propertyName || record.address || '',
    stage: record.stage || 'IDEA',
    strategy: record.strategy || 'STR',
    purchasePrice: Number(record.purchasePrice || 0),
    cashInvested: cashInvested,
    monthlyRevenue: revenue,
    monthlyOperatingCost: mortgage + operatingExpenses + reserves,
    monthlyNetCashFlow: monthlyNet,
    annualCashFlow: annualCashFlow,
    cashOnCashReturn: cashOnCashReturn,
    marketResearchComplete: !!record.marketResearchComplete,
    compsVerified: !!record.compsVerified,
    underwritingComplete: !!record.underwritingComplete,
    financingPlanComplete: !!record.financingPlanComplete,
    strRulesVerified: !!record.strRulesVerified,
    inspectionComplete: !!record.inspectionComplete,
    offerStatus: record.offerStatus || 'NOT_STARTED',
    bookingsActive: Number(record.bookingsActive || 0),
    customersTracked: Number(record.customersTracked || 0),
    maintenanceCurrent: !!record.maintenanceCurrent,
    insuranceCurrent: !!record.insuranceCurrent,
    requiredDocumentsComplete: !!record.requiredDocumentsComplete,
    openTasks: Number(record.openTasks || 0),
    growthDecision: record.growthDecision || 'HOLD',
    dispositionPlan: record.dispositionPlan || 'HOLD',
    retainedLessons: record.retainedLessons || '',
    blockers: blockers,
    nextRecommendedAction: nextAction,
    canSubmitOffer: false,
    canExecutePurchase: false,
    canSendExternalMessage: false,
    requiresExecutiveReview: true,
    requiresGovernedExecution: true
  };
}
