// ============================================================
// API KEY — paste your real key between the quotes
// ============================================================
const CLAUDE_API_KEY = "your-api-key-here";

// ============================================================
// Chart instance — stored so we can destroy/redraw it
// ============================================================
let categoryChart = null;

// ============================================================
// STEP 1 — Show filename + read CSV when user uploads
// ============================================================
document.getElementById('csvUpload').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Show filename in upload zone
  const filenameEl = document.getElementById('uploadFilename');
  filenameEl.textContent = '✓ ' + file.name + ' loaded';
  filenameEl.style.display = 'block';

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      displayDashboard(results.data);
      displayTransactions(results.data);
    }
  });
});

// ============================================================
// STEP 2 — Build the summary dashboard
// ============================================================
function displayDashboard(transactions) {
  const dashboard = document.getElementById('dashboard');
  dashboard.style.display = 'block';

  // Animate stat cards in
  setTimeout(() => {
    document.querySelectorAll('.stat-card').forEach(el => el.classList.add('visible'));
    document.querySelectorAll('.panel').forEach(el => el.classList.add('visible'));
  }, 50);

  // Total amount
  const total = transactions.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
  document.getElementById('totalAmount').textContent = '$' + total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Total count
  document.getElementById('totalCount').textContent = transactions.length;

  // Flag count
  const flagged = transactions.filter(row => row.flag && row.flag.toLowerCase() !== 'none').length;
  document.getElementById('flagCount').textContent = flagged;

  // Group by category
  const categoryTotals = {};
  transactions.forEach(function(row) {
    const cat = row.category || 'Uncategorized';
    const amount = parseFloat(row.amount || 0);
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
  });

  // Sort categories by amount descending
  const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Color palette — muted, editorial
  const colors = [
    '#0f0e0c', '#c8402a', '#b8922a', '#2a6b4a',
    '#4a6b8a', '#7a4a8a', '#8a6a4a'
  ];

  // Draw the bar chart
  if (categoryChart) categoryChart.destroy();

  const ctx = document.getElementById('categoryChart').getContext('2d');
  categoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(e => e[0]),
      datasets: [{
        data: sorted.map(e => e[1]),
        backgroundColor: colors.slice(0, sorted.length),
        borderRadius: 2,
        borderSkipped: false,
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' $' + ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })
          }
        }
      },
      scales: {
        y: {
          grid: { color: '#e8e2d4' },
          ticks: {
            font: { family: 'DM Mono', size: 10 },
            color: '#8a8272',
            callback: value => '$' + value.toLocaleString()
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'DM Mono', size: 9 },
            color: '#8a8272',
            maxRotation: 35
          }
        }
      }
    }
  });

  // Build the category breakdown list
  const listEl = document.getElementById('categoryList');
  listEl.innerHTML = '';

  sorted.forEach(function([cat, amount], i) {
    const pct = ((amount / total) * 100).toFixed(1);
    const div = document.createElement('div');
    div.className = 'cat-row';
    div.innerHTML = `
      <div class="cat-header">
        <span class="cat-name">${cat}</span>
        <span class="cat-amount">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style="opacity:0.5">${pct}%</span></span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width: 0%; background: ${colors[i % colors.length]}" data-width="${pct}"></div>
      </div>
    `;
    listEl.appendChild(div);
  });

  // Animate bars after a short delay
  setTimeout(() => {
    document.querySelectorAll('.cat-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 300);
}

// ============================================================
// STEP 3 — Display the transactions table
// ============================================================
function displayTransactions(transactions) {
  const tbody = document.getElementById('transactionRows');
  const section = document.getElementById('resultsSection');

  tbody.innerHTML = '';
  section.style.display = 'block';

  // Animate in
  setTimeout(() => section.classList.add('visible'), 100);

  // Update count label
  document.getElementById('tableCount').textContent = transactions.length + ' transactions';

  transactions.forEach(function(row, index) {
    const tr = document.createElement('tr');
    tr.id = `row-${index}`;

    const hasFlag = row.flag && row.flag.toLowerCase() !== 'none';
    if (hasFlag) tr.classList.add('flagged-row');

    const journalPlaceholder = CLAUDE_API_KEY !== "your-api-key-here"
      ? `<span class="badge badge-analyzing">Analyzing…</span>`
      : `<span class="badge badge-ai">⚡ Available with AI</span>`;

    tr.innerHTML = `
      <td class="td-date">${row.date}</td>
      <td class="td-desc">${row.description}</td>
      <td class="td-amount">$${parseFloat(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td class="td-category" id="cat-${index}">${row.category || '<span style="color:#ccc5b4;font-style:italic">Uncategorized</span>'}</td>
      <td class="td-journal" id="journal-${index}">${journalPlaceholder}</td>
      <td id="flag-${index}">
        ${hasFlag
          ? `<span class="badge badge-flag">${row.flag}</span>`
          : `<span class="badge badge-ok">✓ Clear</span>`
        }
      </td>
    `;

    tbody.appendChild(tr);

    // Call AI for journal entry if API key is set
    if (CLAUDE_API_KEY !== "your-api-key-here") {
      setTimeout(function() {
        analyzeTransaction(row, index);
      }, index * 1500);
    }
  });
}

// ============================================================
// STEP 4 — Ask Claude to analyze a single transaction
// ============================================================
async function analyzeTransaction(row, index) {
  const prompt = `You are an expert bookkeeper. Analyze this business transaction and respond in JSON only. No extra text, no markdown, no code blocks - just raw JSON.

Transaction:
- Date: ${row.date}
- Description: ${row.description}
- Amount: $${row.amount}

Respond with ONLY this JSON structure:
{
  "category": "pick one: Office Supplies, Software & Subscriptions, Meals & Entertainment, Travel, Contractor / Professional Services, Utilities & Hosting, Miscellaneous",
  "journal_entry": "one line, e.g. Debit: Office Supplies Expense $45.00 | Credit: Accounts Payable $45.00",
  "flag": "none OR a short reason why this needs manual review"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error("API error " + response.status);

    const text = data.content[0].text.trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    // Update category
    const catCell = document.getElementById(`cat-${index}`);
    if (catCell) catCell.textContent = result.category;

    // Update journal entry
    const journalCell = document.getElementById(`journal-${index}`);
    if (journalCell) journalCell.textContent = result.journal_entry;

    // Update flag
    const flagCell = document.getElementById(`flag-${index}`);
    const tr = document.getElementById(`row-${index}`);
    if (flagCell) {
      if (result.flag && result.flag.toLowerCase() !== "none") {
        flagCell.innerHTML = `<span class="badge badge-flag">${result.flag}</span>`;
        if (tr) tr.classList.add('flagged-row');
      } else {
        flagCell.innerHTML = `<span class="badge badge-ok">✓ Clear</span>`;
      }
    }

  } catch (error) {
    console.error("Error analyzing transaction:", error);
    const journalCell = document.getElementById(`journal-${index}`);
    if (journalCell) journalCell.innerHTML = '<span style="color:#ccc5b4;font-style:italic;font-size:11px">Unavailable</span>';
  }
}
