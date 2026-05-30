/* ════════════════════════════════════════════════
   MEMBER.JS
   তরিকায়ে খাস মোজাদ্দেদিয়া — সিলেট কাফেলা
   ব্যক্তিগত বিস্তারিত হিসাব
════════════════════════════════════════════════ */

'use strict';

/* ── State ── */
let memberData      = null;   /* নির্বাচিত সদস্য */
let allTxns         = [];     /* এই সদস্যের সব লেনদেন */
let filteredTxns    = [];     /* ফিল্টার করা লেনদেন */
let grandTotal      = 0;      /* পুরো তহবিলের মোট */
let memberRank      = 0;      /* এই সদস্যের র‍্যাংক */
let memberBarChart  = null;   /* চার্ট ইন্সট্যান্স */

/* ── Chart Colors ── */
const MONTH_COLORS = [
  '#1a5c38','#c8973e','#1a6fa0','#6c3483',
  '#117a65','#922b21','#1f618d','#d35400',
];

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  /* অ্যাক্সেস যাচাই */
  if (!requireAuth()) return;

  /* সদস্যের ID নাও */
  const memberId = sessionStorage.getItem('member_id');
  if (!memberId) {
    window.location.href = 'dashboard.html';
    return;
  }

  /* নেটওয়ার্ক */
  setupNetwork();

  /* ডেটা লোড */
  await loadMember(memberId);
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

function logout() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}

function goBack() {
  window.location.href = 'dashboard.html';
}

/* ══════════════════════════════════════════════
   NETWORK
══════════════════════════════════════════════ */
function setupNetwork() {
  const bar = document.getElementById('offlineBar');
  window.addEventListener('offline', () => {
    bar.classList.add('show');
  });
  window.addEventListener('online', () => {
    bar.classList.remove('show');
  });
  if (!navigator.onLine) bar.classList.add('show');
}

/* ══════════════════════════════════════════════
   MAIN LOADER
══════════════════════════════════════════════ */
async function loadMember(memberId) {
  try {
    const data = await fetchAllData();
    const { members, transactions } = data;

    /* নির্দিষ্ট সদস্য খোঁজো */
    const member = members.find(
      m => String(m.id) === String(memberId)
    );
    if (!member) {
      window.location.href = 'dashboard.html';
      return;
    }

    /* এই সদস্যের লেনদেন */
    allTxns = transactions
      .filter(t => String(t.memberId) === String(memberId))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredTxns = [...allTxns];

    /* মোট তহবিল */
    grandTotal = transactions
      .reduce((s, t) => s + Number(t.amount), 0);

    /* র‍্যাংক হিসাব */
    const memberTotals = members.map(m => ({
      id   : m.id,
      total: transactions
        .filter(t => String(t.memberId) === String(m.id))
        .reduce((s, t) => s + Number(t.amount), 0),
    })).sort((a, b) => b.total - a.total);

    memberRank = memberTotals
      .findIndex(m => String(m.id) === String(memberId)) + 1;

    memberData = member;

    /* UI আপডেট */
    renderProfile(member, memberRank);
    renderStats();
    renderContribution();
    renderHighlights();
    buildFilterChips();
    renderMonthlyTable();
    renderTransactions(allTxns);
    renderBarChart();

    /* Skeleton লুকাও */
    document.getElementById('skeletonWrap').style.display = 'none';
    document.getElementById('contentWrap').style.display  = 'block';

    /* পেজ টাইটেল */
    document.title = member.name + ' — কাফেলা তহবিল';

  } catch (err) {
    console.error('Member load error:', err);
    showError();
  }
}

/* ══════════════════════════════════════════════
   DATA FETCH
══════════════════════════════════════════════ */
async function fetchAllData() {

  /* config.js থেকে API URL */
  const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_URL
    && CONFIG.API_URL !== 'YOUR_APPS_SCRIPT_URL_HERE')
    ? CONFIG.API_URL : null;

  if (!apiUrl) return getDemoData();

  const res  = await fetch(apiUrl, { cache: 'no-store' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

/* ══════════════════════════════════════════════
   DEMO DATA
══════════════════════════════════════════════ */
function getDemoData() {
  return {
    success: true,
    members: [
      { id:'1', name:'মোঃ রাহিম উদ্দিন',  joinDate:'2025-01-01' },
      { id:'2', name:'মোঃ করিম মিয়া',     joinDate:'2025-01-01' },
      { id:'3', name:'মোঃ জলিল আহমেদ',   joinDate:'2025-01-05' },
      { id:'4', name:'মোঃ সালাম শেখ',     joinDate:'2025-01-10' },
      { id:'5', name:'মোঃ আলম হোসেন',    joinDate:'2025-02-01' },
    ],
    transactions: [
      {id:1, memberId:'1',memberName:'মোঃ রাহিম উদ্দিন', amount:3000,date:'2025-01-10',note:'জানুয়ারি কিস্তি'},
      {id:2, memberId:'2',memberName:'মোঃ করিম মিয়া',    amount:2000,date:'2025-01-12',note:''},
      {id:3, memberId:'3',memberName:'মোঃ জলিল আহমেদ',  amount:2500,date:'2025-01-15',note:''},
      {id:4, memberId:'4',memberName:'মোঃ সালাম শেখ',    amount:1500,date:'2025-01-18',note:''},
      {id:5, memberId:'5',memberName:'মোঃ আলম হোসেন',   amount:500, date:'2025-01-20',note:'আংশিক'},
      {id:6, memberId:'1',memberName:'মোঃ রাহিম উদ্দিন', amount:2000,date:'2025-02-05',note:'ফেব্রুয়ারি'},
      {id:7, memberId:'2',memberName:'মোঃ করিম মিয়া',    amount:3000,date:'2025-02-08',note:''},
      {id:8, memberId:'3',memberName:'মোঃ জলিল আহমেদ',  amount:2000,date:'2025-02-10',note:''},
      {id:9, memberId:'4',memberName:'মোঃ সালাম শেখ',    amount:2500,date:'2025-02-14',note:''},
      {id:10,memberId:'5',memberName:'মোঃ আলম হোসেন',   amount:1000,date:'2025-02-18',note:''},
      {id:11,memberId:'1',memberName:'মোঃ রাহিম উদ্দিন', amount:3500,date:'2025-03-03',note:'মার্চ'},
      {id:12,memberId:'2',memberName:'মোঃ করিম মিয়া',    amount:1500,date:'2025-03-07',note:''},
      {id:13,memberId:'3',memberName:'মোঃ জলিল আহমেদ',  amount:3000,date:'2025-03-12',note:''},
      {id:14,memberId:'4',memberName:'মোঃ সালাম শেখ',    amount:2000,date:'2025-03-15',note:''},
      {id:15,memberId:'5',memberName:'মোঃ আলম হোসেন',   amount:800, date:'2025-03-20',note:''},
    ],
    settings: { totalTarget: 50000 },
    lastUpdated: new Date().toISOString(),
  };
}

/* ══════════════════════════════════════════════
   RENDER — PROFILE
══════════════════════════════════════════════ */
function renderProfile(member, rank) {
  document.getElementById('profileAvatar').textContent =
    member.name.trim().charAt(0);
  document.getElementById('profileName').textContent =
    member.name;
  document.getElementById('profileSince').textContent =
    'যোগদান: ' + fmtDate(member.joinDate);

  const rankEmoji =
    rank === 1 ? '🥇' :
    rank === 2 ? '🥈' :
    rank === 3 ? '🥉' :
    '#' + rank;
  document.getElementById('profileRank').textContent = rankEmoji;
}

/* ══════════════════════════════════════════════
   RENDER — STATS
══════════════════════════════════════════════ */
function renderStats() {
  if (!allTxns.length) {
    setTxt('msTotal',   '৳০');
    setTxt('msCount',   '০ বার');
    setTxt('msMax',     '৳০');
    setTxt('msMin',     '৳০');
    setTxt('msAvg',     '৳০');
    setTxt('msLast',    'নেই');
    setTxt('msLastAmt', '--');
    return;
  }

  const amounts  = allTxns.map(t => Number(t.amount));
  const total    = amounts.reduce((s, a) => s + a, 0);
  const count    = allTxns.length;
  const max      = Math.max(...amounts);
  const min      = Math.min(...amounts);
  const avg      = Math.round(total / count);

  /* সর্বোচ্চ ও সর্বনিম্ন লেনদেন */
  const maxTxn   = allTxns[amounts.indexOf(max)];
  const minTxn   = allTxns[amounts.indexOf(min)];

  /* শেষ লেনদেন (তারিখ অনুযায়ী) */
  const lastTxn  = [...allTxns]
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  /* Count-up animation */
  countUp(document.getElementById('msTotal'), total);

  setTxt('msTotalSub',
    `তহবিলের ${pct(total, grandTotal)}%`);
  setTxt('msCount',   count + ' বার');
  setTxt('msCountSub',
    `মোট ${monthList().length} মাসে`);
  setTxt('msMax',
    '৳' + max.toLocaleString('en-IN'));
  setTxt('msMaxDate',
    maxTxn ? fmtDateSm(maxTxn.date) : '--');
  setTxt('msMin',
    '৳' + min.toLocaleString('en-IN'));
  setTxt('msMinDate',
    minTxn ? fmtDateSm(minTxn.date) : '--');
  setTxt('msAvg',
    '৳' + avg.toLocaleString('en-IN'));
  setTxt('msLast',
    lastTxn ? fmtDateSm(lastTxn.date) : 'নেই');
  setTxt('msLastAmt',
    lastTxn
      ? '৳' + Number(lastTxn.amount).toLocaleString('en-IN')
      : '--');
}

/* ══════════════════════════════════════════════
   RENDER — CONTRIBUTION
══════════════════════════════════════════════ */
function renderContribution() {
  const total   = allTxns.reduce((s,t) => s + Number(t.amount), 0);
  const share   = grandTotal > 0
    ? Math.round(total / grandTotal * 100) : 0;

  document.getElementById('contribPct').textContent  = share + '%';
  document.getElementById('contribFill').style.width = share + '%';
  document.getElementById('contribGrand').textContent =
    '৳' + grandTotal.toLocaleString('en-IN');
  document.getElementById('contribOwn').textContent  =
    '৳' + total.toLocaleString('en-IN');
}

/* ══════════════════════════════════════════════
   RENDER — HIGHLIGHTS
══════════════════════════════════════════════ */
function renderHighlights() {
  if (!allTxns.length) return;

  const amounts  = allTxns.map(t => Number(t.amount));
  const total    = amounts.reduce((s,a) => s+a, 0);
  const max      = Math.max(...amounts);
  const min      = Math.min(...amounts);
  const maxTxn   = allTxns[amounts.indexOf(max)];
  const minTxn   = allTxns[amounts.indexOf(min)];

  /* প্রথম ও শেষ কিস্তি */
  const sorted   = [...allTxns]
    .sort((a,b) => new Date(a.date) - new Date(b.date));
  const firstTxn = sorted[0];
  const lastTxn  = sorted[sorted.length - 1];

  document.getElementById('highlightGrid').innerHTML = `

    <div class="hl-card hl-green">
      <span class="hl-badge">🏆</span>
      <div class="hl-label">সর্বোচ্চ এককালীন</div>
      <div class="hl-value">
        ৳${max.toLocaleString('en-IN')}
      </div>
      <div class="hl-date">${fmtDate(maxTxn.date)}</div>
    </div>

    <div class="hl-card hl-red">
      <span class="hl-badge">📉</span>
      <div class="hl-label">সর্বনিম্ন এককালীন</div>
      <div class="hl-value">
        ৳${min.toLocaleString('en-IN')}
      </div>
      <div class="hl-date">${fmtDate(minTxn.date)}</div>
    </div>

    <div class="hl-card hl-blue">
      <span class="hl-badge">🌱</span>
      <div class="hl-label">প্রথম কিস্তি</div>
      <div class="hl-value">
        ৳${Number(firstTxn.amount).toLocaleString('en-IN')}
      </div>
      <div class="hl-date">${fmtDate(firstTxn.date)}</div>
    </div>

    <div class="hl-card hl-gold">
      <span class="hl-badge">🕐</span>
      <div class="hl-label">সর্বশেষ কিস্তি</div>
      <div class="hl-value">
        ৳${Number(lastTxn.amount).toLocaleString('en-IN')}
      </div>
      <div class="hl-date">${fmtDate(lastTxn.date)}</div>
    </div>

  `;
}

/* ══════════════════════════════════════════════
   RENDER — BAR CHART (মাসওয়ারি)
══════════════════════════════════════════════ */
function renderBarChart() {
  const monthly = monthlyData();
  const ctx = document
    .getElementById('memberBarChart')
    .getContext('2d');

  const labels = monthly.map(m => fmtMonthSm(m.month));
  const values = monthly.map(m => m.total);
  const colors = monthly.map((_, i) =>
    MONTH_COLORS[i % MONTH_COLORS.length]);

  if (memberBarChart) {
    memberBarChart.data.labels           = labels;
    memberBarChart.data.datasets[0].data = values;
    memberBarChart.update('active');
    return;
  }

  memberBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label          : 'মাসিক জমা (৳)',
        data           : values,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor    : colors,
        borderWidth    : 2,
        borderRadius   : 8,
        borderSkipped  : false,
      }],
    },
    options: {
      responsive           : true,
      maintainAspectRatio  : false,
      animation: {
        duration: 1200,
        easing  : 'easeOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => fmtMonth(monthly[ctx[0].dataIndex].month),
            label: ctx =>
              ` ৳${ctx.parsed.y.toLocaleString('en-IN')}`,
            afterLabel: ctx => {
              const m = monthly[ctx.dataIndex];
              return ` ${m.count} টি কিস্তি`;
            },
          },
          titleFont: {
            family: "'Hind Siliguri', sans-serif",
          },
          bodyFont: {
            family: "'Hind Siliguri', sans-serif",
          },
        },
      },
      scales: {
        x: {
          grid : { display: false },
          ticks: {
            font: {
              family: "'Hind Siliguri', sans-serif",
              size  : 11,
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color    : 'rgba(0,0,0,.06)',
            drawBorder: false,
          },
          ticks: {
            font    : {
              family: "'Hind Siliguri', sans-serif",
              size  : 11,
            },
            callback: v =>
              '৳' + v.toLocaleString('en-IN'),
          },
        },
      },
    },
  });
}

/* ══════════════════════════════════════════════
   RENDER — MONTHLY TABLE
══════════════════════════════════════════════ */
function renderMonthlyTable() {
  const monthly = monthlyData().slice().reverse();
  const body    = document.getElementById('monthlyBody');

  if (!monthly.length) {
    body.innerHTML = `
      <tr><td colspan="3"
        style="text-align:center;color:var(--gray-400);
               padding:20px;">
        কোনো তথ্য নেই
      </td></tr>`;
    return;
  }

  const maxTotal = Math.max(...monthly.map(m => m.total));

  body.innerHTML = monthly.map(m => {
    const share = maxTotal > 0
      ? Math.round(m.total / maxTotal * 100) : 0;
    return `
      <tr>
        <td>${fmtMonth(m.month)}</td>
        <td>${m.count} টি</td>
        <td>
          ৳${m.total.toLocaleString('en-IN')}
          <div style="height:4px;background:var(--gray-100);
                      border-radius:4px;margin-top:4px;
                      overflow:hidden;">
            <div style="height:100%;width:${share}%;
                        background:linear-gradient(90deg,
                          var(--g-main),var(--g-light));
                        border-radius:4px;"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ══════════════════════════════════════════════
   RENDER — TRANSACTIONS
══════════════════════════════════════════════ */
function renderTransactions(txns) {
  const container = document.getElementById('txnList');
  document.getElementById('txnCount').textContent =
    txns.length + ' টি';

  if (!txns.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="em-icon">📭</div>
        <p>এই সময়ে কোনো লেনদেন নেই</p>
      </div>`;
    return;
  }

  /* সর্বোচ্চ ও সর্বনিম্ন */
  const amounts = txns.map(t => Number(t.amount));
  const max     = Math.max(...amounts);
  const min     = Math.min(...amounts);

  /* Running total (পুরনো থেকে নতুন) */
  const oldestFirst = [...txns]
    .sort((a,b) => new Date(a.date) - new Date(b.date));
  const runningMap  = {};
  let running = 0;
  oldestFirst.forEach(t => {
    running += Number(t.amount);
    runningMap[t.id] = running;
  });

  /* প্রথম ও শেষ id */
  const firstId = oldestFirst[0]?.id;
  const lastId  = oldestFirst[oldestFirst.length - 1]?.id;

  container.innerHTML = txns.map((t, i) => {
    const amt      = Number(t.amount);
    const isMax    = amt === max && amounts.length > 1;
    const isMin    = amt === min && amounts.length > 1;
    const isFirst  = String(t.id) === String(firstId);
    const isLast   = String(t.id) === String(lastId)
                     && txns.length > 1;

    /* CSS class */
    const itemClass = isMax ? 'is-max' : isMin ? 'is-min' : '';

    /* Badge */
    const badges = [];
    if (isMax)   badges.push(`<span class="badge b-max">সর্বোচ্চ 🏆</span>`);
    if (isMin)   badges.push(`<span class="badge b-min">সর্বনিম্ন</span>`);
    if (isFirst) badges.push(`<span class="badge b-first">প্রথম কিস্তি</span>`);
    if (isLast)  badges.push(`<span class="badge b-last">সর্বশেষ</span>`);

    /* উচ্চ/নিম্ন (গড়ের তুলনায়) */
    const avgVal = amounts.reduce((s,a) => s+a, 0) / amounts.length;
    if (!isMax && !isMin && amt > avgVal * 1.2) {
      badges.push(`<span class="badge b-high">গড়ের বেশি</span>`);
    }

    return `
      <div class="txn-item ${itemClass}"
           style="animation-delay:${Math.min(i * 0.04, 0.5)}s">

        <div class="txn-num">${txns.length - i}</div>

        <div class="txn-info">
          <div class="txn-date">
            📅 ${fmtDate(t.date)}
          </div>
          ${t.note
            ? `<div class="txn-note">💬 ${t.note}</div>`
            : ''}
          ${badges.length
            ? `<div class="txn-badges">${badges.join('')}</div>`
            : ''}
        </div>

        <div class="txn-right">
          <div class="txn-amount">
            ৳${amt.toLocaleString('en-IN')}
          </div>
          <div class="txn-running">
            মোট: ৳${(runningMap[t.id] || 0)
              .toLocaleString('en-IN')}
          </div>
        </div>

      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════════════
   FILTER
══════════════════════════════════════════════ */
function buildFilterChips() {
  const bar     = document.getElementById('filterBar');
  const months  = monthList();

  months.forEach(month => {
    const btn = document.createElement('button');
    btn.className   = 'filter-chip';
    btn.dataset.filter = month;
    btn.textContent = fmtMonthSm(month);
    btn.onclick     = () => applyFilter(month, btn);
    bar.appendChild(btn);
  });
}

function applyFilter(filter, btn) {
  /* Active chip */
  document.querySelectorAll('.filter-chip').forEach(c =>
    c.classList.remove('active'));
  btn.classList.add('active');

  /* Filter */
  filteredTxns = filter === 'all'
    ? [...allTxns]
    : allTxns.filter(t => t.date.startsWith(filter));

  renderTransactions(filteredTxns);

  /* Chip এ স্ক্রোল করো */
  btn.scrollIntoView({
    behavior: 'smooth',
    block   : 'nearest',
    inline  : 'center',
  });
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */

/* মাসের তালিকা (পুরনো থেকে নতুন) */
function monthList() {
  return [...new Set(
    allTxns.map(t => t.date.substring(0, 7))
  )].sort();
}

/* মাসওয়ারি সমষ্টি */
function monthlyData() {
  const map = {};
  allTxns.forEach(t => {
    const k = t.date.substring(0, 7);
    if (!map[k]) map[k] = { month: k, total: 0, count: 0 };
    map[k].total += Number(t.amount);
    map[k].count++;
  });
  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month));
}

/* শতাংশ */
function pct(val, total) {
  if (!total) return 0;
  return Math.round(val / total * 100);
}

/* তারিখ বাংলায় (পূর্ণ) */
function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d)) return str;
  const months = [
    'জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল',
    'মে','জুন','জুলাই','আগস্ট',
    'সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* তারিখ ছোট (স্ট্যাট কার্ডের জন্য) */
function fmtDateSm(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  if (isNaN(d)) return str;
  const m = [
    'জানু','ফেব্রু','মার্চ','এপ্রিল',
    'মে','জুন','জুলাই','আগস্ট',
    'সেপ্ট','অক্টো','নভে','ডিসে',
  ];
  return `${d.getDate()} ${m[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

/* মাস পূর্ণ */
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

/* মাস ছোট (চার্ট ও chip এর জন্য) */
function fmtMonthSm(str) {
  if (!str) return '';
  const [y, m] = str.split('-');
  const months = [
    '','জানু','ফেব্রু','মার্চ','এপ্রিল',
    'মে','জুন','জুলাই','আগস্ট',
    'সেপ্ট','অক্টো','নভে','ডিসে',
  ];
  return months[+m] + ' \'' + y.slice(2);
}

/* Count-Up Animation */
function countUp(el, target, duration = 1200) {
  const start = performance.now();
  const run = now => {
    const t   = Math.min((now - start) / duration, 1);
    const val = Math.floor((1 - Math.pow(1 - t, 3)) * target);
    el.textContent = '৳' + val.toLocaleString('en-IN');
    if (t < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}

/* setText shortcut */
function setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* Toast */
function showToast(msg, duration = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

/* Error */
function showError() {
  document.getElementById('skeletonWrap').innerHTML = `
    <div class="error-state">
      <div class="er-icon">⚠️</div>
      <h3>তথ্য লোড করতে সমস্যা হয়েছে</h3>
      <p>ইন্টারনেট সংযোগ যাচাই করুন।</p>
      <button class="btn-retry" onclick="location.reload()">
        🔄 আবার চেষ্টা করুন
      </button>
    </div>`;
}
