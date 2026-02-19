// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════
let salary = 0, userName = '', goals = [];
let pieChart, barChart;
let parsedTransactions = [];

// ═══════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════
function toggleTheme() {
  document.body.classList.toggle('light');
}

// ═══════════════════════════════════════════════
//  SALARY
// ═══════════════════════════════════════════════
function confirmSalary() {
  const v = parseFloat(document.getElementById('salaryInput').value);
  if (!isNaN(v) && v > 0) salary = v;
  userName = document.getElementById('nameInput').value.trim();
}

// ═══════════════════════════════════════════════
//  FILE UPLOAD HANDLER (.txt / .xml)
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('smsFileInput');
  const label     = document.getElementById('fileUploadLabel');

  fileInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      let text = e.target.result;

      // If XML (SMS Backup & Restore format), extract bodies
      if (file.name.endsWith('.xml') || text.trimStart().startsWith('<')) {
        text = parseXMLSMS(text);
      }

      document.getElementById('smsInput').value = text;

      // Update label UI
      label.classList.add('has-file');
      label.querySelector('.file-upload-title').textContent = `✓ ${file.name}`;
      label.querySelector('.file-upload-sub').textContent   = `${(file.size / 1024).toFixed(1)} KB loaded — ready to parse`;
      label.querySelector('.file-upload-arrow').textContent = '✓';

      // Auto-trigger parse
      parseSMS();
    };
    reader.readAsText(file);
  });
});

// Parse Android "SMS Backup & Restore" XML format
function parseXMLSMS(xmlText) {
  const lines = [];
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlText, 'application/xml');
    const smses  = doc.querySelectorAll('sms');
    smses.forEach(sms => {
      const body    = sms.getAttribute('body')   || '';
      const address = sms.getAttribute('address') || '';
      const date    = sms.getAttribute('readable_date') || '';
      // Only include bank-related SMS
      if (/debit|credit|debited|credited|Rs\.|INR/i.test(body)) {
        lines.push(body.trim());
      }
    });
  } catch (e) {
    // If XML parsing fails, return raw text as-is
    return xmlText;
  }
  return lines.join('\n\n');
}

// ═══════════════════════════════════════════════
//  CATEGORY RULES
// ═══════════════════════════════════════════════
const CATEGORIES = [
  {
    name: '🍔 Food & Dining',
    color: '#ff6b6b',
    budget_pct: 15,
    type: 'need',
    keywords: ['zomato','swiggy','blinkit','dunzo','uber eats','food','restaurant','cafe','biryani','pizza','burger','dhaba','kitchen','meals','tiffin','snacks','groceries','bigbasket','dmart','zepto','dominos','kfc','mcdonalds','subway','haldiram']
  },
  {
    name: '✈️ Travel & Transport',
    color: '#4d9fff',
    budget_pct: 10,
    type: 'need',
    keywords: ['uber','ola','rapido','redbus','irctc','flight','airline','indigo','spicejet','air india','metro','bus','railway','travel','cab','auto','petrol','fuel','diesel','fastag','toll']
  },
  {
    name: '🛍️ Shopping',
    color: '#ff9f1c',
    budget_pct: 10,
    type: 'want',
    keywords: ['amazon','flipkart','myntra','meesho','nykaa','ajio','shopping','mart','store','retail','mall','clothes','fashion','shoes','h&m','zara','decathlon','croma','reliance digital']
  },
  {
    name: '📋 Bills & Utilities',
    color: '#a78bfa',
    budget_pct: 20,
    type: 'need',
    keywords: ['electricity','water bill','gas bill','maintenance','rent','broadband','internet','jio','airtel','vi ','bsnl','bill','recharge','dth','postpaid','society','housing','bescom','msedcl','tata power','adani electric']
  },
  {
    name: '🎬 Entertainment',
    color: '#e040fb',
    budget_pct: 5,
    type: 'want',
    keywords: ['netflix','hotstar','amazon prime','spotify','youtube premium','zee5','sonyliv','subscription','membership','movie','pvr','inox','gaming','steam','bookmyshow']
  },
  {
    name: '🏥 Healthcare',
    color: '#26a69a',
    budget_pct: 5,
    type: 'need',
    keywords: ['apollo','medplus','pharmeasy','hospital','clinic','doctor','medicine','pharmacy','health','dental','pathlab','lab test','1mg','netmeds','practo']
  },
  {
    name: '💪 Fitness',
    color: '#00e5a0',
    budget_pct: 3,
    type: 'want',
    keywords: ['gym','fitness','cult','yoga','swimming','sports','crossfit','protein','supplement','gold\'s']
  },
  {
    name: '📚 Education',
    color: '#f48fb1',
    budget_pct: 5,
    type: 'need',
    keywords: ['byju','unacademy','coursera','udemy','school','college','fees','tuition','books','stationery','education','course','vedantu','toppr']
  },
  {
    name: '🏦 Finance & EMI',
    color: '#78909c',
    budget_pct: 20,
    type: 'need',
    keywords: ['emi','loan','credit card','repayment','insurance','lic','hdfc','icici','sbi','bank','finance','fd','mutual fund','sip','investment','bajaj finance','home loan','car loan']
  },
  {
    name: '🍺 Nightlife & Social',
    color: '#ff8a65',
    budget_pct: 5,
    type: 'want',
    keywords: ['bar','pub','nightclub','party','drinks','alcohol','liquor','hookah','lounge','beer','wine']
  },
  {
    name: '💵 Income / Credit',
    color: '#b0bec5',
    budget_pct: 0,
    type: 'income',
    keywords: ['salary','income','credit received','neft credit','imps credit','rtgs credit','credited','refund','cashback','interest credit','opening balance','reversal']
  },
];

function categorize(desc) {
  const d = (desc || '').toLowerCase();
  for (const c of CATEGORIES) {
    if (c.keywords.some(k => d.includes(k))) return c;
  }
  return { name: '📦 Others', color: '#546e7a', budget_pct: 2, type: 'want', keywords: [] };
}

// ═══════════════════════════════════════════════
//  SMS PATTERNS
// ═══════════════════════════════════════════════
const SMS_PATTERNS = [

  // ── HDFC ──
  {
    bank: 'HDFC',
    regex: /(?:HDFC\s*Bank[:\s]*)(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+debited\s+from\s+a\/c\s+\w+\s+on\s+([\d\-\/]+)\s+at\s+([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },
  {
    bank: 'HDFC',
    regex: /HDFC\s*Bank[:\s]*INR\s*(\d[\d,]*\.?\d*)\s+debited[^\.]*\.\s*Info:\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: null, desc: 2
  },
  {
    bank: 'HDFC',
    regex: /HDFC\s*Bank[:\s]*(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+credited[^\.]*\.\s*Info:\s*([^\.\n]+)/i,
    type: 'credit', amt: 1, date: null, desc: 2
  },

  // ── SBI ──
  {
    bank: 'SBI',
    regex: /SBI[:\s]+Your\s+a\/c\s+\w+\s+(?:is\s+)?debited\s+(?:by\s+)?(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+on\s+([\d\/\-]+)[^\.]*\.\s*Info:\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },
  {
    bank: 'SBI',
    regex: /SBI[:\s]+(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+credited\s+to\s+your\s+a\/c\s+\w+\s+on\s+([\d\/\-]+)[^\n]*/i,
    type: 'credit', amt: 1, date: 2, desc: 'Salary/Credit'
  },

  // ── ICICI ──
  {
    bank: 'ICICI',
    regex: /ICICI\s*Bank[:\s]*INR\s*(\d[\d,]*\.?\d*)\s+debited\s+from\s+account\s+\w+\s+on\s+([\d\-\/]+)[^\.]*\.\s*Info:\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },
  {
    bank: 'ICICI',
    regex: /ICICI\s*Bank[:\s]*Your\s+a\/c\s+\w+\s+has\s+been\s+debited\s+with\s+(?:INR|Rs\.?)\s*(\d[\d,]*\.?\d*)\s+on\s+([\d\/\-]+)\s+for\s+([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },
  {
    bank: 'ICICI',
    regex: /ICICI\s*Bank[:\s]*INR\s*(\d[\d,]*\.?\d*)\s+credited\s+to\s+(?:your\s+)?a\/c\s+\w+\s+on\s+([\d\-\/]+)[^\n]*/i,
    type: 'credit', amt: 1, date: 2, desc: 'Salary/Credit'
  },

  // ── AXIS ──
  {
    bank: 'Axis',
    regex: /Axis\s*Bank[:\s]*(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+debited\s+from\s+your\s+a\/c\s+\w+\s+on\s+([\d\/\-]+)\s+for\s+([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },
  {
    bank: 'Axis',
    regex: /Axis\s*Bank[:\s]*(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+has\s+been\s+debited\s+from\s+a\/c\s+\w+\s+on\s+([\d\/\-]+)[^\n]*/i,
    type: 'debit', amt: 1, date: 2, desc: 'Debit'
  },

  // ── KOTAK ──
  {
    bank: 'Kotak',
    regex: /Kotak[:\s]*Spent\s+(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+on\s+your\s+Kotak\s+\w+\s+Card\s+\w+\s+at\s+([^\s][^\n]+?)\s+on\s+([\d\-\w]+)/i,
    type: 'debit', amt: 1, date: 3, desc: 2
  },
  {
    bank: 'Kotak',
    regex: /Kotak[:\s]*(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+debited\s+from\s+(?:account|a\/c)\s+\w+\s+on\s+([\d\/\-]+)[^\.]*\.\s*(?:Remarks|Info):\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },

  // ── PNB ──
  {
    bank: 'PNB',
    regex: /PNB[:\s]+Dear\s+Customer[,\s]+(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+has\s+been\s+debited[^\.]*\.\s*(?:Ref|Info|Narration):\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: null, desc: 2
  },

  // ── YES BANK ──
  {
    bank: 'Yes Bank',
    regex: /YES\s*BANK[:\s]*(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)[-\/]*\s+debited\s+from\s+Acct\s+\w+\s+on\s+([\d\/\-]+)[^\.]*\.\s*Remarks:\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },

  // ── INDUSIND ──
  {
    bank: 'IndusInd',
    regex: /IndusInd\s*Bank[:\s]*(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+debited\s+from\s+your\s+account\s+\w+\s+on\s+([\d\/\-]+)\s+at\s+([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },

  // ── BOI / CANARA ──
  {
    bank: 'BOI',
    regex: /BOI[:\s]+(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+(?:has been\s+)?debited[^\.]*\.\s*(?:Narration|Info):\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: null, desc: 2
  },
  {
    bank: 'Canara',
    regex: /Canara\s*Bank[:\s]+(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+debited[^\.]*\.\s*(?:Narration|Info):\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: null, desc: 2
  },

  // ── GENERIC / UPI FALLBACKS ──
  {
    bank: 'UPI',
    regex: /(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+(?:has been\s+)?debited[^\.]*\.\s*(?:UPI|Ref|Info|Tran|Narration)[^:]*:\s*([^\.\n]+)/i,
    type: 'debit', amt: 1, date: null, desc: 2
  },
  {
    bank: 'Bank',
    regex: /[Dd]ebited\s+(?:INR|Rs\.?)\s*(\d[\d,]*\.?\d*)\s+from[^\.]*on\s+([\d\/\-]+)[^f]*for\s+([^\.\n]+)/i,
    type: 'debit', amt: 1, date: 2, desc: 3
  },
  {
    bank: 'Bank',
    regex: /(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)\s+(?:has been\s+)?credited\s+(?:to|in)\s+your\s+(?:a\/c|account)[^\n]*/i,
    type: 'credit', amt: 1, date: null, desc: 'Salary/Credit'
  },
];

// ═══════════════════════════════════════════════
//  DATE HELPERS
// ═══════════════════════════════════════════════
function normalizeDate(raw) {
  if (!raw) return today();
  raw = raw.trim();

  // DD-Mon-YY or DD-Mon-YYYY (e.g. 12-Mar-24)
  const monNames = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
  const monMatch = raw.match(/(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2,4})/);
  if (monMatch) {
    const [, d, m, y] = monMatch;
    const mm   = monNames[m.toLowerCase()] || '01';
    const yyyy = y.length === 2 ? '20' + y : y;
    return `${yyyy}-${mm}-${d.padStart(2,'0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const yyyy = y.length === 2 ? '20' + y : y;
    return `${yyyy}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // Already YYYY-MM-DD
  if (/\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  return today();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanAmount(str) {
  return parseFloat(str.replace(/,/g, ''));
}

function cleanDesc(str) {
  if (!str || typeof str !== 'string') return 'Unknown';
  return str.replace(/\s+/g, ' ').replace(/[\/\-]+$/, '').trim().slice(0, 60);
}

// ═══════════════════════════════════════════════
//  SMS PARSER
// ═══════════════════════════════════════════════
function parseSMSMessages(rawText) {
  const results = [];
  const messages = rawText
    .split(/\n{2,}|(?=\b(?:HDFC|SBI|ICICI|Axis|Kotak|PNB|YES|IndusInd|BOI|Canara|Union)\b)/g)
    .map(m => m.trim())
    .filter(m => m.length > 10);

  for (const msg of messages) {
    let matched = false;
    for (const p of SMS_PATTERNS) {
      const m = msg.match(p.regex);
      if (m) {
        const amount = cleanAmount(m[p.amt]);
        if (isNaN(amount) || amount <= 0) continue;

        const rawDesc = typeof p.desc === 'number' ? m[p.desc] : p.desc;
        const desc    = cleanDesc(rawDesc);
        const rawDate = p.date ? m[p.date] : null;
        const date    = normalizeDate(rawDate);
        const catObj  = categorize(desc);

        results.push({ date, desc, amount, type: p.type, bank: p.bank, catObj, raw: msg });
        matched = true;
        break;
      }
    }

    // Last-resort fallback for unmatched debit/credit messages
    if (!matched && /debit|credit|debited|credited/i.test(msg)) {
      const anyAmt = msg.match(/(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d*)/i);
      if (anyAmt) {
        const amount = cleanAmount(anyAmt[1]);
        const type   = /credit/i.test(msg) ? 'credit' : 'debit';
        results.push({
          date: today(), desc: 'Unrecognized Transaction',
          amount, type, bank: 'Unknown', catObj: categorize(''),
          raw: msg, unmatched: true
        });
      }
    }
  }
  return results;
}

// ═══════════════════════════════════════════════
//  PARSE BUTTON
// ═══════════════════════════════════════════════
function parseSMS() {
  const text   = document.getElementById('smsInput').value.trim();
  const status = document.getElementById('parseStatus');

  if (!text) {
    status.textContent = '⚠ Please paste some SMS messages first.';
    status.className = 'parse-status err';
    return;
  }

  parsedTransactions = parseSMSMessages(text);

  if (parsedTransactions.length === 0) {
    status.textContent = '✗ No transactions found. Check the SMS format.';
    status.className = 'parse-status err';
    return;
  }

  // Auto-detect salary from largest credit
  const bigCredit = parsedTransactions.filter(t => t.type === 'credit').sort((a, b) => b.amount - a.amount)[0];
  if (bigCredit && salary === 0) {
    salary = bigCredit.amount;
    document.getElementById('salaryInput').value = salary;
    document.getElementById('salaryDetected').style.display = 'block';
    document.getElementById('salaryDetected').textContent = `✓ Salary auto-detected from SMS credit: ₹${fmt(salary)}`;
  }

  status.textContent = `✓ ${parsedTransactions.length} transactions found`;
  status.className = 'parse-status ok';

  renderPreviewTable(parsedTransactions);
  document.getElementById('previewCard').style.display = 'block';
  document.getElementById('previewCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPreviewTable(txns) {
  document.getElementById('parsedCount').textContent = txns.length + ' found';
  document.getElementById('previewTableBody').innerHTML = txns.map(t => `
    <tr class="${t.unmatched ? 'unmatched-row' : ''}">
      <td>${t.date}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.desc}">${t.desc}</td>
      <td><span class="cat-pill" style="background:${t.catObj.color}22;color:${t.catObj.color}">${t.catObj.name}</span></td>
      <td class="${t.type === 'credit' ? 'amount-pos' : 'amount-neg'}">₹${fmt(t.amount)}</td>
      <td style="color:var(--muted);font-size:12px">${t.type === 'credit' ? '↑ Credit' : '↓ Debit'}</td>
      <td style="color:var(--muted);font-size:12px">${t.bank}</td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════
//  ANALYZE ALL
// ═══════════════════════════════════════════════
function analyzeAll() {
  if (!parsedTransactions.length) return;
  if (salary === 0) salary = 50000;

  const txns = parsedTransactions;
  let catTotals = {}, monthlyExp = {}, monthlySal = {}, totalSpent = 0;

  txns.forEach(t => {
    const month = t.date.substring(0, 7);
    if (t.type === 'debit' && t.catObj.type !== 'income') {
      catTotals[t.catObj.name] = catTotals[t.catObj.name] || { total: 0, color: t.catObj.color, pct: t.catObj.budget_pct };
      catTotals[t.catObj.name].total += t.amount;
      monthlyExp[month] = (monthlyExp[month] || 0) + t.amount;
      totalSpent += t.amount;
    } else if (t.type === 'credit') {
      monthlySal[month] = (monthlySal[month] || 0) + t.amount;
    }
  });

  window._currentTotalSpent = totalSpent;
  window._catTotals = catTotals;

  const sortedMonths = Object.keys(monthlyExp).sort();
  sortedMonths.forEach(m => { if (!monthlySal[m]) monthlySal[m] = salary; });

  document.getElementById('smsZone').style.display    = 'none';
  document.getElementById('previewCard').style.display = 'none';
  document.getElementById('dashboard').style.display   = 'block';

  renderHero(totalSpent);
  renderStats(txns, catTotals, totalSpent);
  renderBudgetAlloc(catTotals);
  renderCharts(catTotals, sortedMonths, monthlyExp, monthlySal);
  detectAnomalies(txns, catTotals, totalSpent, sortedMonths, monthlyExp);
  renderTopTable(txns);
  renderDefaultGoals(totalSpent);
  generateAIInsights(txns, catTotals, sortedMonths, monthlyExp, totalSpent);
  fireTransactionAlerts(txns, catTotals, totalSpent, sortedMonths, monthlyExp);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════
//  HERO
// ═══════════════════════════════════════════════
function renderHero(totalSpent) {
  const saved  = Math.max(salary - totalSpent, 0);
  const remain = salary - totalSpent;

  document.getElementById('heroSalary').textContent  = '₹' + fmt(salary);
  document.getElementById('chipSpent').textContent   = '₹' + fmt(totalSpent);
  document.getElementById('chipSaved').textContent   = '₹' + fmt(saved);
  document.getElementById('chipRemain').textContent  = remain >= 0 ? '₹' + fmt(remain) : '-₹' + fmt(Math.abs(remain));

  const cats     = window._catTotals || {};
  const needCats = ['🍔 Food & Dining','✈️ Travel & Transport','📋 Bills & Utilities','🏥 Healthcare','📚 Education','🏦 Finance & EMI'];
  let needsT = 0, wantsT = 0;
  for (const [k, v] of Object.entries(cats)) {
    if (needCats.includes(k)) needsT += v.total;
    else wantsT += v.total;
  }
  const savT = Math.max(salary - totalSpent, 0);
  const bars = [
    { label: '🏠 Needs',   amount: needsT, color: '#4d9fff' },
    { label: '🎉 Wants',   amount: wantsT, color: '#ff9f1c' },
    { label: '🏦 Savings', amount: savT,   color: '#00e5a0' },
  ];
  document.getElementById('allocBars').innerHTML = bars.map(b => {
    const pct = salary > 0 ? Math.min((b.amount / salary) * 100, 100) : 0;
    return `<div class="alloc-row">
      <div class="alloc-label">${b.label}</div>
      <div class="alloc-track"><div class="alloc-fill" style="width:${pct}%;background:${b.color}"></div></div>
      <div class="alloc-pct">${pct.toFixed(1)}%</div>
      <div class="alloc-amt">₹${fmt(b.amount)}</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════
function renderStats(txns, catTotals, totalSpent) {
  const expTxns = txns.filter(t => t.type === 'debit' && t.catObj.type !== 'income');
  const savRate = salary > 0 ? Math.max(((salary - totalSpent) / salary) * 100, 0) : 0;
  const biggest = [...expTxns].sort((a, b) => b.amount - a.amount)[0];
  let topCat = '', topAmt = 0;
  for (const [k, v] of Object.entries(catTotals)) if (v.total > topAmt) { topAmt = v.total; topCat = k; }

  animCount('stTotal', totalSpent, '₹');
  document.getElementById('stTxns').textContent     = expTxns.length + ' transactions';
  document.getElementById('stSavRate').textContent  = savRate.toFixed(1) + '%';
  animCount('stAvg', totalSpent / Math.max(expTxns.length, 1), '₹');
  if (biggest) {
    animCount('stBig', biggest.amount, '₹');
    document.getElementById('stBigDesc').textContent = biggest.desc.slice(0, 22);
  }
  document.getElementById('stTopCat').textContent    = topCat;
  document.getElementById('stTopCatAmt').textContent = '₹' + fmt(topAmt) + ' spent';
}

// ═══════════════════════════════════════════════
//  BUDGET ALLOC
// ═══════════════════════════════════════════════
function renderBudgetAlloc(catTotals) {
  document.getElementById('budgetMethodNote').textContent =
    `Budget suggestions are AI-calibrated using your salary (₹${fmt(salary)}) and a 50/30/20 framework adjusted to your spending pattern.`;

  document.getElementById('budgetAllocGrid').innerHTML = Object.entries(catTotals).map(([name, data]) => {
    const suggested = Math.round(salary * (data.pct / 100));
    const pct       = suggested > 0 ? Math.min((data.total / suggested) * 100, 150) : 0;
    const status    = pct > 110 ? 'over' : pct > 85 ? 'warn' : 'ok';
    return `<div class="budget-cat-card">
      <div class="bcc-top">
        <div class="bcc-name">${name}</div>
        <span class="bcc-badge ${status}">${status === 'over' ? '⚠ Over' : status === 'warn' ? '~ Near' : '✓ OK'}</span>
      </div>
      <div class="bcc-bar-track">
        <div class="bcc-bar-fill" style="width:${Math.min(pct,100)}%;background:${status === 'over' ? '#ff6b6b' : data.color}"></div>
      </div>
      <div class="bcc-meta">
        <span>Spent: <strong>₹${fmt(data.total)}</strong></span>
        <span>Budget: ₹${fmt(suggested)}</span>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
//  ANOMALY DETECTION
// ═══════════════════════════════════════════════
function detectAnomalies(txns, catTotals, totalSpent, months, monthlyExp) {
  const section  = document.getElementById('anomalySection');
  const expTxns  = txns.filter(t => t.type === 'debit' && t.catObj.type !== 'income');
  const avg      = totalSpent / Math.max(expTxns.length, 1);
  const msgs     = [];

  // 1. Transactions > 3× average
  const bigTxns = expTxns.filter(t => t.amount > avg * 3);
  if (bigTxns.length) {
    msgs.push({ type: 'warn', text: `⚡ ${bigTxns.length} transaction(s) are 3× above your average. Largest: "${bigTxns[0].desc}" at ₹${fmt(bigTxns[0].amount)}.` });
  }

  // 2. Overspend vs salary
  if (salary > 0 && totalSpent > salary * 0.9) {
    msgs.push({ type: 'danger', text: `🚨 You've spent ₹${fmt(totalSpent)} — that's ${((totalSpent / salary) * 100).toFixed(0)}% of your ₹${fmt(salary)} salary! Critical overspend.` });
  } else if (salary > 0 && totalSpent > salary * 0.75) {
    msgs.push({ type: 'warn', text: `⚠️ You've spent ${((totalSpent / salary) * 100).toFixed(0)}% of your salary. Savings are below the recommended 20%.` });
  }

  // 3. Month-over-month spike
  if (months.length >= 2) {
    const last = monthlyExp[months[months.length - 1]];
    const prev = monthlyExp[months[months.length - 2]];
    if (prev > 0) {
      const spike = ((last - prev) / prev) * 100;
      if (spike > 40) msgs.push({ type: 'warn', text: `📈 Spending spiked ${spike.toFixed(0)}% in ${months[months.length - 1]} vs the previous month.` });
    }
  }

  // 4. Category over budget
  for (const [name, data] of Object.entries(catTotals)) {
    const budget = salary * (data.pct / 100);
    if (budget > 0 && data.total > budget * 1.3) {
      msgs.push({ type: 'warn', text: `📊 ${name} is ${(((data.total / budget) - 1) * 100).toFixed(0)}% over its suggested budget (₹${fmt(data.total)} vs ₹${fmt(budget)}).` });
    }
  }

  section.innerHTML = msgs.length
    ? msgs.map(m => `<div class="anomaly-card ${m.type === 'danger' ? 'danger' : ''}">${m.text}</div>`).join('')
    : '<div class="anomaly-card" style="color:var(--primary);border-color:rgba(0,229,160,.3);background:rgba(0,229,160,.05)">✅ No major spending anomalies detected. Great financial discipline!</div>';
}

// ═══════════════════════════════════════════════
//  CHARTS
// ═══════════════════════════════════════════════
function renderCharts(catTotals, months, monthlyExp, monthlySal) {
  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();

  pieChart = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(catTotals),
      datasets: [{
        data: Object.values(catTotals).map(c => c.total.toFixed(2)),
        backgroundColor: Object.values(catTotals).map(c => c.color),
        borderWidth: 2,
        borderColor: getComputedStyle(document.body).getPropertyValue('--surface')
      }]
    },
    options: {
      cutout: '64%',
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Instrument Sans' }, padding: 14, color: '#888' }}}
    }
  });

  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Salary',   data: months.map(m => (monthlySal[m] || salary).toFixed(2)), backgroundColor: 'rgba(0,229,160,0.3)',  borderColor: '#00e5a0', borderWidth: 2, borderRadius: 6 },
        { label: 'Expenses', data: months.map(m => (monthlyExp[m] || 0).toFixed(2)),       backgroundColor: 'rgba(255,107,107,0.35)', borderColor: '#ff6b6b', borderWidth: 2, borderRadius: 6 }
      ]
    },
    options: {
      plugins: { legend: { labels: { font: { family: 'Instrument Sans' }, color: '#888' }}},
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888' }},
        y: { grid: { color: 'rgba(120,120,120,0.08)' }, ticks: { color: '#888', callback: v => '₹' + v }}
      }
    }
  });
}

// ═══════════════════════════════════════════════
//  TOP TABLE
// ═══════════════════════════════════════════════
function renderTopTable(txns) {
  const top10 = txns.filter(t => t.type === 'debit' && t.catObj.type !== 'income')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  document.getElementById('topTableBody').innerHTML = top10.map(t => {
    const pct = salary > 0 ? ((t.amount / salary) * 100).toFixed(1) : '—';
    return `<tr>
      <td>${t.date}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.desc}</td>
      <td><span class="cat-pill" style="background:${t.catObj.color}22;color:${t.catObj.color}">${t.catObj.name}</span></td>
      <td class="amount-neg">₹${fmt(t.amount)}</td>
      <td style="color:var(--muted);font-size:12px">${t.bank}</td>
      <td style="color:var(--muted)">${pct}%</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════
//  SAVINGS GOALS
// ═══════════════════════════════════════════════
function renderDefaultGoals(totalSpent) {
  if (goals.length === 0) {
    const monthlySave = Math.max(salary - totalSpent, 0);
    goals = [
      { name: 'Emergency Fund', target: salary * 6, saved: monthlySave },
      { name: 'Vacation',       target: 50000,       saved: 0 },
    ];
  }
  renderGoals();
}

function addGoal() {
  const name   = document.getElementById('goalName').value.trim();
  const target = parseFloat(document.getElementById('goalTarget').value);
  if (!name || isNaN(target) || target <= 0) return;
  goals.push({ name, target, saved: 0 });
  document.getElementById('goalName').value   = '';
  document.getElementById('goalTarget').value = '';
  renderGoals();
}

function renderGoals() {
  const totalSpent  = window._currentTotalSpent || 0;
  const monthlySave = Math.max(salary - totalSpent, 0);
  document.getElementById('goalsGrid').innerHTML = goals.map(g => {
    const pct           = Math.min((g.saved / g.target) * 100, 100);
    const months_needed = monthlySave > 0 ? Math.ceil((g.target - g.saved) / monthlySave) : '∞';
    return `<div class="goal-item">
      <div class="goal-header">
        <div class="goal-name">🎯 ${g.name}</div>
        <div class="goal-pct">${pct.toFixed(0)}%</div>
      </div>
      <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
      <div class="goal-meta">₹${fmt(g.saved)} saved of ₹${fmt(g.target)} &nbsp;·&nbsp; ~${months_needed} months to complete</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
//  AI INSIGHTS
// ═══════════════════════════════════════════════
async function generateAIInsights(txns, catTotals, months, monthlyExp, totalSpent) {
  const el      = document.getElementById('insightText');
  el.className  = 'typing-cursor';
  el.textContent = 'Analyzing your finances';

  const savRate     = salary > 0 ? Math.max(((salary - totalSpent) / salary) * 100, 0) : 0;
  const catSummary  = Object.entries(catTotals).map(([k, v]) => `${k}: ₹${v.total.toFixed(0)} (budget ₹${Math.round(salary * (v.pct / 100))})`).join(', ');
  const monthSummary = months.map(m => `${m}: ₹${monthlyExp[m]?.toFixed(0) || 0}`).join(', ');
  const overBudget  = Object.entries(catTotals).filter(([k, v]) => v.total > salary * (v.pct / 100) * 1.1).map(([k]) => k).join(', ') || 'none';
  const name        = userName || 'the user';
  const top3        = txns.filter(t => t.type === 'debit' && t.catObj.type !== 'income').sort((a, b) => b.amount - a.amount).slice(0, 3).map(t => `${t.desc} ₹${t.amount}`).join(', ');

  const prompt = `You are a sharp, friendly personal finance advisor in India. Analyze ${name}'s spending data from their bank SMS messages and give a concise financial health report in 5–7 sentences. Be warm but direct. Use specific rupee numbers. Then give exactly 3 numbered actionable tips tailored to their top overspending areas.

Monthly salary: ₹${salary.toFixed(0)}
Total spent this period: ₹${totalSpent.toFixed(0)}
Savings rate: ${savRate.toFixed(1)}%
Categories (spent vs budget): ${catSummary}
Monthly trend: ${monthSummary}
Over-budget categories: ${overBudget}
Top 3 transactions: ${top3}

Write a flowing paragraph (no markdown headers). End with:
Tip 1: [specific action]
Tip 2: [specific action]
Tip 3: [specific action]`;

  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    const text = data.content?.map(b => b.text || '').join('') || '';
    if (text) { el.className = ''; el.textContent = text; }
    else throw new Error('empty');
  } catch {
    el.className  = '';
    el.textContent = generateFallback(catTotals, totalSpent, savRate);
  }
}

function generateFallback(catTotals, totalSpent, savRate) {
  let topCat = '', topAmt = 0;
  for (const [k, v] of Object.entries(catTotals)) if (v.total > topAmt) { topAmt = v.total; topCat = k; }
  const savAmt = Math.max(salary - totalSpent, 0);
  return `You've spent ₹${fmt(totalSpent)} out of your ₹${fmt(salary)} salary, saving ₹${fmt(savAmt)} (${savRate.toFixed(1)}%). Your highest spending category is ${topCat} at ₹${fmt(topAmt)}.

Tip 1: Set up an auto-transfer of 20% of your salary to a separate savings account on payday.
Tip 2: Cut ${topCat} spending by 15% — that's ₹${fmt(topAmt * 0.15)} back in your pocket monthly.
Tip 3: Review all active subscriptions — cancel anything unused in the last 30 days.`;
}

// ═══════════════════════════════════════════════
//  RESET
// ═══════════════════════════════════════════════
function resetSMS() {
  document.getElementById('previewCard').style.display = 'none';
  document.getElementById('parseStatus').textContent   = '';
  parsedTransactions = [];
}

function resetAll() {
  document.getElementById('dashboard').style.display  = 'none';
  document.getElementById('smsZone').style.display    = 'block';
  document.getElementById('smsInput').value           = '';
  document.getElementById('parseStatus').textContent  = '';
  parsedTransactions = [];
  goals  = [];
  salary = 0;
  document.getElementById('salaryDetected').style.display = 'none';
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
function fmt(n) {
  return Number((n || 0).toFixed(0)).toLocaleString('en-IN');
}

function animCount(id, target, prefix = '') {
  let cur = 0;
  const el   = document.getElementById(id);
  if (!el) return;
  const step = target / 60;
  const iv   = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = prefix + fmt(cur);
    if (cur >= target) clearInterval(iv);
  }, 16);
}

// ═══════════════════════════════════════════════
//  SAMPLE SMS
// ═══════════════════════════════════════════════
function loadSampleSMS() {
  document.getElementById('salaryInput').value = 75000;
  document.getElementById('nameInput').value   = 'Arjun';
  salary   = 75000;
  userName = 'Arjun';

  document.getElementById('smsInput').value = `HDFC Bank: Rs.75,000.00 credited to a/c XX1234 on 01-03-24. Info: SALARY MARCH 2024. Avl Bal:Rs.82,450.00

HDFC Bank: Rs.450.00 debited from a/c XX1234 on 02-03-24 at ZOMATO. Avl Bal:Rs.82,000.00

SBI: Your a/c XX5678 is debited by Rs.1,200 on 03/03/24. Info: ELECTRICITY BILL BESCOM. Avail Bal: Rs.14,500.00

ICICI Bank: INR 2,500.00 debited from account XX9012 on 04-03-2024. Info: AMAZON SHOPPING. Avl Bal: INR 52,400.00

Axis Bank: Rs.999 debited from your a/c XX3456 on 05/03/24 for NETFLIX SUBSCRIPTION. Available Bal: Rs.31,001.00

Kotak: Spent Rs.680.00 on your Kotak Debit Card XX7890 at SWIGGY on 06-Mar-24. Avl Bal: Rs.28,320.00

HDFC Bank: Rs.12,000.00 debited from a/c XX1234 on 07-03-24 at HDFC BANK EMI. Avl Bal:Rs.70,000.00

SBI: Your a/c XX5678 is debited by Rs.3,500 on 08/03/24. Info: BYJU COURSE FEE. Avail Bal: Rs.11,000.00

ICICI Bank: INR 890.00 debited from account XX9012 on 09-03-2024. Info: ZOMATO ORDER. Avl Bal: INR 51,510.00

Axis Bank: Rs.4,800 debited from your a/c XX3456 on 10/03/24 for FLIPKART PURCHASE. Available Bal: Rs.26,201.00

YES BANK: Rs.399/- debited from Acct XX2233 on 11/03/2024. Remarks: JIO POSTPAID BILL

Kotak: Spent Rs.520.00 on your Kotak Debit Card XX7890 at UBER CAB on 12-Mar-24. Avl Bal: Rs.27,800.00

HDFC Bank: Rs.649.00 debited from a/c XX1234 on 13-03-24 at HOTSTAR PREMIUM. Avl Bal:Rs.69,351.00

SBI: Your a/c XX5678 is debited by Rs.2,400 on 14/03/24. Info: IRCTC TRAIN TICKET. Avail Bal: Rs.8,600.00

ICICI Bank: INR 999.00 debited from account XX9012 on 15-03-2024. Info: CULT FIT GYM. Avl Bal: INR 50,511.00

Axis Bank: Rs.1,850 debited from your a/c XX3456 on 16/03/24 for APOLLO PHARMACY. Available Bal: Rs.24,351.00

HDFC Bank: Rs.730.00 debited from a/c XX1234 on 17-03-24 at SWIGGY ORDER. Avl Bal:Rs.68,621.00

Kotak: Spent Rs.8,900.00 on your Kotak Debit Card XX7890 at MYNTRA FASHION on 18-Mar-24. Avl Bal: Rs.18,900.00

SBI: Your a/c XX5678 is debited by Rs.500 on 19/03/24. Info: SPOTIFY PREMIUM. Avail Bal: Rs.8,100.00

HDFC Bank: Rs.3,200.00 debited from a/c XX1234 on 20-03-24 at AMAZON SHOPPING. Avl Bal:Rs.65,421.00

ICICI Bank: INR 620.00 debited from account XX9012 on 21-03-2024. Info: OLA CAB BOOKING. Avl Bal: INR 49,891.00

YES BANK: Rs.2,999/- debited from Acct XX2233 on 22/03/2024. Remarks: UNACADEMY SUBSCRIPTION

Axis Bank: Rs.450.00 debited from your a/c XX3456 on 23/03/24 for MEDPLUS PHARMACY. Available Bal: Rs.23,901.00

HDFC Bank: Rs.75,000.00 credited to a/c XX1234 on 01-04-24. Info: SALARY APRIL 2024. Avl Bal:Rs.1,08,921.00

HDFC Bank: Rs.540.00 debited from a/c XX1234 on 02-04-24 at ZOMATO ORDER. Avl Bal:Rs.1,08,381.00

Kotak: Spent Rs.12,000.00 on your Kotak Debit Card XX7890 at HDFC BANK EMI PAYMENT on 03-Apr-24. Avl Bal: Rs.6,900.00

SBI: Your a/c XX5678 is debited by Rs.2,100 on 04/04/24. Info: ELECTRICITY BILL MSEDCL. Avail Bal: Rs.6,000.00

ICICI Bank: INR 5,500.00 debited from account XX9012 on 05-04-2024. Info: AMAZON SHOPPING. Avl Bal: INR 44,391.00

Axis Bank: Rs.1,800 debited from your a/c XX3456 on 06/04/24 for PETROL FUEL BPCL. Available Bal: Rs.22,101.00

HDFC Bank: Rs.3,500.00 debited from a/c XX1234 on 07-04-24 at APOLLO HOSPITAL. Avl Bal:Rs.1,04,881.00`;

  parseSMS();
}

// ═══════════════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════

/**
 * Show a toast notification with optional buzz
 * @param {string} title   - Bold heading
 * @param {string} msg     - Body text
 * @param {'info'|'success'|'warning'|'danger'} type
 * @param {number} duration - ms before auto-dismiss (default 4000)
 * @param {boolean} buzz   - Vibrate/buzz the toast on entry
 */
function showToast(title, msg, type = 'info', duration = 4000, buzz = false) {
  const container = document.getElementById('toastContainer');
  const icons     = { info:'💳', success:'✅', warning:'⚠️', danger:'🚨' };
  const id        = 'toast-' + Date.now();

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.id = id;
  el.style.setProperty('--toast-duration', duration + 'ms');
  el.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
    <button class="toast-close" onclick="dismissToast('${id}')">✕</button>
  `;

  container.appendChild(el);

  // Buzz effect
  if (buzz) {
    setTimeout(() => el.classList.add('buzz'), 50);
    el.addEventListener('animationend', () => el.classList.remove('buzz'), { once: true });

    // Vibrate device if supported (mobile)
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

    // Audio buzz using Web Audio API
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type            = 'square';
      osc.frequency.value = 180;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) { /* audio not available */ }
  }

  // Auto-dismiss
  setTimeout(() => dismissToast(id), duration);
}

function dismissToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('removing');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

// ═══════════════════════════════════════════════
//  SALARY EDIT IN DASHBOARD
// ═══════════════════════════════════════════════
function startSalaryEdit() {
  document.getElementById('heroSalary').style.display    = 'none';
  document.getElementById('salaryEditForm').classList.add('active');
  const inp = document.getElementById('heroSalaryInput');
  inp.value = salary || '';
  inp.focus();
  inp.select();
}

function saveSalaryEdit() {
  const val = parseFloat(document.getElementById('heroSalaryInput').value);
  if (isNaN(val) || val <= 0) {
    showToast('Invalid Salary', 'Please enter a valid positive number.', 'danger', 3000, true);
    return;
  }
  const old = salary;
  salary = val;
  cancelSalaryEdit();

  // Re-render hero and all salary-dependent views
  const totalSpent = window._currentTotalSpent || 0;
  renderHero(totalSpent);
  renderStats(parsedTransactions, window._catTotals || {}, totalSpent);
  renderBudgetAlloc(window._catTotals || {});
  renderGoals();

  const diff    = val - old;
  const diffStr = diff >= 0 ? `+₹${fmt(diff)}` : `-₹${fmt(Math.abs(diff))}`;
  showToast('Salary Updated', `Changed from ₹${fmt(old)} to ₹${fmt(val)} (${diffStr})`, 'success', 4000, false);
}

function cancelSalaryEdit() {
  document.getElementById('heroSalary').style.display = '';
  document.getElementById('salaryEditForm').classList.remove('active');
  document.getElementById('heroSalaryInput').value = '';
}

// Allow Enter key to save salary edit
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('salaryEditForm').classList.contains('active')) {
    saveSalaryEdit();
  }
  if (e.key === 'Escape' && document.getElementById('salaryEditForm').classList.contains('active')) {
    cancelSalaryEdit();
  }
});

// ═══════════════════════════════════════════════
//  TRANSACTION ALERT TOASTS
//  Called after analyzeAll() processes transactions
// ═══════════════════════════════════════════════
function fireTransactionAlerts(txns, catTotals, totalSpent, months, monthlyExp) {
  const expTxns = txns.filter(t => t.type === 'debit' && t.catObj.type !== 'income');
  const avg     = totalSpent / Math.max(expTxns.length, 1);
  let delay     = 600; // stagger toasts so they don't all pop at once

  // 1. Welcome / summary toast
  setTimeout(() => {
    showToast(
      `${parsedTransactions.length} Transactions Parsed`,
      `Total spending: ₹${fmt(totalSpent)} across ${expTxns.length} debit transactions.`,
      'info', 4000, false
    );
  }, delay);
  delay += 800;

  // 2. Critical overspend — danger + buzz
  if (salary > 0 && totalSpent > salary * 0.9) {
    setTimeout(() => {
      showToast(
        '🚨 Critical Overspend!',
        `You've spent ${((totalSpent / salary) * 100).toFixed(0)}% of your ₹${fmt(salary)} salary. Immediate action needed!`,
        'danger', 6000, true
      );
    }, delay);
    delay += 1000;
  }
  // Or warn if > 75%
  else if (salary > 0 && totalSpent > salary * 0.75) {
    setTimeout(() => {
      showToast(
        '⚠️ High Spending Alert',
        `You've used ${((totalSpent / salary) * 100).toFixed(0)}% of your salary. Savings below recommended 20%.`,
        'warning', 5000, true
      );
    }, delay);
    delay += 1000;
  }

  // 3. Biggest single transaction — buzz alert
  const biggest = [...expTxns].sort((a, b) => b.amount - a.amount)[0];
  if (biggest && biggest.amount > avg * 2.5) {
    setTimeout(() => {
      showToast(
        '💸 Large Transaction Detected',
        `"${biggest.desc}" — ₹${fmt(biggest.amount)} is ${(biggest.amount / avg).toFixed(1)}× your average spend.`,
        'warning', 5000, true
      );
    }, delay);
    delay += 900;
  }

  // 4. Over-budget categories
  let overCount = 0;
  for (const [name, data] of Object.entries(catTotals)) {
    const budget = salary * (data.pct / 100);
    if (budget > 0 && data.total > budget * 1.3 && overCount < 2) {
      const pctOver = (((data.total / budget) - 1) * 100).toFixed(0);
      setTimeout(() => {
        showToast(
          `${name} Over Budget`,
          `Spent ₹${fmt(data.total)} — ${pctOver}% over the suggested ₹${fmt(budget)}.`,
          'warning', 5000, true
        );
      }, delay);
      delay += 900;
      overCount++;
    }
  }

  // 5. Month-over-month spike
  if (months.length >= 2) {
    const last = monthlyExp[months[months.length - 1]];
    const prev = monthlyExp[months[months.length - 2]];
    if (prev > 0) {
      const spike = ((last - prev) / prev) * 100;
      if (spike > 40) {
        setTimeout(() => {
          showToast(
            '📈 Spending Spike',
            `${months[months.length - 1]} spending jumped ${spike.toFixed(0)}% compared to the previous month.`,
            'warning', 5000, true
          );
        }, delay);
        delay += 900;
      }
    }
  }

  // 6. Positive reinforcement if savings rate is good
  const savRate = salary > 0 ? ((salary - totalSpent) / salary) * 100 : 0;
  if (savRate >= 20) {
    setTimeout(() => {
      showToast(
        '🎉 Great Savings Rate!',
        `You're saving ${savRate.toFixed(1)}% of your salary — above the recommended 20%. Keep it up!`,
        'success', 4500, false
      );
    }, delay);
  }
}
