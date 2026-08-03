'use strict';

const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('ZZZZZZZZZZZZZZ_GovernedCalendarAdapter.js', 'utf8');
[
  'CREATE_CALENDAR_EVENT: executeGovernedCalendarEvent_',
  'CalendarApp.getCalendarById',
  'CalendarApp.getDefaultCalendar',
  'calendar.createEvent',
  'calendar.getEventById',
  'calendarEventsCreated: 1',
  'readBackVerified: true',
  'endTime must be after startTime'
].forEach((expected) => {
  if (!source.includes(expected)) {
    throw new Error(`Missing governed Calendar control: ${expected}`);
  }
});

let created = null;
const storedEvent = {
  getId: () => 'event-123',
  getTitle: () => created.title,
  getStartTime: () => created.start,
  getEndTime: () => created.end
};
const calendar = {
  createEvent: (title, start, end, options) => {
    created = { title, start, end, options };
    return storedEvent;
  },
  getEventById: (id) => (id === 'event-123' ? storedEvent : null)
};
const sandbox = {
  CalendarApp: {
    getDefaultCalendar: () => calendar,
    getCalendarById: () => calendar
  },
  executeGovernedAirtableRecordUpdate_: function () {}
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const action = {
  payload: {
    title: 'Executive review',
    startTime: '2026-08-04T15:00:00.000Z',
    endTime: '2026-08-04T15:30:00.000Z',
    description: 'Review governed actions',
    location: 'Command Center'
  }
};
const result = sandbox.executeGovernedCalendarEvent_(action);
if (!result.completed || !result.verified) throw new Error('Adapter did not verify completion.');
if (result.sideEffects.calendarEventsCreated !== 1) throw new Error('Calendar side effect count incorrect.');
if (!result.evidence.readBackVerified) throw new Error('Read-back evidence missing.');
if (sandbox.getGovernedActionExecutorRegistry_().CREATE_CALENDAR_EVENT !== sandbox.executeGovernedCalendarEvent_) {
  throw new Error('Calendar adapter not registered.');
}

console.log('Governed Calendar adapter validation passed.');
