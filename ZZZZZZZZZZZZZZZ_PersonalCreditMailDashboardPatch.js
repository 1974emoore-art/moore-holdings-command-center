/** Release 3 Personal Credit physical-mail dashboard visibility. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const chain = [
    'applyDashboardReviewRoutingPatch_','applyDashboardNotificationsPatch_',
    'applyDashboardHealthDrilldownPatch_','applyDashboardKpiNavigationPatch_',
    'applyDashboardHashRoutingPatch_','applyDashboardMobileNavigationPatch_',
    'applyDashboardDailyBriefingPatch_','applyDashboardActivityRecoveryPatch_',
    'applyDashboardOperationsTimelinePatch_','applyDashboardExecutiveWorkQueuePatch_',
    'applyDashboardProgressDeadlinePatch_','applyCreditLifecycleDashboardPatch_',
    'applyCreditLifecycleDashboardActionsPatch_'
  ];
  let output = source;
  chain.forEach(function(name) { if (typeof this[name] === 'function') output = this[name](output); }, this);
  return HtmlService.createHtmlOutput(applyPersonalCreditMailDashboardPatch_(output)).setTitle('Moore Holdings Credit Agent');
}

function applyPersonalCreditMailDashboardPatch_(source) {
  let patched = String(source || '');
  const anchor = '    <section id="businessCreditModule"';
  const panel = '    <section id="personalCreditMailLifecycle" class="panel" style="margin-bottom:20px;">\n' +
    '      <div class="panel-header"><div><h2>Personal Credit Certified Mail</h2><div class="card-note">Mailbox-only workflow • tracking, delivery, deadlines, responses, and follow-up</div></div><button class="btn-primary" onclick="refreshPersonalCreditMailDashboard()">Refresh Mail Status</button></div>\n' +
    '      <div id="personalCreditMailSummary" class="cards" style="padding:18px;margin-bottom:0;"></div>\n' +
    '      <div class="table-wrap" style="margin:0 18px 18px;border:1px solid var(--border);border-radius:10px;"><table aria-label="Personal Credit certified mail tracker" style="min-width:1050px;"><thead><tr><th>Recipient / Packet</th><th>Stage</th><th>Tracking</th><th>Mailed</th><th>Delivered</th><th>Response Due</th><th>Response Evidence</th><th>Follow-up</th><th>Next Action</th></tr></thead><tbody id="personalCreditMailRows"><tr><td colspan="9" class="loading">Loading certified-mail lifecycle...</td></tr></tbody></table></div>\n' +
    '      <div class="footer-note" style="padding:0 18px 18px;">The Command Center tracks evidence and deadlines. Printing, USPS handoff, mailbox checks, and paper scanning remain human actions.</div>\n' +
    '    </section>\n\n' + anchor;
  if (patched.indexOf(anchor) === -1) throw new Error('Personal Credit mail dashboard anchor missing.');
  patched = patched.replace(anchor, panel);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function collectPersonalCreditMailInputs(){const rows=Array.prototype.slice.call(document.querySelectorAll('#personalReviewQueue tr, #reviewRows tr, #personalCreditRows tr'));return rows.filter(function(row){const text=(row.textContent||'').toLowerCase();return /certified|tracking|usps|delivered|in transit|response received/.test(text);}).map(function(row,index){const text=(row.textContent||'').replace(/\\s+/g,' ').trim();const tracking=(text.match(/\\b9[0-9]{15,25}\\b/)||[])[0]||row.getAttribute('data-tracking-number')||'';let stage='DRAFT_PREPARED';if(/response received/i.test(text))stage='RESPONSE_RECEIVED';else if(/follow.?up due/i.test(text))stage='FOLLOW_UP_DUE';else if(/delivered/i.test(text))stage='DELIVERED';else if(/in transit/i.test(text))stage='IN_TRANSIT';else if(/accepted/i.test(text))stage='ACCEPTED_BY_USPS';else if(/sent|mailed/i.test(text))stage='HANDED_TO_MAILER';else if(/print ready/i.test(text))stage='PRINT_READY';return {mailItemId:row.getAttribute('data-mail-item-id')||('MAIL-'+(index+1)),creditRecordId:row.getAttribute('data-record-id')||'',recipient:row.getAttribute('data-recipient')||((row.querySelector('td')&&row.querySelector('td').textContent)||'Credit recipient').trim(),documentTitle:row.getAttribute('data-document-title')||text.slice(0,100),stage:stage,trackingNumber:tracking,mailedAt:row.getAttribute('data-mailed-at')||null,deliveredAt:row.getAttribute('data-delivered-at')||null,responseReceivedAt:row.getAttribute('data-response-received-at')||null,responseDocumentId:row.getAttribute('data-response-document-id')||'',responseDays:Number(row.getAttribute('data-response-days')||30)};});}\n\n" +
    "    function renderPersonalCreditMailDashboard(items){const summary=document.getElementById('personalCreditMailSummary');const body=document.getElementById('personalCreditMailRows');if(!summary||!body)return;summary.innerHTML='';const delivered=items.filter(function(x){return x.deliveredAt;}).length;const responses=items.filter(function(x){return x.responseReceivedAt;}).length;const followUps=items.filter(function(x){return x.followUpRequired;}).length;[['Mail Items',items.length],['Delivered',delivered],['Responses',responses],['Follow-up Due',followUps]].forEach(function(entry){const card=document.createElement('article');card.className='card';card.innerHTML='<div class=\"card-label\"></div><div class=\"card-value\"></div>';card.querySelector('.card-label').textContent=entry[0];card.querySelector('.card-value').textContent=entry[1];summary.appendChild(card);});body.innerHTML='';if(!items.length){body.innerHTML='<tr><td colspan=\"9\" class=\"empty\">No certified-mail records detected in the loaded Personal Credit workspace.</td></tr>';return;}items.forEach(function(item){const tr=document.createElement('tr');[item.recipient+' — '+item.documentTitle,item.stage,item.trackingNumber||'Not recorded',formatMailDate_(item.mailedAt),formatMailDate_(item.deliveredAt),formatMailDate_(item.responseDueAt),item.responseDocumentId||'No response attached',item.followUpRequired?'DUE':'Not due',item.nextAction].forEach(function(value){const td=document.createElement('td');td.textContent=value;tr.appendChild(td);});body.appendChild(tr);});}\n\n" +
    "    function formatMailDate_(value){if(!value)return '—';const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleDateString():'—';}\n\n" +
    "    function refreshPersonalCreditMailDashboard(){const inputs=collectPersonalCreditMailInputs();if(!inputs.length){renderPersonalCreditMailDashboard([]);return;}let remaining=inputs.length;const results=[];inputs.forEach(function(input){google.script.run.withSuccessHandler(function(item){results.push(item);remaining-=1;if(!remaining)renderPersonalCreditMailDashboard(results);}).withFailureHandler(function(error){remaining-=1;showMessage(error&&error.message?error.message:String(error),'error');if(!remaining)renderPersonalCreditMailDashboard(results);}).buildPersonalCreditPhysicalMailLifecycle(input);});}\n\n" +
    "    window.addEventListener('load',refreshPersonalCreditMailDashboard);\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Personal Credit mail script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
