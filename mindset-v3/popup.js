const statusText = document.getElementById("statusText");
const reflectionText = document.getElementById("reflectionText");
const domainChart = document.getElementById("domainChart");
const summaryBlock = document.getElementById("summaryBlock");
const performanceBlock = document.getElementById("performanceBlock");
const generateReportButton = document.getElementById("generateReportButton");

generateReportButton.addEventListener("click", async () => {
  generateReportButton.disabled = true;
  setStatus("Generating weekly report...");
  try {
    const report = await requestWeeklyReport();
    renderReport(report);
    const memoryEstimate = report.performance?.memoryEstimateBytes ?? "n/a";
    setStatus(
      `Generated at ${new Date(report.generatedAt).toLocaleString()} | Estimated memory: ${memoryEstimate} bytes.`
    );
  } catch (error) {
    setStatus(`Report generation failed: ${error.message}`);
  } finally {
    generateReportButton.disabled = false;
  }
});

loadLatestReport();

async function loadLatestReport() {
  const data = await chrome.storage.local.get(["latestWeeklyReport", "lastPerformanceMetrics"]);
  renderPerformance(data.lastPerformanceMetrics || null);
  if (!data.latestWeeklyReport) {
    return;
  }
  renderReport(data.latestWeeklyReport);
  const memoryEstimate = data.latestWeeklyReport.performance?.memoryEstimateBytes ?? "n/a";
  setStatus(
    `Loaded report from ${new Date(data.latestWeeklyReport.generatedAt).toLocaleString()} | Estimated memory: ${memoryEstimate} bytes.`
  );
}

function requestWeeklyReport() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "generate-weekly-report" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response || !response.ok) {
        reject(new Error(response?.error || "Unknown report error"));
        return;
      }
      resolve(response.report);
    });
  });
}

function renderReport(report) {
  reflectionText.textContent = report.reflection;
  renderDomainChart(report.summary.topDomains);
  renderSummary(report);
  renderPerformance({
    source: "report",
    startupOverheadMs: null,
    reportGenerationMs: report.performance?.reportGenerationMs ?? null,
    memoryEstimateBytes: report.performance?.memoryEstimateBytes ?? null
  });
}

function renderDomainChart(domains) {
  domainChart.textContent = "";
  if (!domains || domains.length === 0) {
    const empty = document.createElement("p");
    empty.className = "label";
    empty.textContent = "No weekly domain activity available.";
    domainChart.appendChild(empty);
    return;
  }

  const maxVisits = Math.max(...domains.map((item) => item.visits), 1);

  for (const item of domains) {
    const row = document.createElement("div");
    row.className = "chart-row";

    const domain = document.createElement("div");
    domain.className = "chart-domain";
    domain.textContent = item.domain;

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.round((item.visits / maxVisits) * 100)}%`;
    track.appendChild(fill);

    const value = document.createElement("div");
    value.className = "chart-value";
    value.textContent = String(item.visits);

    row.append(domain, track, value);
    domainChart.appendChild(row);
  }
}

function setStatus(message) {
  statusText.textContent = message;
}

function renderPerformance(metrics) {
  performanceBlock.textContent = "";
  if (!metrics) {
    const empty = document.createElement("p");
    empty.className = "label";
    empty.textContent = "No performance data available yet.";
    performanceBlock.appendChild(empty);
    return;
  }

  const items = [
    {
      label: "Startup Overhead (ms)",
      value: formatMetric(metrics.startupOverheadMs)
    },
    {
      label: "Report Time (ms)",
      value: formatMetric(metrics.reportGenerationMs)
    },
    {
      label: "Memory Estimate (bytes)",
      value: formatMetric(metrics.memoryEstimateBytes)
    },
    {
      label: "Source",
      value: String(metrics.source || "n/a")
    }
  ];

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "summary-item";

    const value = document.createElement("p");
    value.className = "summary-value";
    value.textContent = item.value;

    const label = document.createElement("p");
    label.className = "label";
    label.textContent = item.label;

    row.append(value, label);
    performanceBlock.appendChild(row);
  }
}

function formatMetric(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }
  return String(Math.max(0, Math.round(value)));
}

function renderSummary(report) {
  summaryBlock.textContent = "";

  const periodStart = new Date(report.period.start).toLocaleDateString();
  const periodEnd = new Date(report.period.end).toLocaleDateString();
  const items = [
    { label: "Total Visits", value: String(report.summary.totalVisits) },
    { label: "Unique Domains", value: String(report.summary.uniqueDomains) },
    { label: "From", value: periodStart },
    { label: "To", value: periodEnd }
  ];

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "summary-item";

    const value = document.createElement("p");
    value.className = "summary-value";
    value.textContent = item.value;

    const label = document.createElement("p");
    label.className = "label";
    label.textContent = item.label;

    row.append(value, label);
    summaryBlock.appendChild(row);
  }
}
