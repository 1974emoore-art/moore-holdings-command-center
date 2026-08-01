/**
 * REAL ESTATE MARKET CORE
 *
 * Read-only vacation-market and acquisition-readiness analytics.
 * Property acquisition remains governed by Finance & Cash Flow.
 */
const REAL_ESTATE_BASE_ID_ = 'applB86Cw7gjI7YQz';
const REAL_ESTATE_MARKET_TABLE_ID_ =
  'tbl3rsMa8peDjfpn0';

function scanRealEstateMarkets() {
  const config = getConfig_();
  const records = getAirtableRecords_(
    REAL_ESTATE_BASE_ID_,
    REAL_ESTATE_MARKET_TABLE_ID_,
    config.token
  );

  return analyzeRealEstateMarkets_(
    records,
    scanFinanceCashFlow()
  );
}

function analyzeRealEstateMarkets_(
  records,
  financeResult
) {
  const summary = {
    trackedMarkets: 0,
    coreMarkets: 0,
    activeResearch: 0,
    strongWatch: 0,
    highRisk: 0,
    firsthandMarkets: 0,
    underwritingComplete: 0,
    financiallyReady: 0
  };

  const financeReadiness =
    financeResult && financeResult.readiness
      ? financeResult.readiness
      : {};

  const financeGate =
    financeReadiness.scalingGate ||
    'Review Required';

  const markets = [];

  (records || []).forEach(function(record) {
    const fields = record.fields || {};
    const researchStatus =
      realEstateText_(fields['Research Status']);
    const classification =
      realEstateText_(
        fields['Investment Classification']
      );
    const riskLevel =
      realEstateText_(fields['Risk Level']);
    const evidenceConfidence =
      realEstateText_(fields['Evidence Confidence']);

    const underwritingComplete = [
      fields['Target Purchase Range'],
      fields['Current Price Data'],
      fields['Rental Revenue Data'],
      fields['Occupancy and Seasonality'],
      fields['HOA and Insurance Risk'],
      fields['STR Rules and Permits']
    ].every(function(value) {
      return String(value || '').trim() !== '';
    });

    summary.trackedMarkets += 1;

    if (researchStatus === 'core market') {
      summary.coreMarkets += 1;
    }

    if (researchStatus === 'active research') {
      summary.activeResearch += 1;
    }

    if (classification === 'strong watch') {
      summary.strongWatch += 1;
    }

    if (riskLevel === 'high') {
      summary.highRisk += 1;
    }

    if (fields['Firsthand Experience'] === true) {
      summary.firsthandMarkets += 1;
    }

    if (underwritingComplete) {
      summary.underwritingComplete += 1;
    }

    const blockers = [];

    if (financeGate !== 'Clear') {
      blockers.push(
        'Company Finance Gate: ' + financeGate
      );
    }

    if (!underwritingComplete) {
      blockers.push('Property underwriting incomplete');
    }

    if (evidenceConfidence !== 'high') {
      blockers.push(
        'Evidence confidence: ' +
        (fields['Evidence Confidence'] ||
          'Not researched')
      );
    }

    if (
      riskLevel === 'high' ||
      riskLevel === 'unverified' ||
      !riskLevel
    ) {
      blockers.push(
        'Risk level: ' +
        (fields['Risk Level'] || 'Unverified')
      );
    }

    const financiallyReady = blockers.length === 0;

    if (financiallyReady) {
      summary.financiallyReady += 1;
    }

    markets.push({
      market: fields['Market Name'] ||
        'Unnamed market',
      priority:
        fields['Moore Holdings Priority'] ||
        'Not ranked',
      researchStatus:
        fields['Research Status'] ||
        'Not started',
      investmentClassification:
        fields['Investment Classification'] ||
        'Not classified',
      cashFlowPotential:
        Number(fields['Cash Flow Potential']) || 0,
      appreciationPotential:
        Number(fields['Appreciation Potential']) || 0,
      financiallyReady: financiallyReady,
      blockers: blockers,
      nextResearchAction:
        fields['Next Research Action'] || ''
    });
  });

  markets.sort(function(a, b) {
    return String(a.priority).localeCompare(
      String(b.priority)
    );
  });

  let acquisitionGate = 'Review Required';

  if (financeGate === 'Blocked') {
    acquisitionGate = 'Blocked';
  } else if (
    financeGate === 'Clear' &&
    summary.trackedMarkets > 0 &&
    summary.financiallyReady > 0
  ) {
    acquisitionGate = 'Clear';
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: summary,
    markets: markets,
    readiness: {
      financeGate: financeGate,
      acquisitionGate: acquisitionGate,
      propertyAcquisitionAuthorized: false
    },
    safety: {
      readOnly: true,
      airtableWritesRequested: 0,
      airtableRecordsChanged: 0,
      propertyOffersAuthorized: 0,
      financingApplicationsSubmitted: 0,
      depositsAuthorized: 0,
      purchasesAuthorized: 0,
      paymentsAuthorized: 0
    }
  };
}

function realEstateText_(value) {
  if (
    value &&
    typeof value === 'object' &&
    value.name
  ) {
    value = value.name;
  }

  return String(value || '').trim().toLowerCase();
}

function testRealEstateMarketCore() {
  const result = analyzeRealEstateMarkets_(
    [
      {
        fields: {
          'Market Name': 'Hilton Head Island, SC',
          'Research Status': 'Core Market',
          'Moore Holdings Priority': '1 - Highest',
          'Investment Classification':
            'Strong Watch',
          'Evidence Confidence': 'Low',
          'Risk Level': 'Unverified',
          'Cash Flow Potential': 7,
          'Appreciation Potential': 8
        }
      }
    ],
    {
      readiness: {
        scalingGate: 'Review Required'
      }
    }
  );

  if (
    result.summary.trackedMarkets !== 1 ||
    result.summary.financiallyReady !== 0 ||
    result.markets[0].blockers.length !== 4 ||
    result.readiness.propertyAcquisitionAuthorized !==
      false ||
    result.safety.readOnly !== true
  ) {
    throw new Error(
      'Real Estate Market core validation failed.'
    );
  }

  console.log(
    'REAL ESTATE MARKET CORE VALIDATION SUCCESSFUL'
  );

  return result;
}
