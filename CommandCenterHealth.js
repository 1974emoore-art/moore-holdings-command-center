/**
 * COMMAND CENTER — AGGREGATE PRODUCTION HEALTH CHECK
 *
 * Runs every live core module and returns counts and safety state only.
 * No record names, account data, asset details, or initiative details leave
 * Apps Script. This bridge never writes, approves, purchases, pays, or sends.
 */
function runCommandCenterProductionHealth() {
  const personal = scanPersonalCredit() || {};
  const business = scanBusinessCredit() || {};
  const finance = scanFinanceCashFlow() || {};
  const turo = scanTuroFleet() || {};
  const realEstate = scanRealEstateMarkets() || {};
  const trading = scanTradingResearch() || {};
  const growth = scanGrowthExpansion() || {};

  const moduleSafety = [
    business.safety,
    finance.safety,
    turo.safety,
    realEstate.safety,
    trading.safety,
    growth.safety
  ].every(function(safety) {
    return safety && safety.readOnly === true &&
      safety.airtableWritesRequested === 0 &&
      safety.airtableRecordsChanged === 0;
  });

  const report = {
    completed: moduleSafety,
    productionVersionExpected: 57,
    modules: {
      personalCredit: {
        records: Number(personal.recordCount || 0),
        flags: Number(
          personal.summary && personal.summary.totalFlags || 0
        )
      },
      businessCredit: {
        records: Number(business.recordCount || 0),
        complete: Number(
          business.summary && business.summary.complete || 0
        ),
        actionRequired: Number(
          business.summary &&
          business.summary.actionRequired || 0
        ),
        blocked: Number(
          business.summary && business.summary.blocked || 0
        )
      },
      financeCashFlow: {
        records: Number(
          finance.summary && finance.summary.recordCount || 0
        ),
        scalingGate:
          finance.readiness &&
          finance.readiness.scalingGate ||
          'Review Required'
      },
      turoFleet: {
        vehicles: Number(
          turo.summary && turo.summary.trackedVehicles || 0
        ),
        financiallyReady: Number(
          turo.summary && turo.summary.financiallyReady || 0
        )
      },
      realEstate: {
        markets: Number(
          realEstate.summary &&
          realEstate.summary.trackedMarkets || 0
        ),
        financiallyReady: Number(
          realEstate.summary &&
          realEstate.summary.financiallyReady || 0
        )
      },
      tradingResearch: {
        assets: Number(
          trading.summary &&
          trading.summary.trackedAssets || 0
        ),
        financiallyReady: Number(
          trading.summary &&
          trading.summary.financiallyReady || 0
        ),
        executionEnabled: Number(
          trading.summary &&
          trading.summary.executionEnabled || 0
        )
      },
      growthExpansion: {
        initiatives: Number(
          growth.summary &&
          growth.summary.trackedInitiatives || 0
        ),
        launchReady: Number(
          growth.summary &&
          growth.summary.launchReady || 0
        )
      }
    },
    safety: {
      readOnly: true,
      allModuleSafetyVerified: moduleSafety,
      airtableWritesRequested: 0,
      airtableRecordsChanged: 0,
      filesCreated: 0,
      messagesSent: 0,
      applicationsSubmitted: 0,
      contractsAuthorized: 0,
      purchasesAuthorized: 0,
      paymentsAuthorized: 0,
      paperOrdersSubmitted: 0,
      liveOrdersSubmitted: 0,
      businessesLaunched: 0
    }
  };

  console.log(
    'COMMAND CENTER PRODUCTION HEALTH: ' +
    JSON.stringify(report)
  );

  return report;
}
