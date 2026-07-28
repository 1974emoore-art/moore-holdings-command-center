/**
 * ============================================================
 * Moore Holdings AI Command Center
 * Shared Engine
 * Airtable.gs
 * Version: 1.0
 * ============================================================
 *
 * Purpose:
 * Central Airtable services used by all Command Center modules.
 *
 * NOTE:
 * Stage 2 only establishes the foundation.
 * No existing Credit Module code is modified.
 *
 * ============================================================
 */

function getAirtableConfig() {
  return {
    baseId: "",
    personalCreditTable: "",
    businessCreditTable: "",
    apiKeyProperty: "AIRTABLE_API_KEY"
  };
}

function getSharedAirtableRecords_(
  baseId,
  tableId,
  token
) {
  let records = [];
  let offset = '';

  do {
    let url =
      'https://api.airtable.com/v0/' +
      baseId +
      '/' +
      tableId +
      '?pageSize=100';

    if (offset) {
      url +=
        '&offset=' +
        encodeURIComponent(offset);
    }

    const response = UrlFetchApp.fetch(
      url,
      {
        method: 'get',
        headers: {
          Authorization:
            'Bearer ' + token
        },
        muteHttpExceptions: true
      }
    );

    const responseCode =
      response.getResponseCode();

    const responseText =
      response.getContentText();

    if (
      responseCode < 200 ||
      responseCode >= 300
    ) {
      throw new Error(
        'Airtable connection failed. Code ' +
        responseCode +
        ': ' +
        responseText
      );
    }

    const data =
      JSON.parse(responseText);

    if (data.records) {
      records =
        records.concat(data.records);
    }

    offset = data.offset || '';
  } while (offset);

  return records;
}

function getSharedAirtableRecordCount_(
  baseId,
  tableId,
  token
) {
  return getSharedAirtableRecords_(
    baseId,
    tableId,
    token
  ).length;
}