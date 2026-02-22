const statusText = document.getElementById("statusText");
const reflectionText = document.getElementById("reflectionText");
const domainChart = document.getElementById("domainChart");
const summaryBlock = document.getElementById("summaryBlock");
const performanceBlock = document.getElementById("performanceBlock");
const trustProxyBlock = document.getElementById("trustProxyBlock");
const generateReportButton = document.getElementById("generateReportButton");
const reviewRequiredCheckbox = document.getElementById("reviewRequiredCheckbox");
const rollbackButton = document.getElementById("rollbackButton");
const governanceStatusText = document.getElementById("governanceStatusText");
const proposalLogList = document.getElementById("proposalLogList");
const recordNegativeFeedbackButton = document.getElementById("recordNegativeFeedbackButton");
const recordSectionDisablementButton = document.getElementById("recordSectionDisablementButton");
const uninstallProxyFlagCheckbox = document.getElementById("uninstallProxyFlagCheckbox");

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

recordNegativeFeedbackButton.addEventListener("click", async () => {
  await incrementTrustProxy("negativeFeedbackCount");
});

recordSectionDisablementButton.addEventListener("click", async () => {
  await incrementTrustProxy("sectionDisablementCount");
});

uninstallProxyFlagCheckbox.addEventListener("change", async () => {
  try {
    const metrics = await setUninstallProxyFlag(Boolean(uninstallProxyFlagCheckbox.checked));
    renderTrustProxies(metrics);
    setStatus("Updated uninstall proxy flag.");
  } catch (error) {
    uninstallProxyFlagCheckbox.checked = !uninstallProxyFlagCheckbox.checked;
    setStatus(`Trust proxy update failed: ${error.message}`);
  }
});

reviewRequiredCheckbox.addEventListener("change", async () => {
  try {
    const config = await sendRuntimeMessage({
      type: "set-governance-review-required",
      payload: { reviewRequired: Boolean(reviewRequiredCheckbox.checked) }
    });
    renderGovernanceConfig(config);
    await loadGovernanceProposals();
    setGovernanceStatus("Governance review setting updated.");
  } catch (error) {
    reviewRequiredCheckbox.checked = !reviewRequiredCheckbox.checked;
    setGovernanceStatus(`Governance update failed: ${error.message}`);
  }
});

rollbackButton.addEventListener("click", async () => {
  rollbackButton.disabled = true;
  try {
    const result = await sendRuntimeMessage({ type: "rollback-governance-snapshot" });
    setGovernanceStatus(`Rollback completed to ${result.snapshot.snapshotId}.`);
    const config = await sendRuntimeMessage({ type: "get-governance-config" });
    renderGovernanceConfig(config);
    await loadGovernanceProposals();
  } catch (error) {
    setGovernanceStatus(`Rollback failed: ${error.message}`);
  } finally {
    rollbackButton.disabled = false;
  }
});

loadLatestReport();

async function loadLatestReport() {
  const data = await chrome.storage.local.get(["latestWeeklyReport", "lastPerformanceMetrics"]);
  await loadGovernanceConfig();
  await loadGovernanceProposals();
  await loadTrustProxies();
  renderPerformance(data.lastPerformanceMetrics || null);
  if (!data.latestWeeklyReport) {
    return;
  }
  renderReport(data.latestWeeklyReport);
  await incrementTrustProxy("reportReopenCount");
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

async function loadGovernanceConfig() {
  try {
    const config = await sendRuntimeMessage({ type: "get-governance-config" });
    renderGovernanceConfig(config);
  } catch (error) {
    setGovernanceStatus(`Governance load failed: ${error.message}`);
  }
}

function renderGovernanceConfig(config) {
  reviewRequiredCheckbox.checked = Boolean(config?.review_required);
}

function setGovernanceStatus(message) {
  governanceStatusText.textContent = message;
}

async function loadGovernanceProposals() {
  try {
    const entries = await sendRuntimeMessage({ type: "get-governance-proposals" });
    renderGovernanceProposals(entries);
  } catch (error) {
    proposalLogList.textContent = "";
    const message = document.createElement("p");
    message.className = "label";
    message.textContent = `Governance log load failed: ${error.message}`;
    proposalLogList.appendChild(message);
  }
}

function renderGovernanceProposals(entries) {
  proposalLogList.textContent = "";
  if (!Array.isArray(entries) || entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "label";
    empty.textContent = "No governance proposals logged yet.";
    proposalLogList.appendChild(empty);
    return;
  }

  const recentEntries = entries.slice(-5).reverse();
  for (const entry of recentEntries) {
    const row = document.createElement("div");
    row.className = "log-item";

    const summary = document.createElement("p");
    summary.className = "summary-value";
    summary.textContent = entry.proposedChangeSummary || "No summary";

    const status = document.createElement("p");
    status.className = "label";
    status.textContent = `Status: ${entry.status || "unknown"}`;

    const time = document.createElement("p");
    time.className = "label";
    const timeText = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "n/a";
    time.textContent = `At: ${timeText}`;

    row.append(summary, status, time);
    proposalLogList.appendChild(row);
  }
}

async function incrementTrustProxy(counter) {
  try {
    const metrics = await sendRuntimeMessage({
      type: "increment-trust-proxy",
      payload: { counter }
    });
    renderTrustProxies(metrics);
    setStatus("Updated trust proxy metrics.");
  } catch (error) {
    setStatus(`Trust proxy update failed: ${error.message}`);
  }
}

async function loadTrustProxies() {
  try {
    const metrics = await sendRuntimeMessage({ type: "get-trust-proxies" });
    renderTrustProxies(metrics);
  } catch (error) {
    setStatus(`Trust proxy load failed: ${error.message}`);
  }
}

async function setUninstallProxyFlag(value) {
  return sendRuntimeMessage({
    type: "set-uninstall-proxy-flag",
    payload: { value }
  });
}

function renderTrustProxies(metrics) {
  trustProxyBlock.textContent = "";
  if (!metrics) {
    const empty = document.createElement("p");
    empty.className = "label";
    empty.textContent = "No trust proxy data available yet.";
    trustProxyBlock.appendChild(empty);
    uninstallProxyFlagCheckbox.checked = false;
    return;
  }

  uninstallProxyFlagCheckbox.checked = Boolean(metrics.uninstallProxyFlag);

  const items = [
    { label: "Negative Feedback", value: formatMetric(metrics.negativeFeedbackCount) },
    { label: "Section Disablement", value: formatMetric(metrics.sectionDisablementCount) },
    { label: "Report Reopens", value: formatMetric(metrics.reportReopenCount) },
    { label: "Updated", value: metrics.updatedAt ? new Date(metrics.updatedAt).toLocaleString() : "n/a" }
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
    trustProxyBlock.appendChild(row);
  }
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

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response || !response.ok) {
        reject(new Error(response?.error || "Runtime message failed"));
        return;
      }
      if ("metrics" in response) {
        resolve(response.metrics);
        return;
      }
      if ("config" in response) {
        resolve(response.config);
        return;
      }
      if ("entry" in response) {
        resolve(response.entry);
        return;
      }
      if ("entries" in response) {
        resolve(response.entries);
        return;
      }
      if ("snapshot" in response || "rollbackEntry" in response) {
        resolve(response);
        return;
      }
      resolve(response);
    });
  });
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
