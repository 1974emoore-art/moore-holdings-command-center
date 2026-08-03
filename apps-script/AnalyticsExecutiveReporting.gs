const ANALYTICS_REPORTING_GOVERNANCE = Object.freeze({
  externalPublicationEnabled: false,
  automaticDistributionEnabled: false,
  financialDecisionExecutionEnabled: false,
  executiveApprovalRequired: true,
  verificationRequired: true,
  auditRequired: true
});

function buildAnalyticsExecutiveReportingModel(input) {
  const data = input || {};
  const modules = Array.isArray(data.modules) ? data.modules : [];
  const kpis = Array.isArray(data.kpis) ? data.kpis : [];
  const forecasts = Array.isArray(data.forecasts) ? data.forecasts : [];
  const reports = Array.isArray(data.reports) ? data.reports : [];
  const reviews = Array.isArray(data.reviews) ? data.reviews : [];
  const auditHistory = Array.isArray(data.auditHistory) ? data.auditHistory : [];

  const moduleHealth = modules.map(function(module) {
    const score = clampNumber(module.healthScore, 0, 100);
    return {
      moduleId: stringValue(module.moduleId || module.id),
      moduleName: stringValue(module.moduleName || module.name || 'Unnamed Module'),
      healthScore: score,
      status: score >= 80 ? 'HEALTHY' : score >= 60 ? 'WATCH' : 'AT_RISK',
      blockers: arrayValue(module.blockers),
      nextAction: stringValue(module.nextAction)
    };
  });

  const verifiedKpis = kpis.filter(function(kpi) {
    return Boolean(kpi.verified) && isFiniteNumber(kpi.actualValue);
  });
  const onTargetKpis = verifiedKpis.filter(function(kpi) {
    return evaluateKpiPerformance(kpi) === 'ON_TARGET';
  });
  const offTargetKpis = verifiedKpis.filter(function(kpi) {
    return evaluateKpiPerformance(kpi) === 'OFF_TARGET';
  });
  const unverifiedKpis = kpis.filter(function(kpi) { return !kpi.verified; });

  const currentForecasts = forecasts.filter(function(forecast) {
    return Boolean(forecast.verified) && stringValue(forecast.status).toUpperCase() !== 'RETIRED';
  });
  const overdueReviews = reviews.filter(function(review) {
    return isPastDue(review.dueDate) && stringValue(review.status).toUpperCase() !== 'COMPLETED';
  });
  const pendingReports = reports.filter(function(report) {
    const status = stringValue(report.status).toUpperCase();
    return status === 'DRAFT' || status === 'PENDING_REVIEW' || status === 'PENDING_APPROVAL';
  });
  const unverifiedReports = reports.filter(function(report) { return !report.verified; });
  const atRiskModules = moduleHealth.filter(function(module) { return module.status === 'AT_RISK'; });

  const blockers = [];
  if (unverifiedKpis.length) blockers.push(unverifiedKpis.length + ' KPI(s) require source verification.');
  if (offTargetKpis.length) blockers.push(offTargetKpis.length + ' verified KPI(s) are off target.');
  if (atRiskModules.length) blockers.push(atRiskModules.length + ' module(s) are at risk.');
  if (overdueReviews.length) blockers.push(overdueReviews.length + ' executive review(s) are overdue.');
  if (unverifiedReports.length) blockers.push(unverifiedReports.length + ' report(s) require verification.');

  const healthScore = calculateEnterpriseHealth(moduleHealth, verifiedKpis, overdueReviews);
  const nextRecommendedWork = determineAnalyticsNextWork({
    unverifiedKpis: unverifiedKpis,
    offTargetKpis: offTargetKpis,
    atRiskModules: atRiskModules,
    overdueReviews: overdueReviews,
    pendingReports: pendingReports,
    unverifiedReports: unverifiedReports
  });

  return {
    generatedAt: new Date().toISOString(),
    governance: ANALYTICS_REPORTING_GOVERNANCE,
    enterpriseHealthScore: healthScore,
    enterpriseHealthStatus: healthScore >= 80 ? 'HEALTHY' : healthScore >= 60 ? 'WATCH' : 'AT_RISK',
    moduleHealth: moduleHealth,
    kpiSummary: {
      total: kpis.length,
      verified: verifiedKpis.length,
      onTarget: onTargetKpis.length,
      offTarget: offTargetKpis.length,
      unverified: unverifiedKpis.length
    },
    forecastSummary: {
      total: forecasts.length,
      currentVerified: currentForecasts.length
    },
    reportSummary: {
      total: reports.length,
      pendingReviewOrApproval: pendingReports.length,
      unverified: unverifiedReports.length
    },
    reviewSummary: {
      total: reviews.length,
      overdue: overdueReviews.length
    },
    blockers: blockers,
    nextRecommendedWork: nextRecommendedWork,
    auditHistoryCount: auditHistory.length,
    executionBoundary: {
      canPublishExternally: false,
      canDistributeAutomatically: false,
      canExecuteFinancialDecisions: false,
      requiresExecutiveApproval: true,
      requiresVerification: true,
      requiresAudit: true
    }
  };
}

function evaluateKpiPerformance(kpi) {
  if (!kpi || !kpi.verified || !isFiniteNumber(kpi.actualValue) || !isFiniteNumber(kpi.targetValue)) {
    return 'UNVERIFIED';
  }
  const direction = stringValue(kpi.direction || 'HIGHER_IS_BETTER').toUpperCase();
  if (direction === 'LOWER_IS_BETTER') {
    return Number(kpi.actualValue) <= Number(kpi.targetValue) ? 'ON_TARGET' : 'OFF_TARGET';
  }
  return Number(kpi.actualValue) >= Number(kpi.targetValue) ? 'ON_TARGET' : 'OFF_TARGET';
}

function calculateEnterpriseHealth(moduleHealth, verifiedKpis, overdueReviews) {
  const moduleAverage = moduleHealth.length
    ? moduleHealth.reduce(function(sum, module) { return sum + module.healthScore; }, 0) / moduleHealth.length
    : 0;
  const kpiScore = verifiedKpis.length
    ? verifiedKpis.filter(function(kpi) { return evaluateKpiPerformance(kpi) === 'ON_TARGET'; }).length / verifiedKpis.length * 100
    : 0;
  const reviewPenalty = Math.min(overdueReviews.length * 5, 25);
  return Math.round(Math.max(0, Math.min(100, moduleAverage * 0.6 + kpiScore * 0.4 - reviewPenalty)));
}

function determineAnalyticsNextWork(state) {
  if (state.unverifiedKpis.length) return 'Verify KPI source data and evidence before executive use.';
  if (state.unverifiedReports.length) return 'Verify report calculations and supporting evidence.';
  if (state.overdueReviews.length) return 'Complete overdue executive performance reviews.';
  if (state.atRiskModules.length) return 'Review at-risk modules and approve corrective plans.';
  if (state.offTargetKpis.length) return 'Analyze off-target KPIs and prepare governed corrective recommendations.';
  if (state.pendingReports.length) return 'Review and approve pending executive reports.';
  return 'Maintain reporting cadence and monitor verified enterprise performance.';
}

function isPastDue(dateValue) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return !isNaN(date.getTime()) && date.getTime() < Date.now();
}

function clampNumber(value, minimum, maximum) {
  const number = Number(value);
  if (!isFinite(number)) return minimum;
  return Math.max(minimum, Math.min(maximum, number));
}

function isFiniteNumber(value) {
  return value !== null && value !== '' && isFinite(Number(value));
}

function stringValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}
