/** Release 3 completion controls for Business Credit cards, growth, and exit. */
function buildBusinessCreditLifecycleCompletion(input) {
  const source = input && typeof input === 'object' ? input : {};
  const cards = Array.isArray(source.cards) ? source.cards : [];
  const growthPlans = Array.isArray(source.growthPlans) ? source.growthPlans : [];
  const exitPlans = Array.isArray(source.exitPlans) ? source.exitPlans : [];

  const activeCards = cards.filter(function(card) {
    return card && String(card.status || '').toUpperCase() === 'ACTIVE';
  });
  const totalLimit = activeCards.reduce(function(sum, card) {
    return sum + Math.max(0, Number(card.limit || 0));
  }, 0);
  const totalBalance = activeCards.reduce(function(sum, card) {
    return sum + Math.max(0, Number(card.balance || 0));
  }, 0);
  const utilizationPercent = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 10000) / 100 : 0;
  const renewalDueCount = activeCards.filter(function(card) {
    if (!card.renewalAt) return false;
    const renewal = new Date(String(card.renewalAt));
    if (!Number.isFinite(renewal.getTime())) return false;
    return renewal.getTime() <= Date.now() + (90 * 86400000);
  }).length;

  const activeGrowthPlans = growthPlans.filter(function(plan) {
    return plan && ['PLANNED','APPROVED','IN_PROGRESS'].indexOf(String(plan.status || '').toUpperCase()) !== -1;
  });
  const growthPlansWithMetrics = activeGrowthPlans.filter(function(plan) {
    return Number.isFinite(Number(plan.targetAmount)) && Number(plan.targetAmount) > 0 && Boolean(plan.targetDate);
  });

  const activeExitPlans = exitPlans.filter(function(plan) {
    return plan && ['DRAFT','APPROVED','IN_PROGRESS'].indexOf(String(plan.status || '').toUpperCase()) !== -1;
  });
  const exitPlansWithRecords = activeExitPlans.filter(function(plan) {
    return Boolean(plan.strategy) && Boolean(plan.owner) && Boolean(plan.recordRetentionPlan);
  });

  const blockers = [];
  if (!activeCards.length) blockers.push('ESTABLISH_OR_RECORD_BUSINESS_CARD');
  if (utilizationPercent > 30) blockers.push('REDUCE_BUSINESS_CARD_UTILIZATION');
  if (renewalDueCount > 0) blockers.push('REVIEW_CARD_RENEWALS');
  if (!activeGrowthPlans.length) blockers.push('CREATE_BUSINESS_CREDIT_GROWTH_PLAN');
  if (activeGrowthPlans.length && growthPlansWithMetrics.length !== activeGrowthPlans.length) blockers.push('COMPLETE_GROWTH_TARGETS_AND_DATES');
  if (!activeExitPlans.length) blockers.push('CREATE_BUSINESS_CREDIT_EXIT_PLAN');
  if (activeExitPlans.length && exitPlansWithRecords.length !== activeExitPlans.length) blockers.push('COMPLETE_EXIT_AND_RECORD_RETENTION_PLAN');

  return {
    cardLifecycle: {
      activeCardCount: activeCards.length,
      totalLimit: totalLimit,
      totalBalance: totalBalance,
      utilizationPercent: utilizationPercent,
      renewalDueCount: renewalDueCount
    },
    growthLifecycle: {
      activePlanCount: activeGrowthPlans.length,
      completePlanCount: growthPlansWithMetrics.length,
      governedExecutionRequired: true
    },
    exitLifecycle: {
      activePlanCount: activeExitPlans.length,
      completePlanCount: exitPlansWithRecords.length,
      retainedKnowledgeRequired: true,
      governedExecutionRequired: true
    },
    lifecycleLawSatisfied: blockers.length === 0,
    blockers: blockers,
    nextRecommendedAction: blockers.length ? blockers[0] : 'MONITOR_AND_OPTIMIZE_BUSINESS_CREDIT_LIFECYCLE',
    applicationSubmissionAllowed: false,
    directExternalExecutionAllowed: false,
    executiveReviewRequired: true
  };
}
