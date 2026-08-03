'use strict';

const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('ZZZZZZZZZZZZZZZZ_GovernedDriveDocumentAdapter.js', 'utf8');
[
  'CREATE_DOCUMENT: executeGovernedDriveDocument_',
  'DocumentApp.create',
  'DocumentApp.openById',
  'DriveApp.getFileById',
  'DriveApp.createFile',
  'documentReadBackVerified: true',
  'pdfReadBackVerified',
  'filesCreated: pdfFile ? 2 : 1'
].forEach((expected) => {
  if (!source.includes(expected)) throw new Error(`Missing governed Drive control: ${expected}`);
});

let storedBody = '';
const folder = { getId: () => 'folder-123' };
const documentFile = {
  getId: () => 'doc-123',
  getName: () => 'Executive report',
  moveTo: () => {},
  getAs: () => ({ setName: () => ({}) })
};
const pdfFile = {
  getId: () => 'pdf-123',
  getName: () => 'Executive report.pdf',
  moveTo: () => {}
};
const sandbox = {
  MimeType: { PDF: 'application/pdf' },
  DocumentApp: {
    create: () => ({
      getId: () => 'doc-123',
      getBody: () => ({ setText: (value) => { storedBody = value; } }),
      saveAndClose: () => {}
    }),
    openById: () => ({ getBody: () => ({ getText: () => storedBody }) })
  },
  DriveApp: {
    getFileById: (id) => id === 'pdf-123' ? pdfFile : documentFile,
    getFolderById: () => folder,
    createFile: () => pdfFile
  },
  executeGovernedAirtableRecordUpdate_: function () {},
  executeGovernedCalendarEvent_: function () {},
  executeGovernedGmailMessage_: function () {}
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const result = sandbox.executeGovernedDriveDocument_({
  payload: {
    title: 'Executive report',
    body: 'Verified Command Center report.',
    folderId: 'folder-123',
    createPdf: true
  }
});
if (!result.completed || !result.verified) throw new Error('Adapter did not verify completion.');
if (result.sideEffects.filesCreated !== 2) throw new Error('File side-effect count incorrect.');
if (!result.evidence.documentReadBackVerified || !result.evidence.pdfReadBackVerified) {
  throw new Error('Drive read-back evidence missing.');
}
if (sandbox.getGovernedActionExecutorRegistry_().CREATE_DOCUMENT !== sandbox.executeGovernedDriveDocument_) {
  throw new Error('Drive document adapter not registered.');
}
console.log('Governed Drive document adapter validation passed.');
