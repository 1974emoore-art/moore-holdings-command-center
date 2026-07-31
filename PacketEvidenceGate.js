/**
 * PACKET EVIDENCE GATE
 *
 * Prevents a bureau packet from being treated as mail-ready unless a source
 * report entry matches both the target bureau and the packet account reference.
 * Read-only: this module cannot create files, send messages, or update Airtable.
 */

const PACKET_EVIDENCE_GATE_VERSION = '1.0.0';

function assessPacketEvidence(packet) {
  packet = packet || {};

  const bureau = normalizePacketEvidenceValue_(packet.bureau);
  const accountReference = normalizePacketReference_(packet.accountReference);
  const sourceEntries = Array.isArray(packet.sourceEntries)
    ? packet.sourceEntries
    : [];

  const blockers = [];

  if (!bureau) blockers.push('Target bureau is missing.');
  if (!accountReference) blockers.push('Packet account reference is missing.');
  if (sourceEntries.length === 0) {
    blockers.push('No source-report entries were supplied.');
  }

  const exactMatches = sourceEntries.filter(function(entry) {
    return (
      normalizePacketEvidenceValue_(entry && entry.bureau) === bureau &&
      entry &&
      entry.reported === true &&
      packetReferencesMatch_(
        accountReference,
        normalizePacketReference_(entry.accountReference)
      )
    );
  });

  if (sourceEntries.length > 0 && exactMatches.length === 0) {
    blockers.push(
      'No source-report entry matches both the target bureau and account reference.'
    );
  }

  return {
    version: PACKET_EVIDENCE_GATE_VERSION,
    status:
      blockers.length === 0
        ? 'READY_FOR_PHYSICAL_REVIEW'
        : 'BLOCKED_EVIDENCE_MISMATCH',
    matchedSourceCount: exactMatches.length,
    blockers: blockers,
    requiresHumanReview: true,
    readOnly: true,
    airtableRecordsChanged: 0,
    filesCreated: 0,
    messagesSent: 0,
    mailingStatusChanged: false
  };
}

function packetReferencesMatch_(left, right) {
  if (!left || !right) return false;

  if (left === right) return true;

  const leftSuffix = extractPacketReferenceSuffix_(left);
  const rightSuffix = extractPacketReferenceSuffix_(right);

  return (
    leftSuffix.length >= 4 &&
    rightSuffix.length >= 4 &&
    leftSuffix === rightSuffix
  );
}

function extractPacketReferenceSuffix_(value) {
  const normalized = normalizePacketReference_(value);
  const visible = normalized.replace(/X/g, '');
  return visible.slice(-4);
}

function normalizePacketReference_(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9X]/g, '');
}

function normalizePacketEvidenceValue_(value) {
  return String(value || '').trim().toLowerCase();
}
