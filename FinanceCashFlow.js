/**
 * FINANCE & CASH FLOW CORE
 *
 * Read-only analytics over the governed Airtable Finance Ledger.
 * This module never creates, updates, or deletes Airtable records.
 */
const FINANCE_LEDGER_BASE_ID_ = 'applB86Cw7gjI7YQz';
const FINANCE_LEDGER_TABLE_ID_ = 'tblm18uhaHRpVp5pR';

function scanFinanceCashFlow() {
  const config = getConfig_();
  const records = getAirtableRecords_(
    FINANCE_LEDGER_BASE_ID_,
    FINANCE_LEDGER_TABLE_ID_,
    config.token
  );

  return analyzeFinanceCashFlow_(records);
}

function analyzeFinanceCashFlow_(records) {
  const summary = {
    recordCount: 0,
    clearedIncome: 0,
    clearedExpenses: 0,
    netCashFlow: 0,
    pendingIncome: 0,
    pendingExpenses: 0,
    plannedExpenses: 0,
    approvalRequired: 0,
    blocked: 0,
    incompleteRecords: 0
  };

  const transactions = (records || []).map(function(record) {
    const fields = record && record.fields ? record.fields : {};

    return {
      transaction: fields['Transaction'] || 'Unnamed transaction',
      date: fields['Date'] || '',
      type: fields['Type'] || '',
      category: fields['Category'] || '',
      amount: Number(fields['Amount']) || 0,
      status: fields['Status'] || '',
      division: fields['Division'] || '',
      approvalRequired: fields['Approval Required'] === true,
      governanceGate: fields['Governance Gate'] || '',
      notes: fields['Notes'] || ''
    };
  });

  (records || []).forEach(function(record) {
    const fields = record.fields || {};
    const type = financeText_(fields['Type']);
    const status = financeText_(fields['Status']);
    const gate = financeText_(fields['Governance Gate']);
    const amount = Number(fields['Amount']) || 0;

    summary.recordCount += 1;

    if (
      !fields['Transaction'] ||
      !fields['Date'] ||
      !type ||
      !status ||
      !(Number(fields['Amount']) > 0)
    ) {
      summary.incompleteRecords += 1;
    }

    if (fields['Approval Required'] === true) {
      summary.approvalRequired += 1;
    }

    if (gate === 'blocked') {
      summary.blocked += 1;
    }

    if (status === 'cleared' && type === 'income') {
      summary.clearedIncome += amount;
    }

    if (status === 'cleared' && type === 'expense') {
      summary.clearedExpenses += amount;
    }

    if (status === 'pending' && type === 'income') {
      summary.pendingIncome += amount;
    }

    if (status === 'pending' && type === 'expense') {
      summary.pendingExpenses += amount;
    }

    if (status === 'planned' && type === 'expense') {
      summary.plannedExpenses += amount;
    }
  });

  summary.netCashFlow =
    summary.clearedIncome - summary.clearedExpenses;

  const hasData = summary.recordCount > 0;
  const dataComplete =
    hasData && summary.incompleteRecords === 0;

  let scalingGate = 'Review Required';

  if (summary.blocked > 0 || summary.netCashFlow < 0) {
    scalingGate = 'Blocked';
  } else if (
    dataComplete &&
    summary.approvalRequired === 0
  ) {
    scalingGate = 'Clear';
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: summary,
    transactions: transactions,
    readiness: {
      hasData: hasData,
      dataComplete: dataComplete,
      cashFlowStable:
        hasData && summary.netCashFlow >= 0,
      scalingGate: scalingGate
    },
    safety: {
      readOnly: true,
      airtableWritesRequested: 0,
      airtableRecordsChanged: 0,
      financingApplicationsSubmitted: 0,
      capitalExpendituresAuthorized: 0,
      purchasesAuthorized: 0,
      paymentsAuthorized: 0
    }
  };
}

function financeText_(value) {
  if (
    value &&
    typeof value === 'object' &&
    value.name
  ) {
    value = value.name;
  }

  return String(value || '').trim().toLowerCase();
}

function testFinanceCashFlowCore() {
  const result = analyzeFinanceCashFlow_([
    {
      fields: {
        Transaction: 'Test revenue',
        Date: '2026-08-01',
        Type: 'Income',
        Category: 'Revenue',
        Amount: 1000,
        Status: 'Cleared',
        Division: 'Corporate',
        'Approval Required': false,
        'Governance Gate': 'Clear'
      }
    },
    {
      fields: {
        Transaction: 'Test operating expense',
        Date: '2026-08-01',
        Type: 'Expense',
        Category: 'Operating Expense',
        Amount: 250,
        Status: 'Cleared',
        Division: 'Corporate',
        'Approval Required': false,
        'Governance Gate': 'Clear'
      }
    }
  ]);

  if (
    result.summary.netCashFlow !== 750 ||
    result.readiness.scalingGate !== 'Clear' ||
    result.safety.readOnly !== true
  ) {
    throw new Error(
      'Finance & Cash Flow core validation failed.'
    );
  }

  console.log(
    'FINANCE & CASH FLOW CORE VALIDATION SUCCESSFUL'
  );

  return result;
}
