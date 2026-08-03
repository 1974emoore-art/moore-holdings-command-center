/**
 * Release 2 governed Google Drive document adapter.
 *
 * Extends the deny-by-default executor registry with CREATE_DOCUMENT.
 * Execution remains available only through executeApprovedGovernedAction(),
 * which enforces fresh CEO approval, expiration, idempotency, verification,
 * and audit recording before this adapter can run.
 */
function getGovernedActionExecutorRegistry_() {
  return {
    AIRTABLE_RECORD_UPDATE: executeGovernedAirtableRecordUpdate_,
    CREATE_CALENDAR_EVENT: executeGovernedCalendarEvent_,
    SEND_EXTERNAL_MESSAGE: executeGovernedGmailMessage_,
    CREATE_DOCUMENT: executeGovernedDriveDocument_
  };
}

function executeGovernedDriveDocument_(action) {
  const payload = action && action.payload ? action.payload : {};
  const title = String(payload.title || '').trim();
  const body = String(payload.body || '');
  const folderId = String(payload.folderId || '').trim();
  const createPdf = payload.createPdf === true;

  if (!title) throw new Error('Document creation requires title.');
  if (!body.trim()) throw new Error('Document creation requires body.');

  const document = DocumentApp.create(title);
  const documentId = document && document.getId ? document.getId() : '';
  if (!documentId) throw new Error('Document creation returned no file identifier.');

  document.getBody().setText(body);
  document.saveAndClose();

  const documentFile = DriveApp.getFileById(documentId);
  if (!documentFile) {
    throw new Error('Drive document read-back verification failed; recovery review required.');
  }

  let targetFolder = null;
  if (folderId) {
    targetFolder = DriveApp.getFolderById(folderId);
    if (!targetFolder) throw new Error('Governed Drive target folder was not found.');
    documentFile.moveTo(targetFolder);
  }

  const verifiedDocument = DocumentApp.openById(documentId);
  const verifiedBody = verifiedDocument.getBody().getText();
  const documentVerified =
    documentFile.getName() === title &&
    verifiedBody === body;

  if (!documentVerified) {
    throw new Error('Drive document values did not match the approved preview.');
  }

  let pdfFile = null;
  if (createPdf) {
    const pdfBlob = documentFile.getAs(MimeType.PDF).setName(title + '.pdf');
    pdfFile = DriveApp.createFile(pdfBlob);
    if (targetFolder) pdfFile.moveTo(targetFolder);
    if (!pdfFile || !pdfFile.getId()) {
      throw new Error('PDF creation returned no file identifier.');
    }
    const verifiedPdf = DriveApp.getFileById(pdfFile.getId());
    if (!verifiedPdf || verifiedPdf.getName() !== title + '.pdf') {
      throw new Error('PDF read-back verification failed; recovery review required.');
    }
  }

  return {
    completed: true,
    verified: true,
    result: {
      documentId: documentId,
      documentName: documentFile.getName(),
      folderId: folderId || 'root',
      pdfId: pdfFile ? pdfFile.getId() : null,
      pdfCreated: Boolean(pdfFile)
    },
    sideEffects: {
      airtableRecordsChanged: 0,
      messagesSent: 0,
      filesCreated: pdfFile ? 2 : 1,
      calendarEventsCreated: 0,
      paymentsAuthorized: 0
    },
    evidence: {
      documentId: documentId,
      documentName: documentFile.getName(),
      bodyLength: verifiedBody.length,
      documentReadBackVerified: true,
      pdfId: pdfFile ? pdfFile.getId() : null,
      pdfReadBackVerified: pdfFile ? true : false,
      folderId: folderId || 'root'
    }
  };
}
