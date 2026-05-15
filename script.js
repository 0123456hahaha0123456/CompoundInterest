/**
 * project(inputs) — pure compound interest projection function.
 *
 * @param {Object} inputs
 * @param {number} inputs.years       - Number of years to project (e.g. 20)
 * @param {number} inputs.initial     - Initial lump-sum investment (e.g. 10000)
 * @param {number} inputs.monthly     - Monthly contribution amount (e.g. 500)
 * @param {number} inputs.rate        - Annual interest rate as a percentage (e.g. 7)
 * @param {number} inputs.frequency   - Compounding periods per year: 1, 2, 4, 12, or 365
 * @param {number} inputs.inflation   - Annual inflation rate as a percentage (e.g. 3)
 *
 * @returns {{
 *   labels: string[],
 *   contributions: number[],
 *   futureValue: number[],
 *   realValue: number[]
 * }}
 */
function project(inputs) {
  const { years, initial, monthly, rate, frequency, inflation } = inputs;

  // Step 1: Effective Annual Rate (EAR)
  const EAR = Math.pow(1 + (rate / 100) / frequency, frequency) - 1;

  // Step 2: Monthly growth factor derived from EAR
  const monthlyFactor = Math.pow(1 + EAR, 1 / 12);

  // Step 3: Initialise output arrays with year-0 state
  const labels        = ["0"];
  const contributions = [initial];
  const futureValue   = [initial];
  const realValue     = [initial]; // year 0: (1+inflation)^0 = 1, so no discount

  // Running state
  let balance              = initial;
  let cumulativeContribs   = initial;

  // Step 4: Iterate month-by-month
  const totalMonths = years * 12;
  for (let month = 1; month <= totalMonths; month++) {
    balance            = balance * monthlyFactor + monthly;
    cumulativeContribs = cumulativeContribs + monthly;

    // Sample at every year boundary (month 12, 24, 36, …)
    if (month % 12 === 0) {
      const year = month / 12;
      labels.push(String(year));
      contributions.push(cumulativeContribs);
      futureValue.push(balance);
      realValue.push(balance / Math.pow(1 + inflation / 100, year));
    }
  }

  return { labels, contributions, futureValue, realValue };
}

// ---------------------------------------------------------------------------
// 1. readInputs() — reads form values from the DOM
// ---------------------------------------------------------------------------
function readInputs() {
  return {
    years:     parseFloat(document.getElementById('years').value),
    initial:   parseFloat(document.getElementById('initial').value),
    monthly:   parseFloat(document.getElementById('monthly').value),
    rate:      parseFloat(document.getElementById('rate').value),
    frequency: parseInt(document.getElementById('frequency').value, 10),
    inflation: parseFloat(document.getElementById('inflation').value),
  };
}

// ---------------------------------------------------------------------------
// 2. Currency formatter (rebuilt when the user changes currency)
// ---------------------------------------------------------------------------
let currencyFmt = makeCurrencyFmt('USD');

function makeCurrencyFmt(code) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  });
}

function currencySymbolFor(code) {
  // Format 0 and strip digits/whitespace to leave just the symbol Intl chose.
  const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code })
    .formatToParts(0);
  return parts.filter(p => p.type === 'currency').map(p => p.value).join('');
}

function applyCurrencySymbol(code) {
  const sym = currencySymbolFor(code);
  document.querySelectorAll('.currency-symbol').forEach(el => { el.textContent = sym; });
}

// ---------------------------------------------------------------------------
// 3. Chart instance variables
// ---------------------------------------------------------------------------
let chartContributions = null;
let chartFuture        = null;
let chartInflation     = null;

// ---------------------------------------------------------------------------
// 4. updateSummary(data) — populates the 4 stat spans
// ---------------------------------------------------------------------------
function updateSummary(data) {
  const last = data.labels.length - 1;
  document.getElementById('stat-contributed').textContent =
    currencyFmt.format(data.contributions[last]);
  document.getElementById('stat-future').textContent =
    currencyFmt.format(data.futureValue[last]);
  document.getElementById('stat-interest').textContent =
    currencyFmt.format(data.futureValue[last] - data.contributions[last]);
  document.getElementById('stat-real').textContent =
    currencyFmt.format(data.realValue[last]);
}

// ---------------------------------------------------------------------------
// 5. renderCharts() — builds / rebuilds all three Chart.js charts
// ---------------------------------------------------------------------------
function renderCharts() {
  const inputs = readInputs();
  const data   = project(inputs);

  // Common y-axis / tooltip formatting options
  const yAxisTicks = {
    callback: (value) => currencyFmt.format(value),
  };
  const tooltipCallbacks = {
    label: (context) => currencyFmt.format(context.parsed.y),
  };

  // Shared chart options factory
  function makeOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: { callbacks: tooltipCallbacks },
        legend: { display: true },
      },
      scales: {
        y: {
          ticks: yAxisTicks,
          grid: { display: true },
        },
        x: {
          grid: { display: false },
          border: { display: false },
        },
      },
    };
  }

  // -- Chart 1: Total Contributions --
  if (chartContributions !== null) { chartContributions.destroy(); }
  chartContributions = new Chart(
    document.getElementById('chart-contributions'),
    {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Total Contributions',
          data: data.contributions,
          fill: true,
          borderColor: '#4fc3f7',
          backgroundColor: '#4fc3f7',
          tension: 0.3,
          pointRadius: 2,
        }],
      },
      options: makeOptions(),
    }
  );

  // -- Chart 2: Future Value --
  if (chartFuture !== null) { chartFuture.destroy(); }
  chartFuture = new Chart(
    document.getElementById('chart-future'),
    {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Future Value',
          data: data.futureValue,
          fill: true,
          borderColor: '#81c784',
          backgroundColor: '#81c784',
          tension: 0.3,
          pointRadius: 2,
        }],
      },
      options: makeOptions(),
    }
  );

  // -- Chart 3: Inflation comparison (three datasets, no fill) --
  if (chartInflation !== null) { chartInflation.destroy(); }
  chartInflation = new Chart(
    document.getElementById('chart-inflation'),
    {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Total Contributions',
            data: data.contributions,
            fill: false,
            borderColor: '#4fc3f7',
            backgroundColor: '#4fc3f7',
            tension: 0.3,
            pointRadius: 2,
          },
          {
            label: 'Future Value',
            data: data.futureValue,
            fill: false,
            borderColor: '#81c784',
            backgroundColor: '#81c784',
            tension: 0.3,
            pointRadius: 2,
          },
          {
            label: "Real Value (today's $)",
            data: data.realValue,
            fill: false,
            borderColor: '#ffb74d',
            backgroundColor: '#ffb74d',
            tension: 0.3,
            pointRadius: 2,
          },
        ],
      },
      options: makeOptions(),
    }
  );

  updateSummary(data);
}

// ---------------------------------------------------------------------------
// 6. Event wiring
// ---------------------------------------------------------------------------
document.getElementById('inputs').addEventListener('input', renderCharts);

document.getElementById('currency').addEventListener('change', (e) => {
  const code = e.target.value;
  currencyFmt = makeCurrencyFmt(code);
  applyCurrencySymbol(code);
  renderCharts();
});

applyCurrencySymbol('USD');
renderCharts();
