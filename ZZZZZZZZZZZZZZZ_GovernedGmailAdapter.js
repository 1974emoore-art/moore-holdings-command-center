/**
 * Release 2 governed Gmail adapter.
 *
 * Extends the deny-by-default executor registry with SEND_EXTERNAL_MESSAGE.
 * Execution remains available only through executeApprovedGovernedAction(),
 * which enforces fresh CEO approval, expiration, idempotency, verification,
 * and audit recording before this adapter can run.
 */
function getGovernedActionExecutorRegistry_() {
  return {
    AIRTABLE_RECORD_UPDATE: executeGovernedAirtableRecordUpdate_,
    CREATE_CALENDAR_EVENT: executeGovernedCalendarEvent_,
    SEND_EXTERNAL_MESSAGE: executeGovernedGmailMessage_
  };
}

function executeGovernedGmailMessage_(action) {
  const payload = action && action.payload ? action.payload : {};
  const to = normalizeGovernedEmailAddress_(payload.to, 'to');
  const subject = String(payload.subject || '').trim();
  const body = String(payload.body || '').trim();
  const cc = normalizeGovernedEmailList_(payload.cc || '');
  const bcc = normalizeGovernedEmailList_(payload.bcc || '');

  if (!subject) throw new Error('External message requires subject.');
  if (!body) throw new Error('External message requires body.');

  const verificationToken = 'MHC-' + String(action.actionId || Utilities.getUuid());
  const approvedBody = body + '\n\nCommand Center Verification: ' + verificationToken;
  const options = {};
  if (cc) options.cc = cc;
  if (bcc) options.bcc = bcc;
  if (payload.replyTo) options.replyTo = normalizeGovernedEmailAddress_(payload.replyTo, 'replyTo');
  if (payload.name) options.name = String(payload.name).trim();

  GmailApp.sendEmail(to, subject, approvedBody, options);

  const query = 'in:sent newer_than:1d to:"' + escapeGovernedGmailQuery_(to) + '" subject:"' +
    escapeGovernedGmailQuery_(subject) + '" "' + escapeGovernedGmailQuery_(verificationToken) + '"';
  const threads = GmailApp.search(query, 0, 10);
  let verifiedMessage = null;

  threads.some(function(thread) {
    return thread.getMessages().some(function(message) {
      const recipients = String(message.getTo() || '').toLowerCase();
      const matches =
        recipients.indexOf(to.toLowerCase()) !== -1 &&
        message.getSubject() === subject &&
        String(message.getPlainBody() || '').indexOf(verificationToken) !== -1;
      if (matches) verifiedMessage = message;
      return matches;
    });
  });

  if (!verifiedMessage) {
    throw new Error('Gmail sent-copy verification failed; recovery review required.');
  }

  return {
    completed: true,
    verified: true,
    result: {
      messageId: verifiedMessage.getId(),
      threadId: verifiedMessage.getThread().getId(),
      to: to,
      subject: subject
    },
    sideEffects: {
      airtableRecordsChanged: 0,
      messagesSent: 1,
      filesCreated: 0,
      calendarEventsCreated: 0,
      paymentsAuthorized: 0
    },
    evidence: {
      messageId: verifiedMessage.getId(),
      threadId: verifiedMessage.getThread().getId(),
      to: verifiedMessage.getTo(),
      subject: verifiedMessage.getSubject(),
      verificationToken: verificationToken,
      sentCopyVerified: true
    }
  };
}

function normalizeGovernedEmailAddress_(value, fieldName) {
  const address = String(value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    throw new Error('External message requires a valid ' + fieldName + ' email address.');
  }
  return address;
}

function normalizeGovernedEmailList_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.split(',').map(function(item) {
    return normalizeGovernedEmailAddress_(item, 'recipient');
  }).join(',');
}

function escapeGovernedGmailQuery_(value) {
  return String(value || '').replace(/["\\]/g, ' ');
}
