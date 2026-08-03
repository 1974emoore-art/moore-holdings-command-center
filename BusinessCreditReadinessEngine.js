/** Release 3 Business Credit readiness and application-gating engine. */
function buildBusinessCreditReadiness(input) {
  const source = input && typeof input === 'object' ? input : {};
  const foundation = source.foundation && typeof source.foundation === 'object' ? source.foundation : {};
  const vendors = Array.isArray(source.vendors) ? source.vendors : [];
  const tradelines = Array.isArray(source.tradelines) ? source.tradelines : [];
  const bureaus = Array.isArray(source.bureaus) ? source.bureaus : [];
  const applications = Array.isArray(source.applications) ? source.applications : [];

  const foundationChecks = {
    entityActive: foundation.entityActive === true,
    einVerified: foundation.einVerified === true,
    businessAddressVerified: foundation.businessAddressVerified === true,
    businessPhoneVerified: foundation.businessPhoneVerified === true,
    businessBankingActive: foundation.businessBankingActive === true,
    dunsEstablished: foundation.dunsEstablished === true
  };
  const foundationPassed = Object.keys(foundationChecks).filter(function(key) { return foundationChecks[key]; }).length;
  const reportingTradelines = tradelines.filter(function(item) { return item && item.reporting === true && String(item.status || '').toUpperCase() === 'ACTIVE'; });
  const reportingVendors = vendors.filter(function(item) { return item && item.reporting === true && String(item.status || '').toUpperCase() === 'ACTIVE'; });
  const coveredBureaus = bureaus.filter(function(item) { return item && item.reportingDetected === true; });
  const utilization = Math.max(0, Number(source.utilizationPercent || 0));
  const paymentHistoryClean = source.latePaymentsLast12Months ? Number(source.latePaymentsLast12Months) === 0 : true;
  const openApplications = applications.filter(function(item) { return item && ['DRAFT','UNDER_REVIEW','SUBMITTED'].indexOf(String(item.status || '').toUpperCase()) !== -1; });

  const score = Math.min(100,
    foundationPassed * 8 +
    Math.min(reportingVendors.length, 3) * 7 +
    Math.min(reportingTradelines.length, 5) * 6 +
    Math.min(coveredBureaus.length, 3) * 5 +
    (utilization <= 30 ? 10 : utilization <= 50 ? 5 : 0) +
    (paymentHistoryClean ? 10 : 0)
  );

  const blockers = [];
  if (foundationPassed < Object.keys(foundationChecks).length) blockers.push('COMPLETE_BUSINESS_FOUNDATION');
  if (!foundationChecks.dunsEstablished) blockers.push('ESTABLISH_DUNS');
  if (reportingVendors.length < 3) blockers.push('ADD_REPORTING_VENDORS');
  if (reportingTradelines.length < 3) blockers.push('BUILD_REPORTING_TRADELINES');
  if (coveredBureaus.length < 2) blockers.push('VERIFY_BUREAU_REPORTING');
  if (utilization > 30) blockers.push('REDUCE_UTILIZATION');
  if (!paymentHistoryClean) blockers.push('STABILIZE_PAYMENT_HISTORY');
  if (openApplications.length > 0) blockers.push('REVIEW_OPEN_APPLICATIONS');

  const fundingReady = blockers.length === 0 && score >= 80;
  return {
    readinessScore: score,
    readinessBand: score >= 80 ? 'READY' : score >= 60 ? 'BUILDING' : 'FOUNDATION',
    fundingReady: fundingReady,
    applicationSubmissionAllowed: false,
    executiveReviewRequired: true,
    governedExecutionRequired: true,
    foundationChecks: foundationChecks,
    reportingVendorCount: reportingVendors.length,
    reportingTradelineCount: reportingTradelines.length,
    bureauCoverageCount: coveredBureaus.length,
    utilizationPercent: utilization,
    openApplicationCount: openApplications.length,
    blockers: blockers,
    nextRecommendedAction: blockers.length ? blockers[0] : 'PREVIEW_FUNDING_APPLICATION_REVIEW_TASK'
  };
}
