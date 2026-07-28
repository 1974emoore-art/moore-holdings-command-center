/**
 * ============================================================
 * Moore Holdings AI Command Center
 * Shared Engine
 * Logging.gs
 * Version: 1.0
 * ============================================================
 *
 * Purpose:
 * Central logging services for all Command Center modules.
 *
 * NOTE:
 * Stage 2 only establishes the foundation.
 * No existing Credit Module code is modified.
 *
 * ============================================================
 */
function logInfo(message) {
  Logger.log("[INFO] " + message);
}

function logWarning(message) {
  Logger.log("[WARNING] " + message);
}

function logError(message) {
  Logger.log("[ERROR] " + message);
}