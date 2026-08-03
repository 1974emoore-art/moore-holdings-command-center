/** Release 2 read-only executive progress and deadline layer. */
function doGet() {
  const source = HtmlService.createHtmlOutputFromFile('Phase9_ExecutiveDashboard').getContent();
  const chain = [
    'applyDashboardReviewRoutingPatch_','applyDashboardNotificationsPatch_',
    'applyDashboardHealthDrilldownPatch_','applyDashboardKpiNavigationPatch_',
    'applyDashboardHashRoutingPatch_','applyDashboardMobileNavigationPatch_',
    'applyDashboardDailyBriefingPatch_','applyDashboardActivityRecoveryPatch_',
    'applyDashboardOperationsTimelinePatch_','applyDashboardExecutiveWorkQueuePatch_'
  ];
  let output = source;
  chain.forEach(function(name) { if (typeof this[name] === 'function') output = this[name](output); }, this);
  return HtmlService.createHtmlOutput(applyDashboardProgressDeadlinePatch_(output)).setTitle('Moore Holdings Credit Agent');
}

function applyDashboardProgressDeadlinePatch_(source) {
  let patched = String(source || '');
  const panelAnchor = '    <section id="executiveWorkQueue"';
  const panel = '    <section id="executiveProgressCenter" class="panel" style="margin-bottom:20px;">\n' +
    '      <div class="panel-header"><div><h2>Executive Progress & Deadlines</h2><div class="card-note">Completion percentage, overdue work, upcoming deadlines, and operational readiness</div></div><button class="btn-neutral" onclick="refreshExecutiveProgressCenter()">Refresh</button></div>\n' +
    '      <div id="executiveProgressSummary" class="cards" style="padding:18px;margin-bottom:0;"></div>\n' +
    '      <div id="executiveDeadlineList" class="cards" style="padding:0 18px 18px;margin-bottom:0;"><div class="empty">No deadline-bearing work loaded.</div></div>\n' +
    '    </section>\n\n' + panelAnchor;
  if (patched.indexOf(panelAnchor) === -1) throw new Error('Executive progress panel anchor missing.');
  patched = patched.replace(panelAnchor, panel);

  const scriptAnchor = '    const COMMAND_CENTER_MODULES = {';
  const script =
    "    function collectExecutiveDeadlineItems() {\n" +
    "      const now=Date.now(); const items=[];\n" +
    "      Array.prototype.slice.call(document.querySelectorAll('#governedActionList .card')).forEach(function(card,index){\n" +
    "        const text=(card.textContent||'').replace(/\\s+/g,' ').trim(); const raw=card.getAttribute('data-expires-at')||card.getAttribute('data-deadline')||''; const parsed=raw?Date.parse(raw):NaN;\n" +
    "        if(Number.isFinite(parsed)) items.push({title:card.getAttribute('data-action-id')||('Governed action '+(index+1)),deadline:parsed,status:parsed<now?'OVERDUE':'UPCOMING',target:'governedActionPanel',detail:text.slice(0,180)});\n" +
    "      });\n" +
    "      const pending=Number(((document.getElementById('pendingReviews')||{}).textContent||'').replace(/[^0-9.-]/g,''))||0;\n" +
    "      if(pending) items.push({title:pending+' Personal Credit review(s)',deadline:now+86400000,status:'UPCOMING',module:'personalCreditModule',target:'personalReviewQueue',detail:'Operational target: review within 24 hours.'});\n" +
    "      return items.sort(function(a,b){return a.deadline-b.deadline;});\n" +
    "    }\n\n" +
    "    function calculateExecutiveCompletionPercentage() {\n" +
    "      const work=typeof collectExecutiveWorkItems==='function'?collectExecutiveWorkItems():[]; const open=work.filter(function(item){return item.status!=='MONITOR';}).length;\n" +
    "      const moduleIds=['businessCreditRecords','financeTracked','turoTracked','realEstateTracked','tradingTracked','growthTracked']; const active=moduleIds.filter(function(id){return Number(((document.getElementById(id)||{}).textContent||'').replace(/[^0-9.-]/g,''))>0;}).length;\n" +
    "      const moduleScore=Math.round((active/moduleIds.length)*60); const queueScore=open===0?40:Math.max(0,40-(open*5)); return Math.max(0,Math.min(100,moduleScore+queueScore));\n" +
    "    }\n\n" +
    "    function refreshExecutiveProgressCenter() {\n" +
    "      const summary=document.getElementById('executiveProgressSummary'); const list=document.getElementById('executiveDeadlineList'); if(!summary||!list)return;\n" +
    "      const items=collectExecutiveDeadlineItems(); const overdue=items.filter(function(item){return item.status==='OVERDUE';}).length; const upcoming=items.length-overdue; const completion=calculateExecutiveCompletionPercentage();\n" +
    "      summary.innerHTML=''; [['Completion',completion+'%'],['Overdue',overdue],['Upcoming',upcoming],['Readiness',completion>=90?'Production Ready':(completion>=70?'Stabilizing':'Work Required')]].forEach(function(entry){const card=document.createElement('article');card.className='card';card.innerHTML='<div class=\"card-label\"></div><div class=\"card-value\"></div>';card.querySelector('.card-label').textContent=entry[0];card.querySelector('.card-value').textContent=entry[1];summary.appendChild(card);});\n" +
    "      list.innerHTML=''; if(!items.length){list.innerHTML='<div class=\"empty\">No deadline-bearing work is currently loaded.</div>';return;}\n" +
    "      items.forEach(function(item){const card=document.createElement('article');card.className='card';card.innerHTML='<div class=\"card-label\"></div><div class=\"card-note\"></div><div class=\"card-note\"></div><button class=\"btn-primary\">Open</button>';const notes=card.querySelectorAll('.card-note');card.querySelector('.card-label').textContent=item.status+' — '+item.title;notes[0].textContent=new Date(item.deadline).toLocaleString();notes[1].textContent=item.detail;card.querySelector('button').onclick=function(){if(item.module)activateCommandCenterModule(item.module,false);const target=document.getElementById(item.target);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});};list.appendChild(card);});\n" +
    "    }\n\n" +
    "    window.addEventListener('load', refreshExecutiveProgressCenter);\n\n" + scriptAnchor;
  if (patched.indexOf(scriptAnchor) === -1) throw new Error('Executive progress script anchor missing.');
  return patched.replace(scriptAnchor, script);
}
