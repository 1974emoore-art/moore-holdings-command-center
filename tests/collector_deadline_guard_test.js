function testCollectorDeadlineGuardMissingDeadlineBlocks() {
  const result = buildCollectorDeadlineGuard({}, '2026-07-31');

  if (result.status !== 'BLOCKED_MISSING_DEADLINE') {
    throw new Error('Missing deadlines must be blocked.');
  }
  if (!result.readOnly || result.airtableRecordsChanged !== 0) {
    throw new Error('Deadline guard must remain read-only.');
  }
}

function testCollectorDeadlineGuardClassifiesUrgentWindow() {
  const result = buildCollectorDeadlineGuard(
    { deadline: '2026-08-05' },
    '2026-07-31'
  );

  if (result.daysRemaining !== 5 || result.status !== 'URGENT') {
    throw new Error('Five remaining days must be classified as urgent.');
  }
}

function testCollectorDeadlineGuardClassifiesAttentionWindow() {
  const result = buildCollectorDeadlineGuard(
    { deadline: '2026-08-20' },
    '2026-07-31'
  );

  if (result.daysRemaining !== 20 || result.status !== 'ATTENTION') {
    throw new Error('Twenty remaining days must be classified as attention.');
  }
}

function testCollectorDeadlineGuardRejectsImpossibleDate() {
  const result = buildCollectorDeadlineGuard(
    { deadline: '2026-02-30' },
    '2026-01-01'
  );

  if (result.status !== 'BLOCKED_MISSING_DEADLINE') {
    throw new Error('Impossible calendar dates must be rejected.');
  }
}

function testCollectorDeadlineGuardNeverAuthorizesActions() {
  const result = buildCollectorDeadlineGuard(
    { deadline: '2026-09-04' },
    '2026-07-31'
  );

  if (
    result.messagesSent !== 0 ||
    result.paymentsAuthorized !== 0 ||
    result.airtableRecordsChanged !== 0
  ) {
    throw new Error('Deadline calculation must not authorize side effects.');
  }
}
