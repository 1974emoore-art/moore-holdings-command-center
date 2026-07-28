
function getConfig_() {
  const properties =
    PropertiesService.getScriptProperties();

  const config = {
    token:
      properties.getProperty(
        'AIRTABLE_TOKEN'
      ),
    baseId:
      properties.getProperty(
        'AIRTABLE_BASE_ID'
      ),
    personalTableId:
      properties.getProperty(
        'AIRTABLE_TABLE_ID'
      ),
    businessTableId:
      properties.getProperty(
        'AIRTABLE_BUSINESS_TABLE_ID'
      )
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