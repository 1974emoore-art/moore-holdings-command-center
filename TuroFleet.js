/**
 * TURO FLEET CORE
 *
 * Read-only fleet and acquisition-readiness analytics.
 * Vehicle acquisition remains governed by Finance & Cash Flow.
 */
const TURO_FLEET_BASE_ID_ = 'applB86Cw7gjI7YQz';
const TURO_FLEET_TABLE_ID_ = 'tbluMzhvEKV5bQ6qi';

function scanTuroFleet() {
  const config = getConfig_();
  const records = getAirtableRecords_(
    TURO_FLEET_BASE_ID_,
    TURO_FLEET_TABLE_ID_,
    config.token
  );

  return analyzeTuroFleet_(
    records,
    scanFinanceCashFlow()
  );
}

function analyzeTuroFleet_(records, financeResult) {
  const summary = {
    trackedVehicles: 0,
    research: 0,
    planned: 0,
    financingReview: 0,
    active: 0,
    maintenance: 0,
    approvalRequired: 0,
    clearVehicleGates: 0,
    incompleteFinancialPlans: 0,
    activeMonthlyRevenue: 0,
    activeMonthlyCosts: 0,
    activeMonthlyNet: 0
  };

  const targets = [];

  (records || []).forEach(function(record) {
    const fields = record.fields || {};
    const status = turoText_(fields['Status']);
    const vehicleGate = turoText_(fields['Finance Gate']);
    const payment = Number(fields['Monthly Payment']) || 0;
    const revenue = Number(fields['Monthly Revenue']) || 0;
    const expenses = Number(fields['Monthly Expenses']) || 0;

    summary.trackedVehicles += 1;

    if (status === 'research') summary.research += 1;
    if (status === 'planned') summary.planned += 1;
    if (status === 'financing review') {
      summary.financingReview += 1;
    }
    if (status === 'active') summary.active += 1;
    if (status === 'maintenance') summary.maintenance += 1;

    if (fields['Approval Required'] === true) {
      summary.approvalRequired += 1;
    }

    if (vehicleGate === 'clear') {
      summary.clearVehicleGates += 1;
    }

    if (
      status !== 'research' &&
      (
        !(Number(fields['Purchase Price']) > 0) ||
        !(Number(fields['Monthly Revenue']) >= 0) ||
        !(Number(fields['Monthly Expenses']) >= 0)
      )
    ) {
      summary.incompleteFinancialPlans += 1;
    }

    if (status === 'active') {
      summary.activeMonthlyRevenue += revenue;
      summary.activeMonthlyCosts += payment + expenses;
    }

    targets.push({
      vehicle: fields['Vehicle'] || 'Unnamed vehicle',
      status: fields['Status'] || 'Research',
      financeGate:
        fields['Finance Gate'] || 'Review Required',
      approvalRequired:
        fields['Approval Required'] === true
    });
  });

  summary.activeMonthlyNet =
    summary.activeMonthlyRevenue -
    summary.activeMonthlyCosts;

  const financeReadiness =
    financeResult && financeResult.readiness
      ? financeResult.readiness
      : {};

  const financeGate =
    financeReadiness.scalingGate ||
    'Review Required';

  let acquisitionGate = 'Review Required';

  if (financeGate === 'Blocked') {
    acquisitionGate = 'Blocked';
  } else if (
    financeGate === 'Clear' &&
    summary.incompleteFinancialPlans === 0 &&
    summary.approvalRequired === 0
  ) {
    acquisitionGate = 'Clear';
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: summary,
    targets: targets,
    readiness: {
      financeGate: financeGate,
      acquisitionGate: acquisitionGate,
      acquisitionAuthorized: false
    },
    safety: {
      readOnly: true,
      airtableWritesRequested: 0,
      airtableRecordsChanged: 0,
      vehiclePurchasesAuthorized: 0,
      financingApplicationsSubmitted: 0,
      depositsAuthorized: 0,
      paymentsAuthorized: 0
    }
  };
}

function turoText_(value) {
  if (
    value &&
    typeof value === 'object' &&
    value.name
  ) {
    value = value.name;
  }

  return String(value || '').trim().toLowerCase();
}

function testTuroFleetCore() {
  const result = analyzeTuroFleet_(
    [
      {
        fields: {
          Vehicle: '2025 Toyota Corolla',
          Status: 'Research',
          Year: 2025,
          Make: 'Toyota',
          Model: 'Corolla',
          'Finance Gate': 'Review Required',
          'Approval Required': true
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
    result.summary.trackedVehicles !== 1 ||
    result.readiness.acquisitionGate !==
      'Review Required' ||
    result.readiness.acquisitionAuthorized !== false ||
    result.safety.readOnly !== true
  ) {
    throw new Error('Turo Fleet core validation failed.');
  }

  console.log('TURO FLEET CORE VALIDATION SUCCESSFUL');
  return result;
}
