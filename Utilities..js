/**
 * ============================================================
 * Moore Holdings AI Command Center
 * Shared Engine
 * Utilities.gs
 * Version: 1.0
 * ============================================================
 *
 * Purpose:
 * Shared utility functions used across all Command Center modules.
 *
 * NOTE:
 * Stage 2 only establishes the foundation.
 * No existing Credit Module code is modified.
 *
 * ============================================================
 */
function isBlank(value) {
  return value === null || value === undefined || value === "";
}

function safeTrim(value) {
  return String(value || "").trim();
}

function timestamp() {
  return new Date().toISOString();
}

function normalizeSharedText_(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getSharedLastFour_(value) {
  if (isBlank(value)) {
    return '';
  }

  const digits =
    String(value).replace(/\D/g, '');

  if (digits.length < 4) {
    return '';
  }

  return digits.slice(-4);
}

function uniqueSharedValues_(values) {
  return values.filter(
    function(value, index, array) {
      return array.indexOf(value) === index;
    }
  );
}