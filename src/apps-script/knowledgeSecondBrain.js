var MooreHoldingsKnowledgeCenter = (function () {
  'use strict';

  var ALLOWED_TYPES = ['SOP', 'PROMPT', 'RESEARCH', 'DOCUMENT', 'EVIDENCE', 'LESSON', 'POLICY', 'TEMPLATE'];
  var ACTIVE_STATUSES = ['DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE'];

  function text(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function upper(value) {
    return text(value).toUpperCase();
  }

  function number(value) {
    var parsed = Number(value);
    return isFinite(parsed) ? parsed : 0;
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function includes(listValue, value) {
    return listValue.indexOf(value) !== -1;
  }

  function normalizeEntry(entry) {
    entry = entry || {};
    var type = upper(entry.type);
    var status = upper(entry.status || 'DRAFT');
    return {
      id: text(entry.id),
      title: text(entry.title),
      type: includes(ALLOWED_TYPES, type) ? type : 'DOCUMENT',
      module: text(entry.module || 'Enterprise'),
      owner: text(entry.owner),
      status: status,
      version: text(entry.version || '1.0'),
      sourceUrl: text(entry.sourceUrl),
      storageLocation: text(entry.storageLocation),
      tags: list(entry.tags).map(text).filter(Boolean),
      summary: text(entry.summary),
      content: text(entry.content),
      evidenceVerified: entry.evidenceVerified === true,
      approvedBy: text(entry.approvedBy),
      approvedAt: text(entry.approvedAt),
      reviewDueAt: text(entry.reviewDueAt),
      retentionClass: upper(entry.retentionClass || 'STANDARD'),
      supersedesId: text(entry.supersedesId),
      archived: entry.archived === true,
      lessonsRetained: entry.lessonsRetained === true,
      lastUpdatedAt: text(entry.lastUpdatedAt)
    };
  }

  function normalizeLink(link) {
    link = link || {};
    return {
      fromId: text(link.fromId),
      toId: text(link.toId),
      relationship: upper(link.relationship || 'RELATED_TO')
    };
  }

  function isReviewOverdue(entry, nowIso) {
    if (!entry.reviewDueAt || entry.archived) return false;
    var due = Date.parse(entry.reviewDueAt);
    var now = Date.parse(nowIso || new Date().toISOString());
    return !isNaN(due) && !isNaN(now) && due < now;
  }

  function buildSnapshot(input) {
    input = input || {};
    var nowIso = text(input.nowIso) || new Date().toISOString();
    var entries = list(input.entries).map(normalizeEntry);
    var links = list(input.links).map(normalizeLink);
    var blockers = [];

    var activeEntries = entries.filter(function (entry) {
      return includes(ACTIVE_STATUSES, entry.status) && !entry.archived;
    });
    var approvedEntries = entries.filter(function (entry) {
      return entry.status === 'APPROVED' || entry.status === 'ACTIVE';
    });
    var overdueReviews = entries.filter(function (entry) {
      return isReviewOverdue(entry, nowIso);
    });
    var missingOwners = activeEntries.filter(function (entry) { return !entry.owner; });
    var missingStorage = activeEntries.filter(function (entry) { return !entry.storageLocation; });
    var unverifiedEvidence = entries.filter(function (entry) {
      return entry.type === 'EVIDENCE' && !entry.evidenceVerified && !entry.archived;
    });
    var unapprovedPolicies = entries.filter(function (entry) {
      return entry.type === 'POLICY' && !includes(['APPROVED', 'ACTIVE'], entry.status) && !entry.archived;
    });
    var orphanLinks = links.filter(function (link) {
      var ids = entries.map(function (entry) { return entry.id; });
      return !link.fromId || !link.toId || !includes(ids, link.fromId) || !includes(ids, link.toId);
    });

    if (missingOwners.length) blockers.push(missingOwners.length + ' active knowledge records need an owner.');
    if (missingStorage.length) blockers.push(missingStorage.length + ' active knowledge records need a storage location.');
    if (overdueReviews.length) blockers.push(overdueReviews.length + ' knowledge reviews are overdue.');
    if (unverifiedEvidence.length) blockers.push(unverifiedEvidence.length + ' evidence records require verification.');
    if (unapprovedPolicies.length) blockers.push(unapprovedPolicies.length + ' policy records require executive approval.');
    if (orphanLinks.length) blockers.push(orphanLinks.length + ' knowledge relationships reference missing records.');

    var total = entries.length;
    var completenessParts = total ? entries.map(function (entry) {
      var fields = [entry.title, entry.type, entry.module, entry.owner, entry.storageLocation, entry.summary];
      return fields.filter(Boolean).length / fields.length;
    }) : [];
    var completeness = completenessParts.length ? Math.round(completenessParts.reduce(function (a, b) { return a + b; }, 0) / completenessParts.length * 100) : 0;

    var nextAction = blockers.length ? blockers[0] : (total ? 'Review the oldest active knowledge record and confirm it remains current.' : 'Create the first governed SOP, prompt, research, or evidence record.');

    return {
      totalEntries: total,
      activeEntries: activeEntries.length,
      approvedEntries: approvedEntries.length,
      sops: entries.filter(function (entry) { return entry.type === 'SOP'; }).length,
      prompts: entries.filter(function (entry) { return entry.type === 'PROMPT'; }).length,
      researchItems: entries.filter(function (entry) { return entry.type === 'RESEARCH'; }).length,
      evidenceItems: entries.filter(function (entry) { return entry.type === 'EVIDENCE'; }).length,
      lessons: entries.filter(function (entry) { return entry.type === 'LESSON'; }).length,
      overdueReviews: overdueReviews.length,
      unverifiedEvidence: unverifiedEvidence.length,
      archivedEntries: entries.filter(function (entry) { return entry.archived; }).length,
      linkedRelationships: links.length - orphanLinks.length,
      knowledgeCompletenessPercent: completeness,
      blockers: blockers,
      nextRecommendedAction: nextAction,
      governance: {
        publishExternallyEnabled: false,
        deletePermanentlyEnabled: false,
        overwriteApprovedRecordEnabled: false,
        executiveApprovalRequiredForPolicies: true,
        verificationRequiredForEvidence: true,
        auditRequired: true
      }
    };
  }

  function searchEntries(entries, query, filters) {
    var normalized = list(entries).map(normalizeEntry);
    var needle = text(query).toLowerCase();
    filters = filters || {};
    return normalized.filter(function (entry) {
      if (filters.type && entry.type !== upper(filters.type)) return false;
      if (filters.module && entry.module.toLowerCase() !== text(filters.module).toLowerCase()) return false;
      if (filters.status && entry.status !== upper(filters.status)) return false;
      if (filters.owner && entry.owner.toLowerCase() !== text(filters.owner).toLowerCase()) return false;
      if (!needle) return true;
      var haystack = [entry.title, entry.type, entry.module, entry.owner, entry.summary, entry.content, entry.tags.join(' ')].join(' ').toLowerCase();
      return haystack.indexOf(needle) !== -1;
    });
  }

  return {
    normalizeEntry: normalizeEntry,
    buildSnapshot: buildSnapshot,
    searchEntries: searchEntries,
    governance: {
      publishExternallyEnabled: false,
      deletePermanentlyEnabled: false,
      overwriteApprovedRecordEnabled: false
    }
  };
}());

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MooreHoldingsKnowledgeCenter;
}
