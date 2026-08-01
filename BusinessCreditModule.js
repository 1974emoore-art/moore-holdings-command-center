/**
 * MOORE HOLDINGS AI COMMAND CENTER — BUSINESS CREDIT CORE
 *
 * Reads the existing Airtable Business Credit table and converts its
 * operational controls into one executive readiness and action summary.
 *
 * READ-ONLY:
 * - does not create or update Airtable records
 * - does not submit vendor or financing applications
 * - does not authorize purchases, credit pulls, or payments
 */

function scanBusinessCredit() {
  const config = getSharedConfig_();
  const records = getSharedAirtableRecords_(
    config.baseId,
    config.businessTableId,
    config.token
  );

  const result = analyzeBusinessCredit_(records);

  console.log(
    'BUSINESS CREDIT LIVE AGGREGATE: ' +
    JSON.stringify({
      generatedAt: result.generatedAt,
      module: result.module,
      recordCount: result.recordCount,
      readiness: result.readiness,
      summary: result.summary,
      safety: result.safety
    })
  );

  return result;
}

function analyzeBusinessCredit_(records) {
  records = Array.isArray(records) ? records : [];

  const items = records.map(function(record) {
    return normalizeBusinessCreditItem_(record);
  });

  const actionRequired = [];
  const monitoring = [];
  const complete = [];
  const blocked = [];

  items.forEach(function(item) {
    if (
      item.financingGate === 'Blocked' ||
      item.operationalClassification === 'Do Not Apply'
    ) {
      blocked.push(item);
      return;
    }

    if (
      item.operationalClassification === 'Action Required' ||
      item.approvalRequired === true
    ) {
      actionRequired.push(item);
      return;
    }

    if (
      item.operationalClassification === 'Waiting' ||
      item.financingGate === 'Monitor'
    ) {
      monitoring.push(item);
      return;
    }

    if (
      item.operationalClassification === 'Complete' ||
      item.operationalClassification === 'Active'
    ) {
      complete.push(item);
      return;
    }

    monitoring.push(item);
  });

  const readinessScores = items
    .map(function(item) {
      return item.businessReadinessScore;
    })
    .filter(function(score) {
      return typeof score === 'number' && !isNaN(score);
    });

  const averageReadiness = readinessScores.length
    ? Math.round(
        readinessScores.reduce(function(total, score) {
          return total + score;
        }, 0) / readinessScores.length
      )
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    module: 'Business Credit',
    recordCount: items.length,
    readiness: {
      averageScore: averageReadiness,
      reportingVerifiedCount: items.filter(function(item) {
        return item.reportingVerified;
      }).length,
      clearFinancingGateCount: items.filter(function(item) {
        return item.financingGate === 'Clear';
      }).length,
      monitoredCount: monitoring.length,
      blockedCount: blocked.length
    },
    summary: {
      complete: complete.length,
      actionRequired: actionRequired.length,
      monitoring: monitoring.length,
      blocked: blocked.length
    },
    actionRequired: sortBusinessCreditItems_(actionRequired),
    monitoring: sortBusinessCreditItems_(monitoring),
    blocked: sortBusinessCreditItems_(blocked),
    complete: sortBusinessCreditItems_(complete),
    executiveNextActions: buildBusinessCreditNextActions_(
      actionRequired,
      monitoring,
      blocked
    ),
    safety: {
      readOnly: true,
      airtableWritesRequested: 0,
      airtableRecordsChanged: 0,
      vendorApplicationsSubmitted: 0,
      financingApplicationsSubmitted: 0,
      purchasesAuthorized: 0,
      paymentsAuthorized: 0
    }
  };
}

function normalizeBusinessCreditItem_(record) {
  const fields = record && record.fields ? record.fields : {};

  return {
    recordId: record && record.id ? record.id : '',
    creditItem: String(fields['Credit Item'] || 'Unnamed item').trim(),
    status: String(fields['Status'] || '').trim(),
    bureauReporting: String(fields['Bureau Reporting'] || '').trim(),
    actionNeeded: String(fields['Action Needed'] || '').trim(),
    agentAction: String(fields['Agent Action'] || '').trim(),
    operationalClassification: String(
      fields['Operational Classification'] || ''
    ).trim(),
    approvalRequired: fields['Approval Required'] === true,
    approvalReason: String(fields['Approval Reason'] || '').trim(),
    reportingVerified: fields['Reporting Verified'] === true,
    financingGate: String(fields['Financing Gate'] || '').trim(),
    businessReadinessScore: normalizeBusinessReadinessScore_(
      fields['Business Readiness Score']
    ),
    notes: String(fields['Notes'] || '').trim()
  };
}

function normalizeBusinessReadinessScore_(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const score = Number(value);
  return isNaN(score) ? null : Math.max(0, Math.min(100, score));
}

function sortBusinessCreditItems_(items) {
  return items.slice().sort(function(a, b) {
    const scoreA = a.businessReadinessScore === null
      ? -1
      : a.businessReadinessScore;
    const scoreB = b.businessReadinessScore === null
      ? -1
      : b.businessReadinessScore;

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    return a.creditItem.localeCompare(b.creditItem);
  });
}

function buildBusinessCreditNextActions_(
  actionRequired,
  monitoring,
  blocked
) {
  const actions = [];

  actionRequired.forEach(function(item) {
    actions.push({
      priority: 'High',
      creditItem: item.creditItem,
      action: item.agentAction || item.actionNeeded || 'Review required',
      approvalRequired: item.approvalRequired,
      reason: item.approvalReason || item.notes || ''
    });
  });

  monitoring.forEach(function(item) {
    actions.push({
      priority: 'Medium',
      creditItem: item.creditItem,
      action: item.agentAction || item.actionNeeded || 'Monitor reporting',
      approvalRequired: false,
      reason: item.notes || ''
    });
  });

  blocked.forEach(function(item) {
    actions.push({
      priority: 'Hold',
      creditItem: item.creditItem,
      action: 'Do not apply',
      approvalRequired: true,
      reason:
        item.approvalReason ||
        'Financing gate is blocked until existing reporting is verified.'
    });
  });

  return actions;
}

function testBusinessCreditCore() {
  const sampleRecords = [
    {
      id: 'rec-duns',
      fields: {
        'Credit Item': 'D-U-N-S Number Established',
        'Operational Classification': 'Complete',
        'Reporting Verified': true,
        'Financing Gate': 'Clear',
        'Business Readiness Score': 100
      }
    },
    {
      id: 'rec-nav',
      fields: {
        'Credit Item': 'NAV Prime',
        'Operational Classification': 'Active',
        'Reporting Verified': true,
        'Financing Gate': 'Clear',
        'Business Readiness Score': 90
      }
    },
    {
      id: 'rec-grainger',
      fields: {
        'Credit Item': 'Grainger Vendor Account',
        'Operational Classification': 'Action Required',
        'Approval Required': true,
        'Financing Gate': 'Monitor',
        'Business Readiness Score': 65,
        'Agent Action': 'Wait'
      }
    },
    {
      id: 'rec-crown',
      fields: {
        'Credit Item': 'Crown Office Supplies',
        'Operational Classification': 'Do Not Apply',
        'Approval Required': true,
        'Financing Gate': 'Blocked',
        'Business Readiness Score': 35
      }
    }
  ];

  const result = analyzeBusinessCredit_(sampleRecords);

  if (result.recordCount !== 4) {
    throw new Error('Business Credit record count is incorrect.');
  }

  if (result.summary.complete !== 2) {
    throw new Error('Business Credit completed count is incorrect.');
  }

  if (result.summary.actionRequired !== 1) {
    throw new Error('Business Credit action-required count is incorrect.');
  }

  if (result.summary.blocked !== 1) {
    throw new Error('Business Credit blocked count is incorrect.');
  }

  if (result.safety.airtableRecordsChanged !== 0) {
    throw new Error('Business Credit core must remain read-only.');
  }

  console.log(
    'BUSINESS CREDIT CORE TEST PASSED: ' +
    JSON.stringify(result.summary)
  );

  return result;
}
