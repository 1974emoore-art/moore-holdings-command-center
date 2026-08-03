/**
 * Release 2 governed internal task adapter.
 *
 * Extends the deny-by-default executor registry with CREATE_TASK.
 * Execution remains available only through executeApprovedGovernedAction(),
 * which enforces fresh CEO approval, expiration, idempotency, verification,
 * and audit recording before this adapter can run.
 */
function getGovernedActionExecutorRegistry_() {
  return {
    AIRTABLE_RECORD_UPDATE: executeGovernedAirtableRecordUpdate_,
    CREATE_CALENDAR_EVENT: executeGovernedCalendarEvent_,
    SEND_EXTERNAL_MESSAGE: executeGovernedGmailMessage_,
    CREATE_DOCUMENT: executeGovernedDriveDocument_,
    CREATE_TASK: executeGovernedInternalTask_
  };
}

function executeGovernedInternalTask_(action) {
  const payload = action && action.payload ? action.payload : {};
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const module = String(payload.module || action.module || '').trim();
  const priority = normalizeGovernedTaskPriority_(payload.priority || 'NORMAL');
  const dueAt = normalizeGovernedTaskDueAt_(payload.dueAt || '');
  const owner = String(payload.owner || 'Ernest Moore Jr.').trim();

  if (!title) throw new Error('Task creation requires title.');
  if (!module) throw new Error('Task creation requires module.');

  const taskId = 'MHC-TASK-' + String(action.actionId || Utilities.getUuid());
  const now = new Date().toISOString();
  const task = {
    taskId: taskId,
    actionId: String(action.actionId || ''),
    title: title,
    description: description,
    module: module,
    priority: priority,
    status: 'OPEN',
    dueAt: dueAt,
    owner: owner,
    createdAt: now,
    updatedAt: now
  };

  const propertyKey = 'MHC_EXECUTIVE_TASK_' + taskId;
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(propertyKey, JSON.stringify(task));

  const stored = properties.getProperty(propertyKey);
  if (!stored) {
    throw new Error('Task read-back verification failed; recovery review required.');
  }

  const verifiedTask = JSON.parse(stored);
  const verified =
    verifiedTask.taskId === task.taskId &&
    verifiedTask.title === task.title &&
    verifiedTask.module === task.module &&
    verifiedTask.priority === task.priority &&
    verifiedTask.status === 'OPEN' &&
    verifiedTask.dueAt === task.dueAt;

  if (!verified) {
    throw new Error('Task values did not match the approved preview.');
  }

  return {
    completed: true,
    verified: true,
    result: {
      taskId: taskId,
      title: title,
      module: module,
      priority: priority,
      status: 'OPEN',
      dueAt: dueAt
    },
    sideEffects: {
      airtableRecordsChanged: 0,
      messagesSent: 0,
      filesCreated: 0,
      calendarEventsCreated: 0,
      internalTasksCreated: 1,
      paymentsAuthorized: 0
    },
    evidence: {
      propertyKey: propertyKey,
      taskId: verifiedTask.taskId,
      title: verifiedTask.title,
      module: verifiedTask.module,
      priority: verifiedTask.priority,
      status: verifiedTask.status,
      dueAt: verifiedTask.dueAt,
      readBackVerified: true
    }
  };
}

function normalizeGovernedTaskPriority_(value) {
  const priority = String(value || '').trim().toUpperCase();
  const allowed = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];
  if (allowed.indexOf(priority) === -1) {
    throw new Error('Task priority must be CRITICAL, HIGH, NORMAL, or LOW.');
  }
  return priority;
}

function normalizeGovernedTaskDueAt_(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error('Task dueAt must be a valid date-time.');
  }
  return parsed.toISOString();
}
