/* ════════════════════════════════════════════════
   DASHBOARD.JS
   তরিকায়ে খাস মোজাদ্দেদিয়া — সিলেট কাফেলা
════════════════════════════════════════════════ */

'use strict';

/* ── চার্ট ইন্সট্যান্স (পরে আপডেটের জন্য) ── */
let chartDonut = null;
let chartBar   = null;
let chartLine  = null;

/* ── অটো রিফ্রেশ টাইমার ── */
let refreshTimer = null;

/* ── শেষ ডেটার হ্যাশ (পরিবর্তন শনাক্তকরণ) ── */
let lastDataHash = '';

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  /* অ্যাক্সেস যাচাই */
  if (!requireAuth()) return;

  /* নেটওয়ার্ক লিসেনার */
  setupNetwork();

  /* প্রথমবার ডেটা লোড */
  await loadDashboard();

  /* অটো রিফ্রেশ শুরু (৬০ সেকেন্ড) */
  startAutoRefresh();
});

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */
function requireAuth() {
  const ok  = sessionStorage.getItem('kafela_auth');
  const exp = sessionStorage.getItem('kafela_auth_exp');
  if (!ok || Date.now() > Number(exp)) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/* ══════════════════════════════════════════════
   NETWORK
══════════════════════════════════════════════ */
function setupNetwork() {
  const bar = document.getElementById('offlineBar');
  window.addEventListener('offline', () => {
    bar.classList.add('show');
    showToast('📵 ইন্টারনেট সংযোগ নেই');
  });
  window.addEventListener('online', async () => {
    bar.classList.remove('show');
    showToast('✅ সংযোগ পুনরুদ্ধার হয়েছে');
    await loadDashboard();
  });
  if (!navigator.onLine) bar.classList.add('show');
}

/* ══════════════════════════════════════════════
   AUTO REFRESH
══════════════════════════════════════════════ */
function startAutoRefresh() {
  const interval = (typeof CONFIG !== 'undefined' && CONFIG.REFRESH_TIME)
    ? CONFIG.REFRESH_TIME
    : 60000;

  refreshTimer = setInterval(async () => {
    if (navigator.onLine) {
      await loadDashboard(true); /* silent = true */
    }
  }, interval);
}

function manualRefresh() {
  showToast('🔄 আপডেট করা হচ্ছে...');
  loadDashboard(false);
}

/* ══════════════════════════════════════════════
   MAIN LOADER
══════════════════════════════════════════════ */
async function loadDashboard(silent = false) {
  try {
    const data = await fetchData();
    const hash = JSON.stringify(data);

    /* ডেটা না বদলালে চার্ট রি-রেন্ডার করব না */
    if (silent && hash === lastDataHash) return;
    lastDataHash = hash;

    const { members, transactions, settings } = data;
    const target = Number(settings.totalTarget) || 50000;

    /* হিসাব করো */
    const memberStats = buildMemberStats(members, transactions);
    const grandTotal  = memberStats.reduce((s, m) => s + m.total, 0);
    const monthly     = buildMonthly(transactions);

    /* UI আপডেট */
    updateStats(memberStats, grandTotal, target, transactions);
    updateProgress(grandTotal, target);
    updateRanking(memberStats);
    renderMemberList(memberStats, grandTotal);
    renderMonthlyTable(monthly);
    renderRecentList(transactions, members);
    renderCharts(memberStats, monthly, grandTotal);

    /* স্কেলেটন লুকাও, কন্টেন্ট দেখাও */
    document.getElementById('skeletonWrap').style.display = 'none';
    document.getElementById('contentWrap').style.display  = 'block';

    /* Last Updated */
    updateTimestamp(data.lastUpdated);

    if (!silent) showToast('✅ সর্বশেষ তথ্য লোড হয়েছে');

  } catch (err) {
    console.error('Dashboard load error:', err);
    if (!silent) showErrorState();
  }
}

/* ══════════════════════════════════════════════
   DATA FETCH
══════════════════════════════════════════════ */
async function fetchData() {
  const apiUrl = (typeof CONFIG !== 'undefined')
    ? CONFIG.API_URL
    : '';

  /* ── Demo ডেটা (API URL না থাকলে) ── */
  if (!apiUrl || apiUrl === 'YOUR_APPS_SCRIPT_URL_HERE') {
    return getDemoData();
  }

  const res  = await fetch(apiUrl, { cache: 'no-store' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

/* ══════════════════════════════════════════════
   DEMO DATA (পরীক্ষার জন্য)
══════════════════════════════════════════════ */
function getDemoData() {
  return {
    success: true,
    members: [
      { id: '1', name: 'মোঃ রাহিম উদ্দিন',  joinDate: '2025-01-01' },
      { id: '2', name: 'মোঃ করিম মিয়া',     joinDate: '2025-01-01' },
      { id: '3', name: 'মোঃ জলিল আহমেদ',   joinDate: '2025-01-05' },
      { id: '4', name: 'মোঃ সালাম শেখ',     joinDate: '2025-01-10' },
      { id: '5', name: 'মোঃ আলম হোসেন',    joinDate: '2025-02-01' },
    ],
    transactions: [
      { id:1, memberId:'1', memberName:'মোঃ রাহিম উদ্দিন',  amount:3000, date:'2025-01-10', note:'জানুয়ারি কিস্তি' },
      { id:2, memberId:'2', memberName:'মোঃ করিম মিয়া',     amount:2000, date:'2025-01-12', note:'' },
      { id:3, memberId:'3', memberName:'মোঃ জলিল আহমেদ',   amount:2500, date:'2025-01-15', note:'' },
      { id:4, memberId:'4', memberName:'মোঃ সালাম শেখ',     amount:1500, date:'2025-01-18', note:'' },
      { id:5, memberId:'5', memberName:'মোঃ আলম হোসেন',    amount:500,  date:'2025-01-20', note:'আংশিক' },
      { id:6, memberId:'1', memberName:'মোঃ রাহিম উদ্দিন',  amount:2000, date:'2025-02-05', note:'ফেব্রুয়ারি' },
      { id:7, memberId:'2', memberName:'মোঃ করিম মিয়া',     amount:3000, date:'2025-02-08', note:'' },
      { id:8, memberId:'3', memberName:'মোঃ জলিল আহমেদ',   amount:2000, date:'2025-02-10', note:'' },
      { id:9, memberId:'4', memberName:'মোঃ সালাম শেখ',     amount:2500, date:'2025-02-14', note:'' },
      { id:10,memberId:'5', memberName:'মোঃ আলম হোসেন',    amount:1000, date:'2025-02-18', note:'' },
      { id:11,memberId:'1', memberName:'মোঃ রাহিম উদ্দিন',  amount:3500, date:'2025-03-03', note:'মার্চ' },
      { id:12,memberId:'2', memberName:'মোঃ করিম মিয়া',     amount:1500, date:'2025-03-07', note:'' },
      { id:13,memberId:'3', memberName:'মোঃ জলিল আহমেদ',   amount:3000, date:'2025-03-12', note:'' },
      { id:14,memberId:'4', memberName:'মোঃ সালাম শেখ',     amount:2000, date:'2025-03-15', note:'' },
      { id:15,memberId:'5', memberName:'মোঃ আলম হোসেন',    amount:800,  date:'2025-03-20', note:'' },
    ],
    settings: {
      totalTarget: 50000,
      tripDate: '2025-12-20',
    },
    lastUpdated: new Date().toISOString(),
  };
}

/* ══════════════════════════════════════════════
   CALCULATIONS
══════════════════════════════════════════════ */
function buildMemberStats(members, transactions) {
  return members.map((m, idx) => {
    const txns = transactions
      .filter(t => String(t.memberId) === String(m.id))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const amounts = txns.map(t => Number(t.amount));
    const total   = amounts.reduce((s, a) => s + a, 0);
    const max     = amounts.length ? Math.max(...amounts) : 0;
    const min     = amounts.length ? Math.min(...amounts) : 0;
    const avg     = amounts.length
      ? Math.round(total / amounts.length) : 0;

    const maxTxn  = txns[amounts.indexOf(max)];
    const minTxn  = txns[amounts.indexOf(min)];
    const lastTxn = txns[txns.length - 1];

    return {
      ...m,
      txns,
      total,
      count    : txns.length,
      max, min, avg,
      maxDate  : maxTxn  ? maxTxn.date  : null,
      minDate  : minTxn  ? minTxn.date  : null,
      lastDate : lastTxn ? lastTxn.date : null,
      color    : CHART_COLORS[idx % CHART_COLORS.length],
    };
  }).sort((a, b) => b.total - a.total);
}

function buildMonthly(transactions) {
  const map = {};
  transactions.forEach(t => {
    const key = t.date.substring(0, 7);
    if (!map[key]) map[key] = { total: 0, count: 0 };
    map[key].total += Number(t.amount);
    map[key].count++;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));
}

/* ══════════════════════════════════════════════
   CHART COLORS
══════════════════════════════════════════════ */
const CHART_COLORS = [
  '#1a5c38','#c8973e','#1a6fa0',
  '#6c3483','#117a65','#922b21',
  '#1f618d','#d35400','#1e8449',
  '#7d6608',
];

/* ══════════════════════════════════════════════
   UPDATE STATS
══════════════════════════════════════════════ */
function updateStats(memberStats, grandTotal, target, transactions) {

  /* মোট সঞ্চয় — count-up */
  countUp(
    document.getElementById('sTotalAmount'),
    grandTotal
  );
  document.getElementById('sTotalSub').textContent =
    `লক্ষ্যের ${Math.round(grandTotal/target*100)}%`;

  /* সালেক */
  document.getElementById('sTotalMembers').textContent =
    memberStats.length;

  /* কিস্তি */
  document.getElementById('sTotalTxn').textContent =
    transactions.length + ' টি';
  document.getElementById('sTxnSub').textContent =
    memberStats.length
      ? `গড় ${Math.round(transactions.length/memberStats.length)} টি/জন`
      : '';

  /* লক্ষ্যমাত্রা */
  document.getElementById('sTarget').textContent =
    '৳' + target.toLocaleString('en-IN');
  document.getElementById('sTargetSub').textContent =
    `বাকি ৳${Math.max(target-grandTotal,0).toLocaleString('en-IN')}`;
}

/* ══════════════════════════════════════════════
   UPDATE PROGRESS
══════════════════════════════════════════════ */
function updateProgress(grandTotal, target) {
  const pct = Math.min(Math.round(grandTotal / target * 100), 100);

  document.getElementById('progPct').textContent = pct + '%';
  document.getElementById('progFill').style.width = pct + '%';

  document.getElementById('progSubText').textContent =
    `সম্পূর্ণ সঞ্চয় লক্ষ্যের ${pct}% অর্জিত হয়েছে`;

  document.getElementById('pfCollected').textContent =
    '৳' + grandTotal.toLocaleString('en-IN');
  document.getElementById('pfAvg').textContent =
    '৳' + Math.round(grandTotal / (new Set(
      /* মাসের সংখ্যা */
      Array.from({ length: 12 }, (_, i) => i)
    ).size || 1)).toLocaleString('en-IN');
  document.getElementById('pfRemaining').textContent =
    '৳' + Math.max(target - grandTotal, 0).toLocaleString('en-IN');
}

/* ══════════════════════════════════════════════
   RANKING CARDS
══════════════════════════════════════════════ */
function updateRanking(memberStats) {
  if (!memberStats.length) return;

  /* সর্বোচ্চ মোট জমা */
  const topTotal  = memberStats[0];
  /* সর্বনিম্ন মোট জমা */
  const lowTotal  = memberStats[memberStats.length - 1];
  /* একক কিস্তিতে সর্বোচ্চ */
  const allTxns   = memberStats.flatMap(m => m.txns);
  const maxSingle = allTxns.length
    ? allTxns.reduce((a, b) =>
        Number(a.amount) > Number(b.amount) ? a : b)
    : null;
  /* সর্বাধিক কিস্তিদাতা */
  const mostCount = [...memberStats]
    .sort((a, b) => b.count - a.count)[0];

  const html = `
    <div class="rank-card rc-gold">
      <span class="rc-badge">🥇</span>
      <div class="rc-label">সর্বোচ্চ সঞ্চয়</div>
      <div class="rc-name">${topTotal.name}</div>
      <div class="rc-amount">৳${topTotal.total.toLocaleString('en-IN')}</div>
      <div class="rc-date">${topTotal.count} টি কিস্তি</div>
    </div>

    <div class="rank-card rc-red">
      <span class="rc-badge">📉</span>
      <div class="rc-label">সর্বনিম্ন সঞ্চয়</div>
      <div class="rc-name">${lowTotal.name}</div>
      <div class="rc-amount">৳${lowTotal.total.toLocaleString('en-IN')}</div>
      <div class="rc-date">${lowTotal.count} টি কিস্তি</div>
    </div>

    ${maxSingle ? `
    <div class="rank-card rc-gold">
      <span class="rc-badge">⚡</span>
      <div class="rc-label">একক সর্বোচ্চ কিস্তি</div>
      <div class="rc-name">${maxSingle.memberName}</div>
      <div class="rc-amount">
        ৳${Number(maxSingle.amount).toLocaleString('en-IN')}
      </div>
      <div class="rc-date">${fmtDate(maxSingle.date)}</div>
    </div>` : ''}

    <div class="rank-card rc-gold" style="
      background:linear-gradient(135deg,#f0fff4,#e8f5e9);
      border-color:rgba(26,92,56,.2);">
      <span class="rc-badge">🏅</span>
      <div class="rc-label" style="color:var(--g-main);">
        বেশি কিস্তিদাতা
      </div>
      <div class="rc-name">${mostCount.name}</div>
      <div class="rc-amount" style="color:var(--g-main);">
        ${mostCount.count} টি কিস্তি
      </div>
      <div class="rc-date">
        ৳${mostCount.total.toLocaleString('en-IN')} মোট
      </div>
    </div>
  `;

  document.getElementById('rankGrid').innerHTML = html;
}

/* ══════════════════════════════════════════════
   MEMBER LIST
══════════════════════════════════════════════ */
function renderMemberList(memberStats, grandTotal) {
  const container = document.getElementById('memberList');

  if (!memberStats.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="em-icon">👥</div>
        <p>কোনো সদস্য পাওয়া যায়নি</p>
      </div>`;
    return;
  }

  container.innerHTML = memberStats.map((m, i) => {
    const pct     = grandTotal > 0
      ? Math.round(m.total / grandTotal * 100) : 0;
    const avatar  = m.name.trim().charAt(0);
    const rankCls = i === 0 ? 'rk-1'
      : i === 1 ? 'rk-2'
      : i === 2 ? 'rk-3'
      : 'rk-n';
    const rankTxt = i === 0 ? '🥇'
      : i === 1 ? '🥈'
      : i === 2 ? '🥉'
      : (i + 1);

    const lastStr = m.lastDate
      ? fmtDate(m.lastDate) : 'এখনো নেই';

    return `
      <div class="member-row"
           onclick="goToMember('${m.id}')"
           style="animation-delay:${i * 0.06}s">
        <div class="m-rank ${rankCls}">${rankTxt}</div>
        <div class="m-avatar">${avatar}</div>
        <div class="m-info">
          <div class="m-name">${m.name}</div>
          <div class="m-meta">
            ${m.count} কিস্তি &nbsp;|&nbsp; শেষ: ${lastStr}
          </div>
          <div class="m-mini-track">
            <div class="m-mini-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="m-right">
          <div class="m-amount">
            ৳${m.total.toLocaleString('en-IN')}
          </div>
          <div class="m-pct">${pct}%</div>
        </div>
        <div class="m-arrow">›</div>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════════════
   MONTHLY TABLE
══════════════════════════════════════════════ */
function renderMonthlyTable(monthly) {
  const body = document.getElementById('monthlyBody');
  if (!monthly.length) {
    body.innerHTML = `
      <tr><td colspan="4" style="text-align:center;
        color:var(--gray-400);padding:20px;">
        কোনো তথ্য নেই
      </td></tr>`;
    return;
  }

  const maxTotal = Math.max(...monthly.map(m => m.total));

  body.innerHTML = monthly
    .slice()
    .reverse() /* সর্বশেষ মাস আগে */
    .map(m => {
      const pct = maxTotal > 0
        ? Math.round(m.total / maxTotal * 100) : 0;
      return `
        <tr>
          <td>${fmtMonth(m.month)}</td>
          <td>${m.count} টি</td>
          <td class="month-bar-cell">
            <div class="month-mini-bar">
              <div class="month-mini-fill"
                   style="width:${pct}%"></div>
            </div>
          </td>
          <td>৳${m.total.toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');
}

/* ══════════════════════════════════════════════
   RECENT LIST
══════════════════════════════════════════════ */
function renderRecentList(transactions) {
  const container = document.getElementById('recentList');
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  if (!recent.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="em-icon">📋</div>
        <p>কোনো লেনদেন নেই</p>
      </div>`;
    return;
  }

  container.innerHTML = recent.map((t, i) => `
    <div class="recent-item"
         style="animation-delay:${i * 0.05}s">
      <div class="ri-icon">💵</div>
      <div class="ri-info">
        <div class="ri-name">${t.memberName}</div>
        <div class="ri-date">📅 ${fmtDate(t.date)}</div>
        ${t.note
          ? `<div class="ri-note">💬 ${t.note}</div>`
          : ''}
      </div>
      <div class="ri-amount">
        +৳${Number(t.amount).toLocaleString('en-IN')}
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════
   CHARTS
══════════════════════════════════════════════ */
function renderCharts(memberStats, monthly, grandTotal) {
  renderDonut(memberStats, grandTotal);
  renderBar(memberStats);
  renderLine(monthly);
}

/* ── Donut Chart ── */
function renderDonut(memberStats, grandTotal) {
  const ctx = document.getElementById('donutChart').getContext('2d');

  const labels  = memberStats.map(m => m.name);
  const values  = memberStats.map(m => m.total);
  const colors  = memberStats.map(m => m.color);

  document.getElementById('donutCenterVal').textContent =
    '৳' + grandTotal.toLocaleString('en-IN');

  if (chartDonut) {
    chartDonut.data.labels         = labels;
    chartDonut.data.datasets[0].data            = values;
    chartDonut.data.datasets[0].backgroundColor = colors;
    chartDonut.update('active');
    return;
  }

  chartDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data            : values,
        backgroundColor : colors,
        borderColor     : '#ffffff',
        borderWidth     : 3,
        hoverBorderWidth: 4,
        hoverOffset     : 10,
      }],
    },
    options: {
      responsive       : true,
      maintainAspectRatio: false,
      cutout           : '68%',
      animation        : { animateScale: true, duration: 1200 },
      plugins: {
        legend: {
          position : 'bottom',
          labels   : {
            font      : { family: "'Hind Siliguri', sans-serif",
                          size: 12 },
            padding   : 14,
            usePointStyle: true,
            pointStyle: 'circle',
            /* নাম ছোট করো */
            formatter : (value) =>
              value.length > 10
                ? value.substring(0, 10) + '...'
                : value,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = grandTotal > 0
                ? Math.round(ctx.parsed / grandTotal * 100) : 0;
              return ` ৳${ctx.parsed.toLocaleString('en-IN')} (${pct}%)`;
            },
          },
          titleFont: { family: "'Hind Siliguri', sans-serif" },
          bodyFont : { family: "'Hind Siliguri', sans-serif" },
        },
      },
    },
  });
}

/* ── Bar Chart ── */
function renderBar(memberStats) {
  const ctx = document.getElementById('barChart').getContext('2d');

  const labels = memberStats.map(m =>
    m.name.length > 8 ? m.name.substring(0, 8) + '…' : m.name
  );
  const values = memberStats.map(m => m.total);
  const colors = memberStats.map(m => m.color);

  if (chartBar) {
    chartBar.data.labels           = labels;
    chartBar.data.datasets[0].data = values;
    chartBar.update('active');
    return;
  }

  chartBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label          : 'মোট সঞ্চয় (৳)',
        data           : values,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor    : colors,
        borderWidth    : 2,
        borderRadius   : 8,
        borderSkipped  : false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation : { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx =>
              ` ৳${ctx.parsed.y.toLocaleString('en-IN')}`,
          },
          titleFont: { family: "'Hind Siliguri', sans-serif" },
          bodyFont : { family: "'Hind Siliguri', sans-serif" },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font    : { family: "'Hind Siliguri', sans-serif",
                        size: 11 },
            maxRotation: 30,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color    : 'rgba(0,0,0,.06)',
            drawBorder: false,
          },
          ticks: {
            font     : { family: "'Hind Siliguri', sans-serif",
                         size: 11 },
            callback : v => '৳' + v.toLocaleString('en-IN'),
          },
        },
      },
    },
  });
}

/* ── Line Chart ── */
function renderLine(monthly) {
  const ctx = document.getElementById('lineChart').getContext('2d');

  const labels = monthly.map(m => fmtMonth(m.month));
  const values = monthly.map(m => m.total);

  /* Gradient fill */
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(26,92,56,.35)');
  gradient.addColorStop(1, 'rgba(26,92,56,.02)');

  if (chartLine) {
    chartLine.data.labels           = labels;
    chartLine.data.datasets[0].data = values;
    chartLine.update('active');
    return;
  }

  chartLine = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label          : 'মাসিক সঞ্চয়',
        data           : values,
        borderColor    : '#1a5c38',
        backgroundColor: gradient,
        borderWidth    : 2.5,
        pointRadius    : 5,
        pointBackgroundColor: '#c8973e',
        pointBorderColor    : '#ffffff',
        pointBorderWidth    : 2,
        tension        : 0.4,
        fill           : true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation : { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx =>
              ` ৳${ctx.parsed.y.toLocaleString('en-IN')}`,
          },
          titleFont: { family: "'Hind Siliguri', sans-serif" },
          bodyFont : { family: "'Hind Siliguri', sans-serif" },
        },
      },
      scales: {
        x: {
          grid : { display: false },
          ticks: {
            font: { family: "'Hind Siliguri', sans-serif",
                    size: 11 },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color    : 'rgba(0,0,0,.06)',
            drawBorder: false,
          },
          ticks: {
            font    : { family: "'Hind Siliguri', sans-serif",
                        size: 11 },
            callback: v => '৳' + v.toLocaleString('en-IN'),
          },
        },
      },
    },
  });
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */

/* তারিখ বাংলায় */
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d)) return str;
  const months = [
    'জানু','ফেব্রু','মার্চ','এপ্রিল',
    'মে','জুন','জুলাই','আগস্ট',
    'সেপ্ট','অক্টো','নভে','ডিসে',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* মাস বাংলায় */
function fmtMonth(str) {
  if (!str) return '';
  const [y, m] = str.split('-');
  const months = [
    '','জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল',
    'মে','জুন','জুলাই','আগস্ট',
    'সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
  ];
  return months[+m] + ' ' + y;
}

/* Count-Up Animation */
function countUp(el, target, duration = 1200) {
  const start = performance.now();
  const update = now => {
    const t   = Math.min((now - start) / duration, 1);
    const val = Math.floor((1 - Math.pow(1 - t, 3)) * target);
    el.textContent = '৳' + val.toLocaleString('en-IN');
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* Last Updated টেক্সট */
function updateTimestamp(iso) {
  const el = document.getElementById('lastUpdatedText');
  if (!iso) { el.textContent = ''; return; }
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)       el.textContent = `${diff} সেকেন্ড আগে`;
  else if (diff < 3600) el.textContent = `${Math.floor(diff/60)} মিনিট আগে`;
  else                  el.textContent = `${Math.floor(diff/3600)} ঘণ্টা আগে`;
}

/* সদস্যের পেজে যাও */
function goToMember(id) {
  sessionStorage.setItem('member_id', id);
  window.location.href = 'member.html';
}

/* Toast */
function showToast(msg, duration = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

/* Error State */
function showErrorState() {
  document.getElementById('skeletonWrap').innerHTML = `
    <div class="error-state">
      <div class="er-icon">⚠️</div>
      <h3>তথ্য লোড করতে সমস্যা হয়েছে</h3>
      <p>ইন্টারনেট সংযোগ যাচাই করুন এবং পুনরায় চেষ্টা করুন।</p>
      <button class="btn-retry" onclick="location.reload()">
        🔄 আবার চেষ্টা করুন
      </button>
    </div>`;
}

/* Network listener */
function setupNetwork() {
  const bar = document.getElementById('offlineBar');
  window.addEventListener('offline', () => {
    bar.classList.add('show');
    showToast('📵 ইন্টারনেট সংযোগ নেই');
  });
  window.addEventListener('online', async () => {
    bar.classList.remove('show');
    showToast('✅ সংযোগ পুনরুদ্ধার হয়েছে');
    await loadDashboard();
  });
  if (!navigator.onLine) bar.classList.add('show');
}
