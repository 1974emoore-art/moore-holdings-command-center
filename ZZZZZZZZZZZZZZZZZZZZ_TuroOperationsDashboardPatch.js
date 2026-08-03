(function (global) {
  'use strict';

  function money(value) {
    var number = Number(value || 0);
    return '$' + number.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function setText(id, value) {
    if (typeof document === 'undefined') return;
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function ensureOperationsPanel() {
    if (typeof document === 'undefined') return null;
    var turoModule = document.getElementById('turoModule');
    if (!turoModule) return null;
    var panel = document.getElementById('turoOperationsLifecyclePanel');
    if (panel) return panel;

    panel = document.createElement('section');
    panel.id = 'turoOperationsLifecyclePanel';
    panel.className = 'panel';
    panel.style.margin = '0 18px 18px';
    panel.innerHTML = [
      '<div class="panel-header"><div><h2>Turo Operations</h2>',
      '<div class="card-note">Bookings, customers, communications, finances, incidents, documents, and tasks • governed</div></div></div>',
      '<div class="cards" style="padding:18px;margin-bottom:0;">',
      '<div class="card"><div class="card-label">Active Bookings</div><div id="turoOpsActiveBookings" class="card-value">—</div></div>',
      '<div class="card"><div class="card-label">Recognized Revenue</div><div id="turoOpsRevenue" class="card-value">—</div></div>',
      '<div class="card"><div class="card-label">Cleared Expenses</div><div id="turoOpsExpenses" class="card-value">—</div></div>',
      '<div class="card"><div class="card-label">Operating Cash Flow</div><div id="turoOpsNet" class="card-value">—</div></div>',
      '<div class="card"><div class="card-label">Open Incidents</div><div id="turoOpsIncidents" class="card-value">—</div></div>',
      '<div class="card"><div class="card-label">Missing Documents</div><div id="turoOpsDocuments" class="card-value">—</div></div>',
      '<div class="card"><div class="card-label">Overdue Tasks</div><div id="turoOpsTasks" class="card-value">—</div></div>',
      '<div class="card"><div class="card-label">Pending Communications</div><div id="turoOpsCommunications" class="card-value">—</div></div>',
      '</div>',
      '<div style="padding:0 18px 18px;"><h3 style="color:var(--navy);">Operations Blockers</h3><div id="turoOpsBlockers" class="footer-note">No operations data loaded.</div>',
      '<h3 style="color:var(--navy);">Next Recommended Work</h3><div id="turoOpsNextWork" class="footer-note">Load Turo operations to calculate next work.</div></div>',
      '<div class="footer-note" style="padding:0 18px 18px;">Customer messages, booking mutations, payments, and refunds require executive review and governed execution.</div>'
    ].join('');
    turoModule.appendChild(panel);
    return panel;
  }

  function normalizeOperations(source) {
    if (typeof global.buildTuroOperationsLifecycle === 'function') {
      return global.buildTuroOperationsLifecycle(source || {});
    }
    if (typeof global.getTuroOperationsLifecycle === 'function') {
      return global.getTuroOperationsLifecycle(source || {});
    }
    return source && source.operationsLifecycle ? source.operationsLifecycle : (source || {});
  }

  function renderTuroOperationsLifecycle(source) {
    ensureOperationsPanel();
    var result = normalizeOperations(source);
    var summary = result.summary || result;
    setText('turoOpsActiveBookings', summary.activeBookings || 0);
    setText('turoOpsRevenue', money(summary.recognizedRevenue));
    setText('turoOpsExpenses', money(summary.clearedExpenses));
    setText('turoOpsNet', money(summary.netOperatingCashFlow));
    setText('turoOpsIncidents', summary.openIncidents || 0);
    setText('turoOpsDocuments', summary.missingRequiredDocuments || 0);
    setText('turoOpsTasks', summary.overdueTasks || 0);
    setText('turoOpsCommunications', summary.pendingCommunications || 0);
    var blockers = result.blockers || summary.blockers || [];
    var nextWork = result.nextRecommendedWork || summary.nextRecommendedWork || 'Continue governed Turo operations review.';
    setText('turoOpsBlockers', blockers.length ? blockers.join(' • ') : 'No current Turo operations blockers.');
    setText('turoOpsNextWork', nextWork);
    return result;
  }

  var priorLoadTuroFleet = global.loadTuroFleet;
  global.loadTuroFleet = function () {
    ensureOperationsPanel();
    var returned = typeof priorLoadTuroFleet === 'function' ? priorLoadTuroFleet.apply(this, arguments) : null;
    if (returned && typeof returned.then === 'function') {
      return returned.then(function (data) {
        renderTuroOperationsLifecycle(data || {});
        return data;
      });
    }
    if (returned) renderTuroOperationsLifecycle(returned);
    return returned;
  };

  global.renderTuroOperationsLifecycle = renderTuroOperationsLifecycle;
  global.ensureTuroOperationsPanel = ensureOperationsPanel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
