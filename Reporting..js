/**
 * ============================================================
 * Moore Holdings AI Command Center
 * Shared Engine
 * Reporting.gs
 * Version: 1.0
 * ============================================================
 *
 * Purpose:
 * Central reporting services used by all Command Center modules.
 *
 * NOTE:
 * Stage 2 only establishes the foundation.
 * No existing Credit Module code is modified.
 *
 * ============================================================
 */
function createReport(title, data) {
  return {
    title: title,
    createdAt: timestamp(),
    data: data
  };
}