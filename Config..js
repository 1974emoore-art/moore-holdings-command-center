/**
 * ============================================================
 * Moore Holdings AI Command Center
 * Shared Engine
 * Config.gs
 * Version: 1.0
 * ============================================================
 *
 * Purpose:
 * Central configuration for the Shared Engine.
 *
 * NOTE:
 * Stage 2 only establishes the foundation.
 * No existing Credit Module code is modified.
 *
 * ============================================================
 */
const SHARED_ENGINE_CONFIG = {
  VERSION: "1.0",
  NAME: "Moore Holdings AI Command Center",
  ENVIRONMENT: "Production"
};
function getSharedConfig_() {
  const properties = PropertiesService.getScriptProperties();

  const config = {
    token: properties.getProperty('AIRTABLE_TOKEN'),
    baseId: properties.getProperty('AIRTABLE_BASE_ID'),
    personalTableId: properties.getProperty('AIRTABLE_TABLE_ID'),
    businessTableId: properties.getProperty('AIRTABLE_BUSINESS_TABLE_ID')
  };

  if (
    !config.token ||
    !config.baseId ||
    !config.personalTableId ||
    !config.businessTableId
  ) {
    throw new Error(
      'One or more required Script Properties are missing.'
    );
  }

  return config;
}