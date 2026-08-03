'use strict';

const fs = require('fs');
const path = require('path');

const policyPath = 'governance/external-action-allowlist.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const allowed = policy.allowedFiles || {};
const capabilityPatterns = [
  { name: 'UrlFetchApp.fetch', pattern: /UrlFetchApp\.fetch\s*\(/ },
  { name: 'DocumentApp.create', pattern: /DocumentApp\.create\s*\(/ },
  { name: 'DriveApp.createFile', pattern: /DriveApp\.createFile\s*\(/ },
  { name: 'GmailApp.sendEmail', pattern: /GmailApp\.sendEmail\s*\(/ },
  { name: 'MailApp.sendEmail', pattern: /MailApp\.sendEmail\s*\(/ },
  { name: 'CalendarApp.createEvent', pattern: /CalendarApp\.createEvent\s*\(/ }
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'tests'].includes(entry.name)) return [];
      return walk(full);
    }
    return /\.(js|gs\.js)$/.test(entry.name) ? [full.replace(/\\/g, '/')] : [];
  });
}

const violations = [];
for (const file of walk('.')) {
  const source = fs.readFileSync(file, 'utf8');
  const detected = capabilityPatterns
    .filter((item) => item.pattern.test(source))
    .map((item) => item.name);
  if (!detected.length) continue;

  const entry = allowed[file];
  if (!entry) {
    violations.push(`${file}: write capability not inventoried (${detected.join(', ')})`);
    continue;
  }

  for (const capability of detected) {
    if (!(entry.capabilities || []).includes(capability)) {
      violations.push(`${file}: capability missing from manifest (${capability})`);
    }
  }

  for (const control of entry.requiredControls || []) {
    if (!source.includes(control)) {
      violations.push(`${file}: required control missing (${control})`);
    }
  }
}

for (const file of Object.keys(allowed)) {
  if (!fs.existsSync(file)) violations.push(`${file}: manifest references missing file`);
}

if (violations.length) {
  throw new Error(`External-action boundary violations:\n- ${violations.join('\n- ')}`);
}

console.log(`External-action boundary passed for ${Object.keys(allowed).length} inventoried files.`);
