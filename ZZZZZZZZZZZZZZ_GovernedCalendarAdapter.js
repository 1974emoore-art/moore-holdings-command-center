/**
 * Release 2 governed Google Calendar adapter.
 *
 * Extends the deny-by-default executor registry with CREATE_CALENDAR_EVENT.
 * Execution remains available only through executeApprovedGovernedAction(),
 * which enforces fresh CEO approval, expiration, idempotency, verification,
 * and audit recording before this adapter can run.
 */
function getGovernedActionExecutorRegistry_() {
  return {
    AIRTABLE_RECORD_UPDATE: executeGovernedAirtableRecordUpdate_,
    CREATE_CALENDAR_EVENT: executeGovernedCalendarEvent_
  };
}

function executeGovernedCalendarEvent_(action) {
  const payload = action && action.payload ? action.payload : {};
  const title = String(payload.title || '').trim();
  const startTime = parseGovernedCalendarDate_(payload.startTime, 'startTime');
  const endTime = parseGovernedCalendarDate_(payload.endTime, 'endTime');
  const calendarId = String(payload.calendarId || '').trim();
  const description = String(payload.description || '').trim();
  const location = String(payload.location || '').trim();

  if (!title) {
    throw new Error('Calendar event requires title.');
  }
  if (endTime.getTime() <= startTime.getTime()) {
    throw new Error('Calendar event endTime must be after startTime.');
  }

  const calendar = calendarId
    ? CalendarApp.getCalendarById(calendarId)
    : CalendarApp.getDefaultCalendar();

  if (!calendar) {
    throw new Error('Governed Calendar target was not found.');
  }

  const event = calendar.createEvent(title, startTime, endTime, {
    description: description,
    location: location
  });
  const eventId = event && event.getId ? event.getId() : '';

  if (!eventId) {
    throw new Error('Calendar event creation returned no event identifier.');
  }

  const verifiedEvent = calendar.getEventById(eventId);
  if (!verifiedEvent) {
    throw new Error('Calendar read-back verification failed; recovery review required.');
  }

  const verified =
    verifiedEvent.getTitle() === title &&
    verifiedEvent.getStartTime().getTime() === startTime.getTime() &&
    verifiedEvent.getEndTime().getTime() === endTime.getTime();

  if (!verified) {
    throw new Error('Calendar event values did not match the approved preview.');
  }

  return {
    completed: true,
    verified: true,
    result: {
      eventId: eventId,
      calendarId: calendarId || 'primary',
      title: title,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    },
    sideEffects: {
      airtableRecordsChanged: 0,
      messagesSent: 0,
      filesCreated: 0,
      calendarEventsCreated: 1,
      paymentsAuthorized: 0
    },
    evidence: {
      eventId: eventId,
      title: verifiedEvent.getTitle(),
      startTime: verifiedEvent.getStartTime().toISOString(),
      endTime: verifiedEvent.getEndTime().toISOString(),
      calendarId: calendarId || 'primary',
      readBackVerified: true
    }
  };
}

function parseGovernedCalendarDate_(value, fieldName) {
  const parsed = new Date(String(value || ''));
  if (!value || !Number.isFinite(parsed.getTime())) {
    throw new Error('Calendar event requires a valid ' + fieldName + '.');
  }
  return parsed;
}
