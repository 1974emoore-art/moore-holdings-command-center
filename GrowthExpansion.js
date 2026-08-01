/**
 * BUSINESS GROWTH & EXPANSION CORE
 *
 * Read-only expansion pipeline analytics.
 * New initiatives remain governed by Finance, systems, compliance,
 * documented business cases, and explicit CEO approval.
 */
const GROWTH_EXPANSION_BASE_ID_ = 'applB86Cw7gjI7YQz';
const GROWTH_EXPANSION_TABLE_ID_ = 'tblzI3CEOMZ4Kvzdy';

function scanGrowthExpansion() {
  const config = getConfig_();
  const records = getAirtableRecords_(
    GROWTH_EXPANSION_BASE_ID_,
    GROWTH_EXPANSION_TABLE_ID_,
    config.token
  );

  return analyzeGrowthExpansion_(
    records,
    scanFinanceCashFlow()
  );
}

function analyzeGrowthExpansion_(records, financeResult) {
  const summary = {
    trackedInitiatives: 0,
    activeCore: 0,
    research: 0,
    planned: 0,
    onHold: 0,
    nearTerm: 0,
    systemsReady: 0,
    complianceReady: 0,
    businessCasesComplete: 0,
    approvalRequired: 0,
    launchReady: 0
  };

  const financeReadiness =
    financeResult && financeResult.readiness
      ? financeResult.readiness
      : {};

  const companyFinanceGate =
    financeReadiness.scalingGate || 'Review Required';

  const initiatives = [];

  (records || []).forEach(function(record) {
    const fields = record.fields || {};
    const stage = growthText_(fields['Stage']);
    const horizon = growthText_(fields['Time Horizon']);
    const opportunityFinanceGate =
      fields['Finance Gate'] || 'Review Required';
    const systemsReady = fields['Systems Ready'] === true;
    const complianceReady =
      fields['Compliance Ready'] === true;
    const businessCaseComplete =
      fields['Business Case Complete'] === true;
    const approvalRequired =
      fields['CEO Approval Required'] === true;

    summary.trackedInitiatives += 1;
    if (stage === 'active core') summary.activeCore += 1;
    if (stage === 'research') summary.research += 1;
    if (stage === 'planned') summary.planned += 1;
    if (stage === 'on hold') summary.onHold += 1;
    if (horizon === 'near term') summary.nearTerm += 1;
    if (systemsReady) summary.systemsReady += 1;
    if (complianceReady) summary.complianceReady += 1;
    if (businessCaseComplete) {
      summary.businessCasesComplete += 1;
    }
    if (approvalRequired) summary.approvalRequired += 1;

    const blockers = [];

    if (companyFinanceGate !== 'Clear') {
      blockers.push(
        'Company Finance Gate: ' + companyFinanceGate
      );
    }

    if (growthText_(opportunityFinanceGate) !== 'clear') {
      blockers.push(
        'Initiative Finance Gate: ' +
        opportunityFinanceGate
      );
    }

    if (!systemsReady) {
      blockers.push('Operating systems not ready');
    }

    if (!complianceReady) {
      blockers.push('Compliance review incomplete');
    }

    if (!businessCaseComplete) {
      blockers.push('Business case incomplete');
    }

    if (approvalRequired) {
      blockers.push('CEO approval required');
    }

    const launchReady = blockers.length === 0;

    if (launchReady) summary.launchReady += 1;

    initiatives.push({
      initiative:
        fields['Initiative'] || 'Unnamed initiative',
      businessLine:
        fields['Business Line'] || 'Unclassified',
      stage: fields['Stage'] || 'Not started',
      priority: fields['Priority'] || 'Not ranked',
      timeHorizon:
        fields['Time Horizon'] || 'Not set',
      launchReady: launchReady,
      blockers: blockers,
      notes: fields['Notes'] || ''
    });
  });

  initiatives.sort(function(a, b) {
    return String(a.priority).localeCompare(
      String(b.priority)
    );
  });

  let expansionGate = 'Review Required';

  if (companyFinanceGate === 'Blocked') {
    expansionGate = 'Blocked';
  } else if (
    companyFinanceGate === 'Clear' &&
    summary.trackedInitiatives > 0 &&
    summary.launchReady > 0
  ) {
    expansionGate = 'Approval Review';
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: summary,
    initiatives: initiatives,
    readiness: {
      financeGate: companyFinanceGate,
      expansionGate: expansionGate,
      initiativeLaunchAuthorized: false
    },
    safety: {
      readOnly: true,
      airtableWritesRequested: 0,
      airtableRecordsChanged: 0,
      newBusinessesLaunched: 0,
      contractsAuthorized: 0,
      financingApplicationsSubmitted: 0,
      capitalExpendituresAuthorized: 0,
      hiresAuthorized: 0,
      purchasesAuthorized: 0,
      paymentsAuthorized: 0
    }
  };
}

function growthText_(value) {
  if (
    value &&
    typeof value === 'object' &&
    value.name
  ) {
    value = value.name;
  }

  return String(value || '').trim().toLowerCase();
}

function testGrowthExpansionCore() {
  const result = analyzeGrowthExpansion_(
    [{
      fields: {
        Initiative: 'Happy Juice Product Business',
        'Business Line': 'Happy Juice',
        Stage: 'Research',
        Priority: '3 - Medium',
        'Time Horizon': 'Near Term',
        'Finance Gate': 'Review Required',
        'Systems Ready': false,
        'Compliance Ready': false,
        'Business Case Complete': false,
        'CEO Approval Required': true
      }
    }],
    { readiness: { scalingGate: 'Review Required' } }
  );

  if (
    result.summary.trackedInitiatives !== 1 ||
    result.summary.launchReady !== 0 ||
    result.initiatives[0].blockers.length !== 6 ||
    result.readiness.expansionGate !==
      'Review Required' ||
    result.readiness.initiativeLaunchAuthorized !== false ||
    result.safety.newBusinessesLaunched !== 0
  ) {
    throw new Error(
      'Business Growth & Expansion core validation failed.'
    );
  }

  console.log(
    'BUSINESS GROWTH & EXPANSION CORE VALIDATION SUCCESSFUL'
  );

  return result;
}
