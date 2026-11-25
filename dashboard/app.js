// Token Radar — the dashboard (no framework, no network).
//
// Renders window.RADAR (written by main.ts from the sealed snapshot): the
// ranked board, one detail view per protocol, the live-token table and the
// model. State lives in the URL hash, so every view is a link:
//
//   #/board                          the board, with ?category=&chain=&q=&watchlist=1&sort=
//   #/protocol/<slug>                one protocol's detail view
//
// Sorting, filtering and search run in the page; nothing is fetched.

(function () {
  'use strict';

  var D = window.RADAR;
  if (!D) {
    document.getElementById('rows').innerHTML =
      '<tr><td colspan="8" class="empty">No radar data: data.js did not load.</td></tr>';
    return;
  }

  var watchSet = {};
  D.rows.forEach(function (r) { if (r.watchlist) watchSet[r.slug] = true; });

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /** $2.75B, $514.4M, $22.6M, $5.0M, $812K. */
  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }

  function ageText(days) {
    if (days == null) return '—';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30.4 * 10) / 10 + 'mo';
    return Math.round(days / 365 * 10) / 10 + 'y';
  }

  function changeHtml(v) {
    if (v == null) return '<span class="flat">—</span>';
    var cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
    var sign = v > 0 ? '+' : '';
    return '<span class="' + cls + '">' + sign + v.toFixed(1) + '%</span>';
  }

  function catOf(r) { return r.category || 'Uncategorised'; }

  // ---- summary -----------------------------------------------------------

  function renderStats() {
    var total = D.rows.reduce(function (n, r) { return n + r.implied_value_usd; }, 0);
    var top = D.rows[0];
    $('asOf').textContent = D.as_of;
    $('stats').innerHTML =
      stat(money(total), 'total implied value across the board', true) +
      stat(String(D.board_size), 'protocols ranked, pre-token only') +
      stat(String(D.watchlist_size), 'on the DefiLlama watchlist') +
      stat(top ? esc(top.name) : '—', top ? 'top of the board at ' + money(top.implied_value_usd) : '');
    $('source').textContent = 'Snapshot: ' + D.source + ' · Floor: ' + money(D.floor_usd) +
      ' · Model ' + esc(D.model_version) + ' · ' + D.board_size + ' rows, ' + D.below_floor_size +
      ' of them below the watchlist floor.';
  }

  function stat(big, small, hot) {
    return '<div class="stat' + (hot ? ' hot' : '') + '"><b>' + big + '</b><span>' + small + '</span></div>';
  }

  // ---- filters -----------------------------------------------------------

  var state = { q: '', category: '', chain: '', watchlist: false, sort: 'value' };

  function fillSelects() {
    var cats = {}, chains = {};
    D.rows.forEach(function (r) {
      cats[catOf(r)] = true;
      r.chains.forEach(function (c) { chains[c] = true; });
    });
    var catSel = $('category'), chainSel = $('chain');
    Object.keys(cats).sort().forEach(function (c) {
      catSel.add(new Option(c + ' (' + D.rows.filter(function (r) { return catOf(r) === c; }).length + ')', c));
    });
    Object.keys(chains).sort().forEach(function (c) {
      chainSel.add(new Option(c, c));
    });
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var rows = D.rows.filter(function (r) {
      if (state.watchlist && !watchSet[r.slug]) return false;
      if (state.category && catOf(r) !== state.category) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var by = {
      value: function (a, b) { return b.implied_value_usd - a.implied_value_usd || a.rank - b.rank; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd || a.rank - b.rank; },
      growth: function (a, b) { return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d); },
      age: function (a, b) { return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days); },
      name: function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; },
    };
    return rows.sort(by[state.sort] || by.value);
  }

  function renderBoard() {
    var rows = filtered();
    var max = D.rows[0] ? D.rows[0].implied_value_usd : 1;
    $('count').textContent = 'Showing ' + rows.length + ' of ' + D.rows.length +
      ' ranked protocols' + (state.watchlist ? ' on the watchlist' : '') +
      (state.category ? ' · ' + state.category : '') +
      (state.chain ? ' · ' + state.chain : '') + '. Click a row for its detail and farm plan.';
    if (!rows.length) {
      $('rows').innerHTML = '<tr><td colspan="8" class="empty">Nothing matches these filters.</td></tr>';
      return;
    }
    $('rows').innerHTML = rows.map(function (r) {
      var w = Math.max(2, Math.round(r.implied_value_usd / max * 120));
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td class="num"><span class="rank' + (r.rank <= 3 ? ' top3' : '') + '">' + r.rank + '</span></td>' +
        '<td><span class="pname">' + esc(r.name) + '</span>' +
        (watchSet[r.slug] ? '<span class="tag">Watchlist</span>' : '') +
        '<br><span class="pslug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(catOf(r)) + '</td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + changeHtml(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num"><span class="bar" style="width:' + w + 'px"></span>' + money(r.implied_value_usd) + '</td>' +
        '</tr>';
    }).join('');
  }

  // ---- detail ------------------------------------------------------------

  function findRow(slug) {
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) return D.rows[i];
    return null;
  }

  function whyText(r) {
    var bits = [];
    bits.push(money(r.tvl_usd) + ' of TVL at a ' + r.category_multiple.toFixed(2) + '× ' + catOf(r) + ' multiple');
    if (r.change_7d != null) bits.push(r.change_7d >= 0 ? 'growing +' + r.change_7d.toFixed(1) + '% over 7 days' : 'down ' + r.change_7d.toFixed(1) + '% over 7 days');
    bits.push('live on ' + r.chains.length + (r.chains.length === 1 ? ' chain' : ' chains'));
    if (r.age_days != null) bits.push('tracked for ' + ageText(r.age_days) + ' with no token recorded');
    return 'Rank #' + r.rank + ' because ' + bits.join(', ') + '.';
  }

  function renderDetail(slug) {
    var box = $('detail');
    var r = slug ? findRow(slug) : null;
    if (!r) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    var mult = r.category_multiple, growth = r.growth_factor, breadth = r.breadth_factor, mat = r.maturity_factor;
    box.innerHTML =
      '<div class="detail">' +
      '<a class="back" href="#/board">&larr; Back to the board</a>' +
      '<h2>#' + r.rank + ' &nbsp;' + esc(r.name) + (watchSet[r.slug] ? ' <span class="tag">Watchlist</span>' : '') + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' &middot; ' + esc(catOf(r)) + ' &middot; ' + esc(r.chains.join(', ') || 'no chain listed') +
      ' &middot; listed ' + esc(r.listed_at || 'date unknown') + '</p>' +
      '<div class="dgrid">' +
      '<div class="dcell"><b>' + money(r.implied_value_usd) + '</b><span>implied value</span></div>' +
      '<div class="dcell"><b>' + money(r.tvl_usd) + '</b><span>total value locked</span></div>' +
      '<div class="dcell"><b>' + (r.change_7d == null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</b><span>TVL change, 7 days</span></div>' +
      '<div class="dcell"><b>' + ageText(r.age_days) + '</b><span>tracked with no token</span></div>' +
      '</div>' +
      '<div class="factors">' +
      '<div class="factor"><b>' + mult.toFixed(2) + '×</b><span>category multiple</span><small>' + esc(catOf(r)) + ' FDV/TVL</small></div>' +
      '<div class="factor"><b>' + growth.toFixed(2) + '×</b><span>growth factor</span><small>' + (r.change_7d == null ? 'no 7d change reported' : '7d change ' + (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</small></div>' +
      '<div class="factor"><b>' + breadth.toFixed(2) + '×</b><span>breadth factor</span><small>' + r.chains.length + (r.chains.length === 1 ? ' chain' : ' chains') + '</small></div>' +
      '<div class="factor"><b>' + mat.toFixed(2) + '×</b><span>maturity factor</span><small>' + ageText(r.age_days) + ' on record</small></div>' +
      '</div>' +
      '<p class="why">' + esc(whyText(r)) + '</p>' +
      '<h3>How to farm it &mdash; six steps</h3>' +
      '<ol class="steps">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '</div>';
    document.querySelectorAll('#rows tr.active').forEach(function (tr) { tr.classList.remove('active'); });
    var tr = document.querySelector('#rows tr[data-slug="' + r.slug.replace(/"/g, '') + '"]');
    if (tr) tr.classList.add('active');
  }

  // ---- live table ----------------------------------------------------------

  function renderLive() {
    $('liveRows').innerHTML = D.live.map(function (p) {
      return '<tr><td><span class="pname">' + esc(p.name) + '</span><br><span class="pslug">' + esc(p.slug) + '</span></td>' +
        '<td>' + esc(p.category || 'Uncategorised') + '</td>' +
        '<td class="num">' + money(p.tvl_usd) + '</td>' +
        '<td class="num">' + money(p.mcap_usd) + '</td>' +
        '<td class="num">' + changeHtml(p.change_7d) + '</td></tr>';
    }).join('');
  }

  // ---- routing -------------------------------------------------------------

  function parseHash() {
    var h = location.hash || '#/board';
    var m = h.match(/^#\/protocol\/([A-Za-z0-9._-]+)/);
    if (m) return { view: 'detail', slug: m[1] };
    var qm = h.match(/^#\/board\?(.*)$/);
    if (qm) {
      var params = new URLSearchParams(qm[1]);
      return {
        view: 'board',
        q: params.get('q') || '', category: params.get('category') || '',
        chain: params.get('chain') || '', watchlist: params.get('watchlist') === '1',
        sort: params.get('sort') || 'value',
      };
    }
    return { view: 'board' };
  }

  function syncHash() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.category) p.set('category', state.category);
    if (state.chain) p.set('chain', state.chain);
    if (state.watchlist) p.set('watchlist', '1');
    if (state.sort !== 'value') p.set('sort', state.sort);
    var s = p.toString();
    history.replaceState(null, '', '#/board' + (s ? '?' + s : ''));
  }

  function route() {
    var r = parseHash();
    if (r.view === 'detail') {
      renderDetail(r.slug);
      $('boardWrap').style.display = '';
      var box = $('detail');
      if (box && !box.hidden) box.scrollIntoView({ block: 'start' });
      return;
    }
    renderDetail(null);
    if (r.q !== undefined) {
      state.q = r.q; state.category = r.category; state.chain = r.chain;
      state.watchlist = r.watchlist; state.sort = r.sort;
      $('q').value = state.q; $('category').value = state.category;
      $('chain').value = state.chain; $('watchlistOnly').checked = state.watchlist;
      $('sort').value = state.sort;
    }
    renderBoard();
  }

  // ---- wire up -------------------------------------------------------------

  $('q').addEventListener('input', function () { state.q = this.value; syncHash(); renderBoard(); });
  $('category').addEventListener('change', function () { state.category = this.value; syncHash(); renderBoard(); });
  $('chain').addEventListener('change', function () { state.chain = this.value; syncHash(); renderBoard(); });
  $('sort').addEventListener('change', function () { state.sort = this.value; syncHash(); renderBoard(); });
  $('watchlistOnly').addEventListener('change', function () { state.watchlist = this.checked; syncHash(); renderBoard(); });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) location.hash = '#/protocol/' + tr.getAttribute('data-slug');
  });
  window.addEventListener('hashchange', route);

  fillSelects();
  renderStats();
  renderLive();
  route();
})();
