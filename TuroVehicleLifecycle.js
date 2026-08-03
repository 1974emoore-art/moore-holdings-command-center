/** Release 4 Turo vehicle lifecycle foundation. */
function buildTuroVehicleLifecycle(input) {
  const source = input && typeof input === 'object' ? input : {};
  const research = source.research && typeof source.research === 'object' ? source.research : {};
  const acquisition = source.acquisition && typeof source.acquisition === 'object' ? source.acquisition : {};
  const operations = source.operations && typeof source.operations === 'object' ? source.operations : {};
  const compliance = source.compliance && typeof source.compliance === 'object' ? source.compliance : {};
  const financials = source.financials && typeof source.financials === 'object' ? source.financials : {};
  const exit = source.exit && typeof source.exit === 'object' ? source.exit : {};

  const purchasePrice = Math.max(0, Number(acquisition.purchasePrice || 0));
  const downPayment = Math.max(0, Number(acquisition.downPayment || 0));
  const monthlyPayment = Math.max(0, Number(acquisition.monthlyPayment || 0));
  const monthlyRevenue = Math.max(0, Number(financials.monthlyRevenue || 0));
  const monthlyExpenses = Math.max(0, Number(financials.monthlyExpenses || 0));
  const utilization = Math.max(0, Math.min(100, Number(operations.utilizationPercent || 0)));
  const netMonthlyCashFlow = monthlyRevenue - monthlyExpenses - monthlyPayment;
  const annualizedCashFlow = netMonthlyCashFlow * 12;
  const cashInvested = downPayment + Math.max(0, Number(acquisition.initialCosts || 0));
  const cashOnCashReturnPercent = cashInvested > 0 ? Math.round((annualizedCashFlow / cashInvested) * 1000) / 10 : null;

  const lifecycleChecks = {
    ideaRecorded: Boolean(source.vehicleTarget || source.opportunityId),
    researchValidated: research.marketValidated === true && research.demandScore != null,
    economicsComplete: purchasePrice > 0 && monthlyRevenue > 0 && monthlyExpenses >= 0,
    acquisitionApproved: acquisition.executiveApproved === true,
    vehicleAcquired: Boolean(source.vin || acquisition.acquiredAt),
    listingActive: operations.listingActive === true,
    insuranceCurrent: compliance.insuranceCurrent === true,
    registrationCurrent: compliance.registrationCurrent === true,
    maintenanceCurrent: operations.maintenanceCurrent === true,
    incidentClear: Number(operations.openIncidentCount || 0) === 0,
    performanceTracked: financials.performanceTracked === true,
    growthDecisionRecorded: Boolean(source.growthDecision),
    replacementPlanRecorded: Boolean(exit.replacementPlan),
    exitPlanRecorded: Boolean(exit.exitStrategy),
    lessonsRetained: Boolean(exit.lessonsLearned)
  };

  const blockers = [];
  if (!lifecycleChecks.ideaRecorded) blockers.push('RECORD_VEHICLE_TARGET');
  if (!lifecycleChecks.researchValidated) blockers.push('COMPLETE_MARKET_RESEARCH');
  if (!lifecycleChecks.economicsComplete) blockers.push('COMPLETE_ACQUISITION_ECONOMICS');
  if (acquisition.executiveApproved !== true) blockers.push('REQUIRE_EXECUTIVE_ACQUISITION_APPROVAL');
  if (lifecycleChecks.vehicleAcquired && !lifecycleChecks.insuranceCurrent) blockers.push('VERIFY_INSURANCE');
  if (lifecycleChecks.vehicleAcquired && !lifecycleChecks.registrationCurrent) blockers.push('VERIFY_REGISTRATION');
  if (lifecycleChecks.listingActive && !lifecycleChecks.maintenanceCurrent) blockers.push('COMPLETE_MAINTENANCE');
  if (!lifecycleChecks.incidentClear) blockers.push('RESOLVE_OPEN_INCIDENTS');
  if (utilization < 55 && lifecycleChecks.listingActive) blockers.push('IMPROVE_UTILIZATION');
  if (netMonthlyCashFlow < 0 && lifecycleChecks.listingActive) blockers.push('CORRECT_NEGATIVE_CASH_FLOW');
  if (!lifecycleChecks.replacementPlanRecorded) blockers.push('CREATE_REPLACEMENT_PLAN');
  if (!lifecycleChecks.exitPlanRecorded) blockers.push('CREATE_EXIT_PLAN');

  const completedStages = Object.keys(lifecycleChecks).filter(function(key) { return lifecycleChecks[key]; }).length;
  const totalStages = Object.keys(lifecycleChecks).length;
  const completionPercent = Math.round((completedStages / totalStages) * 100);

  let stage = 'OPPORTUNITY';
  if (lifecycleChecks.vehicleAcquired) stage = 'ACQUIRED';
  if (lifecycleChecks.listingActive) stage = 'ACTIVE_OPERATIONS';
  if (exit.soldAt) stage = 'SOLD';
  if (exit.closedAt) stage = 'CLOSED';

  return {
    vehicleId: String(source.vehicleId || source.opportunityId || ''),
    vehicleTarget: String(source.vehicleTarget || ''),
    lifecycleStage: stage,
    completionPercent: completionPercent,
    lifecycleChecks: lifecycleChecks,
    purchasePrice: purchasePrice,
    monthlyRevenue: monthlyRevenue,
    monthlyExpenses: monthlyExpenses,
    monthlyPayment: monthlyPayment,
    netMonthlyCashFlow: netMonthlyCashFlow,
    annualizedCashFlow: annualizedCashFlow,
    utilizationPercent: utilization,
    cashOnCashReturnPercent: cashOnCashReturnPercent,
    acquisitionSubmissionAllowed: false,
    purchaseExecutionAllowed: false,
    executiveReviewRequired: true,
    governedExecutionRequired: true,
    blockers: blockers,
    nextRecommendedAction: blockers.length ? blockers[0] : 'MONITOR_AND_OPTIMIZE_FLEET_PERFORMANCE'
  };
}
