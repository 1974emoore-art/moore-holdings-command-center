function getRealEstateLifecycleDashboardData(records) {
  const source = Array.isArray(records) ? records : [];
  const evaluated = source.map(function (record) {
    return typeof evaluateRealEstateLifecycle === 'function'
      ? evaluateRealEstateLifecycle(record)
      : record;
  });

  const money = function (value) {
    const number = Number(value || 0);
    return Math.round(number * 100) / 100;
  };
  const truthy = function (value) {
    return value === true || String(value || '').toUpperCase() === 'YES' || String(value || '').toUpperCase() === 'COMPLETE';
  };

  const totals = evaluated.reduce(function (summary, item) {
    const lifecycle = item.lifecycle || item;
    summary.trackedProperties += 1;
    if (truthy(lifecycle.underwritingComplete)) summary.underwritingComplete += 1;
    if (truthy(lifecycle.financingReady)) summary.financingReady += 1;
    if (truthy(lifecycle.strCompliant)) summary.strCompliant += 1;
    if (truthy(lifecycle.inspectionComplete)) summary.inspectionsComplete += 1;
    if (String(lifecycle.operatingStatus || '').toUpperCase() === 'ACTIVE') summary.activeProperties += 1;
    if (truthy(lifecycle.dispositionPlanned)) summary.dispositionPlanned += 1;
    summary.monthlyNetCashFlow += Number(lifecycle.monthlyNetCashFlow || 0);
    summary.annualCashFlow += Number(lifecycle.annualCashFlow || 0);
    summary.blockers += Array.isArray(lifecycle.blockers) ? lifecycle.blockers.length : 0;
    return summary;
  }, {
    trackedProperties: 0,
    underwritingComplete: 0,
    financingReady: 0,
    strCompliant: 0,
    inspectionsComplete: 0,
    activeProperties: 0,
    dispositionPlanned: 0,
    monthlyNetCashFlow: 0,
    annualCashFlow: 0,
    blockers: 0
  });

  totals.monthlyNetCashFlow = money(totals.monthlyNetCashFlow);
  totals.annualCashFlow = money(totals.annualCashFlow);

  return {
    summary: totals,
    properties: evaluated.map(function (item) {
      const lifecycle = item.lifecycle || item;
      return {
        property: lifecycle.propertyName || lifecycle.address || lifecycle.market || 'Unnamed property',
        market: lifecycle.market || '',
        stage: lifecycle.lifecycleStage || lifecycle.status || 'Research',
        purchasePrice: money(lifecycle.purchasePrice),
        monthlyNetCashFlow: money(lifecycle.monthlyNetCashFlow),
        cashOnCashReturn: Number(lifecycle.cashOnCashReturn || 0),
        underwritingComplete: truthy(lifecycle.underwritingComplete),
        financingReady: truthy(lifecycle.financingReady),
        strCompliant: truthy(lifecycle.strCompliant),
        inspectionComplete: truthy(lifecycle.inspectionComplete),
        blockers: Array.isArray(lifecycle.blockers) ? lifecycle.blockers : [],
        nextRecommendedWork: lifecycle.nextRecommendedWork || lifecycle.nextAction || 'Complete lifecycle evidence.'
      };
    }),
    governance: {
      offerSubmissionEnabled: false,
      purchaseExecutionEnabled: false,
      contractExecutionEnabled: false,
      externalMessagingEnabled: false,
      executiveReviewRequired: true,
      governedExecutionRequired: true
    }
  };
}
