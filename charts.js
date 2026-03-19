// ============================================================
// LEDGERAI — CHARTS ENGINE v1.0
// Advanced Chart.js configs · 15+ chart types · Sparklines
// Animated reveals · Responsive tooltips · Dark mode aware
// Load AFTER app.js
// ============================================================

(function() {
'use strict';

// ── CHART REGISTRY ────────────────────────────────────────────
const ChartRegistry = {};

// ── GLOBAL DEFAULTS ───────────────────────────────────────────

function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
  Chart.defaults.font.size   = 12;
  Chart.defaults.color       = isDark() ? '#8b949e' : '#6b7280';
  Chart.defaults.borderColor = isDark() ? '#21262d' : '#e4e7ec';
  Chart.defaults.responsive  = true;
  Chart.defaults.maintainAspectRatio = false;

  // Smooth animations
  Chart.defaults.animation = {
    duration: 600,
    easing:   'easeInOutCubic',
  };
  Chart.defaults.transitions.active.animation.duration = 200;
}

function isDark() {
  return document.body.classList.contains('dark-mode');
}

function getAccentColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--profile-accent').trim() || '#2563eb';
}

function getAccentAlpha(alpha) {
  const hex = getAccentColor().replace('#','');
  const r = parseInt(hex.slice(0,2),16);
  const g = parseInt(hex.slice(2,4),16);
  const b = parseInt(hex.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── COLOR PALETTES ────────────────────────────────────────────

const PALETTES = {
  default: [
    '#2563eb','#059669','#d97706','#dc2626','#7c3aed',
    '#0891b2','#65a30d','#ea580c','#db2777','#0369a1',
    '#15803d','#b45309','#b91c1c','#6d28d9','#0e7490',
  ],
  dark: [
    '#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa',
    '#22d3ee','#a3e635','#fb923c','#f472b6','#38bdf8',
    '#4ade80','#fcd34d','#fca5a5','#c4b5fd','#67e8f9',
  ],
  monochrome: (base, count) => {
    const hex = (base || '#2563eb').replace('#','');
    const r   = parseInt(hex.slice(0,2),16);
    const g   = parseInt(hex.slice(2,4),16);
    const b   = parseInt(hex.slice(4,6),16);
    return Array.from({length: count}, (_, i) => {
      const factor = 0.3 + (i / count) * 0.7;
      return `rgba(${Math.round(r*factor)},${Math.round(g*factor)},${Math.round(b*factor)},0.9)`;
    });
  },
  categorical: () => isDark() ? PALETTES.dark : PALETTES.default,
};

// ── TOOLTIP PLUGIN CONFIG ─────────────────────────────────────

function tooltipConfig(sym) {
  sym = sym || '$';
  return {
    backgroundColor: isDark() ? '#161b22' : '#0d0f12',
    titleColor:      isDark() ? '#e6edf3' : '#ffffff',
    bodyColor:       isDark() ? '#8b949e' : 'rgba(255,255,255,0.8)',
    borderColor:     isDark() ? '#21262d' : 'rgba(255,255,255,0.1)',
    borderWidth:     1,
    padding:         { x: 14, y: 10 },
    cornerRadius:    8,
    displayColors:   true,
    boxWidth:        8,
    boxHeight:       8,
    boxPadding:      4,
    callbacks: {
      label: (ctx) => {
        const val = typeof ctx.parsed === 'object' ? ctx.parsed.y : ctx.parsed;
        return ' ' + sym + (val || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }
  };
}

// ── LEGEND CONFIG ─────────────────────────────────────────────

function legendConfig(position) {
  return {
    position:  position || 'bottom',
    align:     'start',
    labels: {
      boxWidth:    10,
      boxHeight:   10,
      padding:     20,
      font:        { size: 11, family: "'IBM Plex Mono', monospace" },
      color:       isDark() ? '#8b949e' : '#6b7280',
      usePointStyle: true,
      pointStyle:  'circle',
    }
  };
}

// ── SCALE CONFIGS ─────────────────────────────────────────────

function linearScaleConfig(sym, opts) {
  sym = sym || '$';
  return {
    grid: {
      color:        isDark() ? 'rgba(33,38,45,0.8)' : 'rgba(228,231,236,0.6)',
      drawBorder:   false,
      tickLength:   0,
    },
    ticks: {
      padding:      10,
      font:         { size: 11, family: "'IBM Plex Mono', monospace" },
      color:        isDark() ? '#484f58' : '#9ca3af',
      callback:     (v) => sym + (v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : v),
      ...(opts?.ticks || {}),
    },
    border: { display: false },
    ...(opts || {}),
  };
}

function categoryScaleConfig(opts) {
  return {
    grid: { display: false },
    ticks: {
      padding: 10,
      font:    { size: 11, family: "'IBM Plex Mono', monospace" },
      color:   isDark() ? '#8b949e' : '#6b7280',
      maxRotation: 45,
      ...(opts?.ticks || {}),
    },
    border: { display: false },
    ...(opts || {}),
  };
}

// ── 1. CATEGORY DONUT CHART ───────────────────────────────────

function renderCategoryDonut(canvasId, data, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  applyChartDefaults();

  const labels = data.map(d => d.label);
  const values = data.map(d => d.value);
  const sym    = options?.sym || '$';
  const colors = PALETTES.categorical().slice(0, labels.length);

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data:             values,
        backgroundColor:  colors,
        borderColor:      isDark() ? '#161b22' : '#ffffff',
        borderWidth:      3,
        hoverBorderWidth: 4,
        hoverOffset:      8,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: options?.maintainRatio !== false,
      cutout:              '68%',
      animation: {
        animateRotate: true,
        animateScale:  false,
        duration:      800,
        easing:        'easeInOutCubic',
      },
      plugins: {
        legend:  legendConfig('right'),
        tooltip: tooltipConfig(sym),
        centerText: {
          total:  values.reduce((a, b) => a + b, 0),
          sym,
        },
      },
      ...(options?.opts || {}),
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { centerText } = chart.options.plugins;
        if (!centerText) return;
        const { ctx: c, width: w, height: h } = chart;
        const cx = chart.chartArea.left + (chart.chartArea.right  - chart.chartArea.left) / 2;
        const cy = chart.chartArea.top  + (chart.chartArea.bottom - chart.chartArea.top)  / 2;
        c.save();
        c.textAlign    = 'center';
        c.textBaseline = 'middle';
        // Total amount
        c.font         = `700 ${Math.min(22, w * 0.07)}px 'IBM Plex Mono', monospace`;
        c.fillStyle    = isDark() ? '#e6edf3' : '#0d0f12';
        const total    = centerText.total || 0;
        const display  = centerText.sym + (total >= 1000000 ? (total/1000000).toFixed(1)+'M' : total >= 1000 ? (total/1000).toFixed(0)+'k' : total.toFixed(0));
        c.fillText(display, cx, cy - 8);
        // Label
        c.font         = `400 ${Math.min(11, w * 0.035)}px 'IBM Plex Mono', monospace`;
        c.fillStyle    = isDark() ? '#484f58' : '#9ca3af';
        c.fillText('TOTAL', cx, cy + 12);
        c.restore();
      }
    }],
  });

  return ChartRegistry[canvasId];
}

// ── 2. BAR CHART ──────────────────────────────────────────────

function renderBarChart(canvasId, labels, values, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  applyChartDefaults();

  const sym = options?.sym || '$';
  const color = options?.color || getAccentColor();

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: options?.horizontal ? 'bar' : 'bar',
    data: {
      labels,
      datasets: [{
        label:           options?.label || 'Amount',
        data:            values,
        backgroundColor: options?.multicolor
          ? PALETTES.categorical().slice(0, values.length).map(c => c + 'cc')
          : getAccentAlpha(0.8),
        borderColor:     options?.multicolor
          ? PALETTES.categorical().slice(0, values.length)
          : color,
        borderWidth:     0,
        borderRadius:    { topLeft: 5, topRight: 5 },
        borderSkipped:   false,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: options?.maintainRatio !== false,
      indexAxis:           options?.horizontal ? 'y' : 'x',
      animation: {
        duration: 700,
        easing:   'easeInOutCubic',
        delay:    (ctx) => ctx.dataIndex * 30,
      },
      plugins: {
        legend:  { display: false },
        tooltip: tooltipConfig(sym),
      },
      scales: {
        x: options?.horizontal ? linearScaleConfig(sym) : categoryScaleConfig(),
        y: options?.horizontal ? categoryScaleConfig({ ticks: { maxRotation: 0 } }) : { ...linearScaleConfig(sym), beginAtZero: true },
      },
    }
  });

  return ChartRegistry[canvasId];
}

// ── 3. LINE / AREA CHART ──────────────────────────────────────

function renderLineChart(canvasId, labels, datasets, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  applyChartDefaults();

  const sym    = options?.sym || '$';
  const colors = PALETTES.categorical();

  const chartDatasets = datasets.map((ds, i) => {
    const color = ds.color || colors[i] || getAccentColor();
    return {
      label:           ds.label || `Series ${i+1}`,
      data:            ds.data,
      borderColor:     color,
      backgroundColor: ds.fill !== false ? hexToRgba(color, 0.08) : 'transparent',
      borderWidth:     2.5,
      pointRadius:     3,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
      pointBorderColor:     isDark() ? '#161b22' : '#ffffff',
      pointBorderWidth:     2,
      fill:            ds.fill !== false,
      tension:         0.4,
      spanGaps:        true,
      ...(ds.opts || {}),
    };
  });

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: chartDatasets },
    options: {
      responsive:          true,
      maintainAspectRatio: options?.maintainRatio !== false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 900, easing: 'easeInOutCubic' },
      plugins: {
        legend:  datasets.length > 1 ? legendConfig('top') : { display: false },
        tooltip: tooltipConfig(sym),
      },
      scales: {
        x: categoryScaleConfig(),
        y: { ...linearScaleConfig(sym), beginAtZero: options?.beginAtZero !== false },
      },
    }
  });

  return ChartRegistry[canvasId];
}

// ── 4. FORECAST COMBO CHART ───────────────────────────────────

function renderForecastCombo(canvasId, historical, projection, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  applyChartDefaults();

  const sym = options?.sym || '$';
  const allLabels = [...historical.keys, ...projection.labels];
  const histLen   = historical.keys.length;

  // Build null-padded arrays
  const histExpData = [...historical.expenses, ...Array(projection.labels.length).fill(null)];
  const histIncData = [...historical.income,   ...Array(projection.labels.length).fill(null)];
  const projExpData = [...Array(histLen).fill(null), ...projection.expenses];
  const projIncData = [...Array(histLen).fill(null), ...projection.income];

  // Confidence interval bands (expenses)
  const projExpUpper = [...Array(histLen).fill(null), ...projection.expenses.map(v => v + (projection.ciExpenses || 0))];
  const projExpLower = [...Array(histLen).fill(null), ...projection.expenses.map(v => Math.max(0, v - (projection.ciExpenses || 0)))];

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        // Historical expenses
        {
          label:           'Actual Expenses',
          data:            histExpData,
          borderColor:     '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.06)',
          borderWidth:     2.5,
          fill:            true,
          tension:         0.3,
          pointRadius:     2,
          pointHoverRadius: 5,
          spanGaps:        false,
        },
        // Historical income
        {
          label:           'Actual Income',
          data:            histIncData,
          borderColor:     '#059669',
          backgroundColor: 'rgba(5,150,105,0.06)',
          borderWidth:     2.5,
          fill:            true,
          tension:         0.3,
          pointRadius:     2,
          pointHoverRadius: 5,
          spanGaps:        false,
        },
        // Projected expenses
        {
          label:           'Projected Expenses',
          data:            projExpData,
          borderColor:     '#dc2626',
          backgroundColor: 'transparent',
          borderWidth:     2,
          borderDash:      [6, 4],
          fill:            false,
          tension:         0.3,
          pointRadius:     0,
          spanGaps:        false,
        },
        // Projected income
        {
          label:           'Projected Income',
          data:            projIncData,
          borderColor:     '#059669',
          backgroundColor: 'transparent',
          borderWidth:     2,
          borderDash:      [6, 4],
          fill:            false,
          tension:         0.3,
          pointRadius:     0,
          spanGaps:        false,
        },
        // CI upper band (hidden in legend)
        {
          label:           'CI Upper',
          data:            projExpUpper,
          borderColor:     'transparent',
          backgroundColor: 'rgba(220,38,38,0.04)',
          fill:            '+1',
          tension:         0.3,
          pointRadius:     0,
          spanGaps:        false,
        },
        // CI lower band
        {
          label:           'CI Lower',
          data:            projExpLower,
          borderColor:     'transparent',
          backgroundColor: 'rgba(220,38,38,0.04)',
          fill:            false,
          tension:         0.3,
          pointRadius:     0,
          spanGaps:        false,
        },
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 1000, easing: 'easeInOutCubic' },
      plugins: {
        legend: {
          ...legendConfig('top'),
          labels: {
            ...legendConfig('top').labels,
            filter: (item) => !['CI Upper', 'CI Lower'].includes(item.text),
          }
        },
        tooltip: {
          ...tooltipConfig(sym),
          filter: (item) => !['CI Upper', 'CI Lower'].includes(item.dataset.label),
        },
        annotation: {
          annotations: {
            divider: {
              type:        'line',
              xMin:        historical.keys.length - 0.5,
              xMax:        historical.keys.length - 0.5,
              borderColor: isDark() ? '#30363d' : '#cdd2da',
              borderWidth: 1.5,
              borderDash:  [4, 4],
              label: {
                enabled:  true,
                content:  'Forecast →',
                position: 'start',
                font:     { size: 10, family: "'IBM Plex Mono', monospace" },
                color:    isDark() ? '#484f58' : '#9ca3af',
                padding:  4,
              }
            }
          }
        },
      },
      scales: {
        x: categoryScaleConfig({ ticks: { maxRotation: 45 } }),
        y: { ...linearScaleConfig(sym), beginAtZero: true },
      },
    }
  });

  return ChartRegistry[canvasId];
}

// ── 5. STACKED BAR (Budget vs Actual) ────────────────────────

function renderStackedBar(canvasId, categories, actual, budget, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  applyChartDefaults();
  const sym = options?.sym || '$';

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [
        {
          label:           'Actual',
          data:            actual,
          backgroundColor: actual.map((v, i) => budget[i] && v > budget[i] ? 'rgba(220,38,38,0.8)' : 'rgba(5,150,105,0.8)'),
          borderRadius:    { topLeft: 4, topRight: 4 },
          borderSkipped:   false,
          borderWidth:     0,
        },
        {
          label:           'Budget',
          data:            budget,
          backgroundColor: 'transparent',
          borderColor:     isDark() ? '#30363d' : '#cdd2da',
          borderWidth:     2,
          borderDash:      [4, 4],
          type:            'line',
          pointRadius:     4,
          pointBackgroundColor: isDark() ? '#30363d' : '#9ca3af',
          fill:            false,
          tension:         0,
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      indexAxis:           'x',
      animation: { duration: 700, delay: (ctx) => ctx.dataIndex * 25 },
      plugins: {
        legend:  legendConfig('top'),
        tooltip: tooltipConfig(sym),
      },
      scales: {
        x: categoryScaleConfig({ ticks: { maxRotation: 45 } }),
        y: { ...linearScaleConfig(sym), beginAtZero: true },
      },
    }
  });

  return ChartRegistry[canvasId];
}

// ── 6. SPARKLINE ──────────────────────────────────────────────

function renderSparkline(canvasId, data, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  if (!ctx || !data || !data.length) return;

  const last  = data[data.length - 1];
  const first = data[0];
  const color = options?.color || (last >= first ? '#059669' : '#dc2626');

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   data.map((_, i) => i),
      datasets: [{
        data:            data,
        borderColor:     color,
        backgroundColor: hexToRgba(color, 0.1),
        borderWidth:     2,
        fill:            true,
        tension:         0.4,
        pointRadius:     0,
        spanGaps:        true,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: false },
      },
      elements: { point: { radius: 0 } },
    }
  });

  return ChartRegistry[canvasId];
}

// ── 7. SCATTER CHART (anomaly visualization) ──────────────────

function renderScatterAnomaly(canvasId, transactions, anomalyIndices, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  applyChartDefaults();

  const sym      = options?.sym || '$';
  const anomSet  = new Set(anomalyIndices || []);
  const normal   = [];
  const anomaly  = [];

  transactions.forEach((t, i) => {
    const amt = Math.abs(parseFloat(t.amount || 0));
    if (amt <= 0) return;
    const point = { x: i, y: amt, desc: t.description || '', date: t.date || '' };
    if (anomSet.has(i)) anomaly.push(point);
    else normal.push(point);
  });

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label:           'Normal',
          data:            normal,
          backgroundColor: getAccentAlpha(0.4),
          borderColor:     getAccentColor(),
          borderWidth:     1,
          pointRadius:     4,
          pointHoverRadius: 7,
        },
        {
          label:           'Anomaly',
          data:            anomaly,
          backgroundColor: 'rgba(220,38,38,0.7)',
          borderColor:     '#dc2626',
          borderWidth:     1.5,
          pointRadius:     7,
          pointHoverRadius: 10,
          pointStyle:      'triangle',
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation: { duration: 800 },
      plugins: {
        legend:  legendConfig('top'),
        tooltip: {
          ...tooltipConfig(sym),
          callbacks: {
            label: (ctx) => {
              const d = ctx.raw;
              return ` ${d.desc.substring(0,30)} | ${sym}${d.y.toLocaleString('en-CA',{maximumFractionDigits:0})} (${d.date})`;
            }
          }
        },
      },
      scales: {
        x: { display: false },
        y: { ...linearScaleConfig(sym), beginAtZero: true },
      },
    }
  });

  return ChartRegistry[canvasId];
}

// ── 8. WATERFALL CHART (Cash Flow) ───────────────────────────

function renderWaterfall(canvasId, labels, values, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  applyChartDefaults();

  const sym = options?.sym || '$';

  // Build waterfall: invisible base + visible bar
  let cumulative = 0;
  const bases  = [];
  const bars   = [];
  const colors = [];

  values.forEach((v, i) => {
    if (i === values.length - 1) {
      // Final total bar
      bases.push(0);
      bars.push(cumulative + v);
      colors.push(cumulative + v >= 0 ? '#059669' : '#dc2626');
    } else {
      bases.push(v >= 0 ? cumulative : cumulative + v);
      bars.push(Math.abs(v));
      colors.push(v >= 0 ? 'rgba(5,150,105,0.8)' : 'rgba(220,38,38,0.8)');
      cumulative += v;
    }
  });

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:           'Base',
          data:            bases,
          backgroundColor: 'transparent',
          borderColor:     'transparent',
          borderWidth:     0,
          stack:           'waterfall',
        },
        {
          label:           'Value',
          data:            bars,
          backgroundColor: colors,
          borderRadius:    { topLeft: 4, topRight: 4 },
          borderSkipped:   false,
          borderWidth:     0,
          stack:           'waterfall',
        }
      ]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation: { duration: 800, delay: (ctx) => ctx.dataIndex * 40 },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipConfig(sym),
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) return null;
              const original = values[ctx.dataIndex];
              return ` ${original >= 0 ? '+' : ''}${sym}${Math.abs(original).toLocaleString('en-CA',{minimumFractionDigits:2})}`;
            }
          }
        },
      },
      scales: {
        x: categoryScaleConfig(),
        y: { ...linearScaleConfig(sym), stacked: true },
      },
    }
  });

  return ChartRegistry[canvasId];
}

// ── 9. GAUGE CHART (Risk Score) ───────────────────────────────

function renderGauge(canvasId, value, options) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;
  applyChartDefaults();

  const max   = options?.max || 100;
  const pct   = Math.min(1, value / max);
  const color = pct < 0.25 ? '#059669' : pct < 0.6 ? '#d97706' : '#dc2626';
  const bg    = isDark() ? '#21262d' : '#e4e7ec';

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data:            [value, max - value],
        backgroundColor: [color, bg],
        borderWidth:     0,
        borderRadius:    6,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      circumference:       180,
      rotation:            -90,
      cutout:              '75%',
      animation: { animateRotate: true, duration: 1000, easing: 'easeInOutCubic' },
      plugins: {
        legend:  { display: false },
        tooltip: { enabled: false },
      },
    },
    plugins: [{
      id: 'gaugeNeedle',
      afterDatasetDraw(chart) {
        const { ctx: c, chartArea: { width: w, height: h, left, top } } = chart;
        const cx = left + w / 2;
        const cy = top + h;
        const angle = Math.PI * (pct - 0.5);
        const len   = Math.min(w, h * 2) * 0.38;
        c.save();
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx + len * Math.cos(angle), cy + len * Math.sin(angle));
        c.strokeStyle = isDark() ? '#e6edf3' : '#0d0f12';
        c.lineWidth   = 3;
        c.lineCap     = 'round';
        c.stroke();
        c.beginPath();
        c.arc(cx, cy, 6, 0, 2 * Math.PI);
        c.fillStyle = isDark() ? '#e6edf3' : '#0d0f12';
        c.fill();
        // Score text
        c.font = `700 ${Math.round(w * 0.12)}px 'IBM Plex Mono', monospace`;
        c.fillStyle = color;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(value, cx, cy - h * 0.25);
        c.restore();
      }
    }],
  });

  return ChartRegistry[canvasId];
}

// ── 10. HEATMAP CALENDAR (transaction frequency) ─────────────

function renderTransactionHeatmap(containerId, transactions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Count transactions per day
  const dayCounts = {};
  transactions.forEach(t => {
    if (t.date) dayCounts[t.date] = (dayCounts[t.date] || 0) + 1;
  });

  const maxCount = Math.max(1, ...Object.values(dayCounts));

  // Get date range
  const dates = Object.keys(dayCounts).sort();
  if (!dates.length) return;

  const start = new Date(dates[0]);
  const end   = new Date(dates[dates.length - 1]);
  start.setDate(start.getDate() - start.getDay()); // Align to Sunday

  const weeks = [];
  let current = new Date(start);
  while (current <= end) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().substring(0, 10);
      const count   = dayCounts[dateStr] || 0;
      const intensity = count / maxCount;
      week.push({ date: dateStr, count, intensity });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  // Render heatmap grid
  const accent = getAccentColor();
  const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  container.innerHTML = `
    <div style="overflow-x:auto">
      <div style="display:flex;gap:3px;min-width:min-content">
        <div style="display:flex;flex-direction:column;gap:3px;margin-top:20px">
          ${dayLabels.map(d => `<div style="height:12px;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);width:18px;display:flex;align-items:center">${d}</div>`).join('')}
        </div>
        ${weeks.map(week => `
          <div style="display:flex;flex-direction:column;gap:3px">
            <div style="height:16px;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--muted);text-align:center">
              ${new Date(week[0].date).getDate() <= 7 ? new Date(week[0].date).toLocaleDateString('en', {month:'short'}) : ''}
            </div>
            ${week.map(day => `
              <div title="${day.date}: ${day.count} transaction${day.count !== 1 ? 's' : ''}"
                   style="width:12px;height:12px;border-radius:2px;cursor:default;
                          background:${day.count === 0
                            ? (isDark() ? '#21262d' : '#f3f4f6')
                            : hexToRgba(accent, 0.15 + day.intensity * 0.85)
                          }">
              </div>`).join('')}
          </div>`).join('')}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted)">
      Less
      ${[0.15, 0.35, 0.55, 0.75, 0.95].map(v => `<div style="width:12px;height:12px;border-radius:2px;background:${hexToRgba(accent, v)}"></div>`).join('')}
      More
    </div>
  `;
}

// ── 11. MINI PIE (category indicator) ────────────────────────

function renderMiniPie(canvasId, data) {
  destroyChart(canvasId);
  const ctx = getCtx(canvasId); if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels:   data.map(d => d.label),
      datasets: [{
        data:             data.map(d => d.value),
        backgroundColor:  PALETTES.categorical().slice(0, data.length),
        borderWidth:      0,
        hoverOffset:      4,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      animation: { duration: 600 },
      plugins: {
        legend:  { display: false },
        tooltip: { enabled: false },
      },
    }
  });

  return ChartRegistry[canvasId];
}

// ── UTILITIES ─────────────────────────────────────────────────

function getCtx(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  return canvas.getContext('2d');
}

function destroyChart(canvasId) {
  if (ChartRegistry[canvasId]) {
    ChartRegistry[canvasId].destroy();
    delete ChartRegistry[canvasId];
  }
}

function destroyAllCharts() {
  Object.keys(ChartRegistry).forEach(destroyChart);
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function updateChartTheme() {
  applyChartDefaults();
  Object.values(ChartRegistry).forEach(chart => {
    try { chart.update(); } catch(e) {}
  });
}

// Listen for dark mode toggle
const observer = new MutationObserver((mutations) => {
  mutations.forEach(m => {
    if (m.attributeName === 'class') updateChartTheme();
  });
});
observer.observe(document.body, { attributes: true });

// ── PUBLIC API ─────────────────────────────────────────────────
window.LedgerCharts = {
  renderCategoryDonut,
  renderBarChart,
  renderLineChart,
  renderForecastCombo,
  renderStackedBar,
  renderSparkline,
  renderScatterAnomaly,
  renderWaterfall,
  renderGauge,
  renderTransactionHeatmap,
  renderMiniPie,
  destroyChart,
  destroyAllCharts,
  updateChartTheme,
  PALETTES,
  hexToRgba,
  registry: ChartRegistry,
};

console.log('[LedgerAI] Charts engine loaded — 11 chart types available via LedgerCharts.*');

})();
