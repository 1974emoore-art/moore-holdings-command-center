/**
 * COLLECTOR DEADLINE GUARD
 *
 * Read-only planning helper for collector validation notices.
 * It calculates a deadline status without writing to Airtable, sending a
 * response, acknowledging a debt, or authorizing a payment.
 */

const COLLECTOR_DEADLINE_GUARD_VERSION = '1.0.0';
const COLLECTOR_DEADLINE_URGENT_DAYS = 7;
const COLLECTOR_DEADLINE_ATTENTION_DAYS = 30;

function buildCollectorDeadlineGuard(notice, asOfDate) {
  notice = notice || {};

  const deadline = parseCollectorDeadlineDate_(notice.deadline);
  const asOf = parseCollectorDeadlineDate_(asOfDate || new Date());

  if (!deadline) {
    return {
      version: COLLECTOR_DEADLINE_GUARD_VERSION,
      status: 'BLOCKED_MISSING_DEADLINE',
      daysRemaining: null,
      requiresHumanReview: true,
      blockers: ['A valid collector response deadline is required.'],
      readOnly: true,
      airtableRecordsChanged: 0,
      messagesSent: 0,
      paymentsAuthorized: 0
    };
  }

  if (!asOf) {
    throw new Error('A valid as-of date is required.');
  }

  const daysRemaining = Math.round(
    (deadline.getTime() - asOf.getTime()) / 86400000
  );

  return {
    version: COLLECTOR_DEADLINE_GUARD_VERSION,
    noticeType: String(notice.noticeType || 'VALIDATION_NOTICE'),
    deadline: formatCollectorDeadlineDate_(deadline),
    daysRemaining: daysRemaining,
    status: classifyCollectorDeadlineStatus_(daysRemaining),
    requiresHumanReview: true,
    recommendedAction: buildCollectorDeadlineAction_(daysRemaining),
    decisionBoundary:
      'Review evidence and account mapping before any response is drafted or sent.',
    readOnly: true,
    airtableRecordsChanged: 0,
    messagesSent: 0,
    paymentsAuthorized: 0
  };
}

function classifyCollectorDeadlineStatus_(daysRemaining) {
  if (daysRemaining < 0) return 'OVERDUE_REVIEW_REQUIRED';
  if (daysRemaining === 0) return 'DUE_TODAY';
  if (daysRemaining <= COLLECTOR_DEADLINE_URGENT_DAYS) return 'URGENT';
  if (daysRemaining <= COLLECTOR_DEADLINE_ATTENTION_DAYS) return 'ATTENTION';
  return 'MONITOR';
}

function buildCollectorDeadlineAction_(daysRemaining) {
  if (daysRemaining < 0) {
    return 'Escalate for review; do not assume rights or options without verification.';
  }
  if (daysRemaining === 0) {
    return 'Immediate human review required today.';
  }
  if (daysRemaining <= COLLECTOR_DEADLINE_URGENT_DAYS) {
    return 'Complete evidence and account-mapping review immediately.';
  }
  if (daysRemaining <= COLLECTOR_DEADLINE_ATTENTION_DAYS) {
    return 'Schedule evidence and account-mapping review before the urgent window.';
  }
  return 'Keep the deadline visible and preserve the original notice.';
}

function parseCollectorDeadlineDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate()
    ));
  }

  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatCollectorDeadlineDate_(value) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0')
  ].join('-');
}
