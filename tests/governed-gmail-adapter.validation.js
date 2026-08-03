'use strict';

const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('ZZZZZZZZZZZZZZZ_GovernedGmailAdapter.js', 'utf8');
[
  'SEND_EXTERNAL_MESSAGE: executeGovernedGmailMessage_',
  'GmailApp.sendEmail',
  'GmailApp.search',
  'messagesSent: 1',
  'sentCopyVerified: true',
  'verificationToken'
].forEach((expected) => {
  if (!source.includes(expected)) throw new Error(`Missing governed Gmail control: ${expected}`);
});

let sent = null;
const thread = { getId: () => 'thread-123' };
const message = {
  getId: () => 'message-123',
  getThread: () => thread,
  getTo: () => sent.to,
  getSubject: () => sent.subject,
  getPlainBody: () => sent.body
};
const sandbox = {
  Utilities: { getUuid: () => 'uuid-123' },
  GmailApp: {
    sendEmail: (to, subject, body, options) => { sent = { to, subject, body, options }; },
    search: () => [{ getMessages: () => [message] }]
  },
  executeGovernedAirtableRecordUpdate_: function () {},
  executeGovernedCalendarEvent_: function () {}
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const result = sandbox.executeGovernedGmailMessage_({
  actionId: 'action-123',
  payload: { to: 'recipient@example.com', subject: 'Executive review', body: 'Approved message.' }
});
if (!result.completed || !result.verified) throw new Error('Adapter did not verify completion.');
if (result.sideEffects.messagesSent !== 1) throw new Error('Message side effect count incorrect.');
if (!result.evidence.sentCopyVerified) throw new Error('Sent-copy evidence missing.');
if (sandbox.getGovernedActionExecutorRegistry_().SEND_EXTERNAL_MESSAGE !== sandbox.executeGovernedGmailMessage_) {
  throw new Error('Gmail adapter not registered.');
}
console.log('Governed Gmail adapter validation passed.');
