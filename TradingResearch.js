/**
 * TRADING & INVESTMENT RESEARCH CORE
 *
 * Read-only long-term asset research analytics.
 * Broker execution is intentionally absent and permanently disarmed here.
 */
const TRADING_RESEARCH_BASE_ID_ = 'applB86Cw7gjI7YQz';
const TRADING_RESEARCH_TABLE_ID_ = 'tbloB8jAN5qXJp0L4';

function scanTradingResearch() {
  const config = getConfig_();
  const records = getAirtableRecords_(
    TRADING_RESEARCH_BASE_ID_,
    TRADING_RESEARCH_TABLE_ID_,
    config.token
  );

  return analyzeTradingResearch_(
    records,
    scanFinanceCashFlow()
  );
}

function analyzeTradingResearch_(records, financeResult) {
  const summary = {
    trackedAssets: 0,
    highConviction: 0,
    watch: 0,
    speculative: 0,
    longTerm: 0,
    researchComplete: 0,
    approvalRequired: 0,
    financiallyReady: 0,
    executionEnabled: 0
  };

  const financeReadiness =
    financeResult && financeResult.readiness
      ? financeResult.readiness
      : {};

  const financeGate =
    financeReadiness.scalingGate || 'Review Required';

  const assets = [];

  (records || []).forEach(function(record) {
    const fields = record.fields || {};
    const status = tradingText_(fields['Research Status']);
    const horizon = tradingText_(fields['Time Horizon']);
    const assetGate = fields['Finance Gate'] || 'Review Required';
    const researchComplete =
      fields['Research Complete'] === true;
    const approvalRequired =
      fields['Approval Required'] === true;
    const executionEnabled =
      fields['Execution Enabled'] === true;

    summary.trackedAssets += 1;
    if (status === 'high conviction') {
      summary.highConviction += 1;
    }
    if (status === 'watch') summary.watch += 1;
    if (status === 'speculative') {
      summary.speculative += 1;
    }
    if (horizon === 'long term') summary.longTerm += 1;
    if (researchComplete) summary.researchComplete += 1;
    if (approvalRequired) summary.approvalRequired += 1;
    if (executionEnabled) summary.executionEnabled += 1;

    const blockers = [];

    if (financeGate !== 'Clear') {
      blockers.push('Company Finance Gate: ' + financeGate);
    }

    if (tradingText_(assetGate) !== 'clear') {
      blockers.push('Asset Finance Gate: ' + assetGate);
    }

    if (!researchComplete) {
      blockers.push('Research and risk review incomplete');
    }

    if (approvalRequired) {
      blockers.push('CEO approval required');
    }

    if (!executionEnabled) {
      blockers.push('Execution disabled');
    }

    const financiallyReady = blockers.length === 0;

    if (financiallyReady) {
      summary.financiallyReady += 1;
    }

    assets.push({
      asset: fields['Asset'] || 'Unnamed asset',
      symbol: fields['Symbol'] || '',
      assetType: fields['Asset Type'] || 'Unclassified',
      researchStatus:
        fields['Research Status'] || 'Not started',
      timeHorizon:
        fields['Time Horizon'] || 'Not set',
      riskLevel: fields['Risk Level'] || 'Unverified',
      thesis: fields['Thesis'] || '',
      financiallyReady: financiallyReady,
      blockers: blockers
    });
  });

  let executionGate = 'Locked';

  if (
    financeGate === 'Clear' &&
    summary.trackedAssets > 0 &&
    summary.financiallyReady > 0
  ) {
    executionGate = 'Approval Review';
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: summary,
    assets: assets,
    readiness: {
      financeGate: financeGate,
      executionGate: executionGate,
      liveTradingAuthorized: false,
      paperTradingAuthorized: false
    },
    safety: {
      readOnly: true,
      airtableWritesRequested: 0,
      airtableRecordsChanged: 0,
      brokerConnectionsOpened: 0,
      marketOrdersSubmitted: 0,
      limitOrdersSubmitted: 0,
      paperOrdersSubmitted: 0,
      liveOrdersSubmitted: 0,
      depositsAuthorized: 0,
      transfersAuthorized: 0
    }
  };
}

function tradingText_(value) {
  if (
    value &&
    typeof value === 'object' &&
    value.name
  ) {
    value = value.name;
  }

  return String(value || '').trim().toLowerCase();
}

function testTradingResearchCore() {
  const result = analyzeTradingResearch_(
    [{
      fields: {
        Asset: 'Akash Network',
        Symbol: 'AKT',
        'Asset Type': 'Crypto',
        'Research Status': 'High Conviction',
        'Time Horizon': 'Long Term',
        'Risk Level': 'High',
        'Research Complete': false,
        'Finance Gate': 'Review Required',
        'Approval Required': true,
        'Execution Enabled': false
      }
    }],
    { readiness: { scalingGate: 'Review Required' } }
  );

  if (
    result.summary.trackedAssets !== 1 ||
    result.summary.financiallyReady !== 0 ||
    result.assets[0].blockers.length !== 5 ||
    result.readiness.executionGate !== 'Locked' ||
    result.readiness.liveTradingAuthorized !== false ||
    result.readiness.paperTradingAuthorized !== false ||
    result.safety.paperOrdersSubmitted !== 0
  ) {
    throw new Error(
      'Trading & Investment Research core validation failed.'
    );
  }

  console.log(
    'TRADING & INVESTMENT RESEARCH CORE VALIDATION SUCCESSFUL'
  );

  return result;
}
