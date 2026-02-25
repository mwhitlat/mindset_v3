const statusText = document.getElementById("statusText");
const reflectionText = document.getElementById("reflectionText");
const domainChart = document.getElementById("domainChart");
const summaryBlock = document.getElementById("summaryBlock");
const performanceBlock = document.getElementById("performanceBlock");
const trustProxyBlock = document.getElementById("trustProxyBlock");
const generateReportButton = document.getElementById("generateReportButton");
const reviewRequiredCheckbox = document.getElementById("reviewRequiredCheckbox");
const proposalSummaryInput = document.getElementById("proposalSummaryInput");
const createProposalButton = document.getElementById("createProposalButton");
const rollbackButton = document.getElementById("rollbackButton");
const governanceStatusText = document.getElementById("governanceStatusText");
const rollbackStatusText = document.getElementById("rollbackStatusText");
const proposalLogList = document.getElementById("proposalLogList");
const createReplaySnapshotButton = document.getElementById("createReplaySnapshotButton");
const runReplayDiffButton = document.getElementById("runReplayDiffButton");
const replayStatusText = document.getElementById("replayStatusText");
const replayDiffBlock = document.getElementById("replayDiffBlock");
const exposureBlock = document.getElementById("exposureBlock");
const sandboxEnabledCheckbox = document.getElementById("sandboxEnabledCheckbox");
const sandboxVariantSelect = document.getElementById("sandboxVariantSelect");
const sandboxStatusText = document.getElementById("sandboxStatusText");
const runDensityCheckButton = document.getElementById("runDensityCheckButton");
const densityBlock = document.getElementById("densityBlock");
const runInvariantCheckButton = document.getElementById("runInvariantCheckButton");
const refreshTrustTrendButton = document.getElementById("refreshTrustTrendButton");
const invariantBlock = document.getElementById("invariantBlock");
const trustTrendBlock = document.getElementById("trustTrendBlock");
const governanceSection = document.getElementById("governanceSection");
const replaySection = document.getElementById("replaySection");
const exposureSection = document.getElementById("exposureSection");
const recordNegativeFeedbackButton = document.getElementById("recordNegativeFeedbackButton");
const recordSectionDisablementButton = document.getElementById("recordSectionDisablementButton");
const uninstallProxyFlagCheckbox = document.getElementById("uninstallProxyFlagCheckbox");
let latestReplaySnapshotId = "";
let currentSandboxState = { enabled: false, variant: "baseline" };

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

createProposalButton.addEventListener("click", async () => {
  createProposalButton.disabled = true;
  try {
    const summary = String(proposalSummaryInput.value || "").trim();
    if (!summary) {
      throw new Error("Proposal summary is required.");
    }
    await sendRuntimeMessage({
      type: "append-governance-proposal",
      payload: {
        proposedChangeSummary: summary,
        triggeringChecks: ["manual-create"]
      }
    });
    proposalSummaryInput.value = "";
    await loadGovernanceProposals();
    setGovernanceStatus("Proposal created.");
  } catch (error) {
    setGovernanceStatus(`Proposal create failed: ${error.message}`);
  } finally {
    createProposalButton.disabled = false;
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
    await loadRollbackStatus();
  } catch (error) {
    setGovernanceStatus(`Rollback failed: ${error.message}`);
  } finally {
    rollbackButton.disabled = false;
  }
});

createReplaySnapshotButton.addEventListener("click", async () => {
  createReplaySnapshotButton.disabled = true;
  try {
    const snapshot = await sendRuntimeMessage({ type: "create-replay-snapshot" });
    latestReplaySnapshotId = snapshot.id;
    setReplayStatus(`Replay snapshot created at ${new Date(snapshot.timestamp).toLocaleString()}.`);
    await loadReplaySnapshots();
  } catch (error) {
    setReplayStatus(`Replay snapshot failed: ${error.message}`);
  } finally {
    createReplaySnapshotButton.disabled = false;
  }
});

runReplayDiffButton.addEventListener("click", async () => {
  runReplayDiffButton.disabled = true;
  try {
    if (!latestReplaySnapshotId) {
      throw new Error("No replay snapshot available.");
    }
    const result = await sendRuntimeMessage({
      type: "run-replay-diff",
      payload: { snapshotId: latestReplaySnapshotId }
    });
    renderReplayDiff(result);
    setReplayStatus(`Replay diff generated. Changed lines: ${result.diff.changedLineCount}.`);
  } catch (error) {
    setReplayStatus(`Replay diff failed: ${error.message}`);
  } finally {
    runReplayDiffButton.disabled = false;
  }
});

sandboxEnabledCheckbox.addEventListener("change", async () => {
  await persistSandboxConfig();
});

sandboxVariantSelect.addEventListener("change", async () => {
  await persistSandboxConfig();
});

runDensityCheckButton.addEventListener("click", async () => {
  runDensityCheckButton.disabled = true;
  try {
    const check = await sendRuntimeMessage({ type: "run-density-check" });
    renderDensityCheck(check);
  } catch (error) {
    densityBlock.textContent = "";
    const line = document.createElement("p");
    line.className = "label";
    line.textContent = `Density check failed: ${error.message}`;
    densityBlock.appendChild(line);
  } finally {
    runDensityCheckButton.disabled = false;
  }
});

runInvariantCheckButton.addEventListener("click", async () => {
  runInvariantCheckButton.disabled = true;
  try {
    const result = await sendRuntimeMessage({ type: "run-invariant-check" });
    renderInvariantCheck(result);
  } catch (error) {
    invariantBlock.textContent = "";
    const row = document.createElement("p");
    row.className = "label";
    row.textContent = `Invariant check failed: ${error.message}`;
    invariantBlock.appendChild(row);
  } finally {
    runInvariantCheckButton.disabled = false;
  }
});

refreshTrustTrendButton.addEventListener("click", async () => {
  await loadTrustTrend();
});

loadLatestReport();

async function loadLatestReport() {
  const data = await chrome.storage.local.get(["latestWeeklyReport", "lastPerformanceMetrics"]);
  await loadGovernanceConfig();
  await loadGovernanceProposals();
  await loadRollbackStatus();
  await loadReplaySnapshots();
  await loadSandboxConfig();
  await loadTrustProxies();
  await loadTrustTrend();
  renderPerformance(data.lastPerformanceMetrics || null);
  if (!data.latestWeeklyReport) {
    await loadExposureSuggestions();
    return;
  }
  renderReport(data.latestWeeklyReport);
  await incrementTrustProxy("reportReopenCount");
  await loadExposureSuggestions();
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

async function loadReplaySnapshots() {
  try {
    const snapshots = await sendRuntimeMessage({ type: "get-replay-snapshots" });
    if (Array.isArray(snapshots) && snapshots.length > 0) {
      latestReplaySnapshotId = snapshots[snapshots.length - 1].id;
      setReplayStatus(`Latest snapshot: ${new Date(snapshots[snapshots.length - 1].timestamp).toLocaleString()}.`);
    } else {
      latestReplaySnapshotId = "";
      setReplayStatus("Replay tools ready.");
      replayDiffBlock.textContent = "";
      const line = document.createElement("p");
      line.className = "label";
      line.textContent = "No replay diff available yet.";
      replayDiffBlock.appendChild(line);
    }
  } catch (error) {
    setReplayStatus(`Replay load failed: ${error.message}`);
  }
}

function setReplayStatus(message) {
  replayStatusText.textContent = message;
}

function renderReplayDiff(result) {
  replayDiffBlock.textContent = "";
  const summary = document.createElement("p");
  summary.className = "label";
  summary.textContent = `Changed lines: ${result.diff.changedLineCount}`;
  replayDiffBlock.appendChild(summary);

  if (!Array.isArray(result.diff.changes) || result.diff.changes.length === 0) {
    const row = document.createElement("p");
    row.className = "label";
    row.textContent = "No textual differences detected.";
    replayDiffBlock.appendChild(row);
    return;
  }

  for (const change of result.diff.changes.slice(0, getDensityItemLimit(5))) {
    const item = document.createElement("div");
    item.className = "log-item";

    const line = document.createElement("p");
    line.className = "label";
    line.textContent = `Line ${change.line}`;

    const before = document.createElement("p");
    before.className = "label";
    before.textContent = `Before: ${change.before || "(empty)"}`;

    const after = document.createElement("p");
    after.className = "label";
    after.textContent = `After: ${change.after || "(empty)"}`;

    item.append(line, before, after);
    replayDiffBlock.appendChild(item);
  }
}

async function loadExposureSuggestions() {
  try {
    const suggestions = await sendRuntimeMessage({ type: "get-exposure-suggestions" });
    renderExposureSuggestions(suggestions);
  } catch (error) {
    exposureBlock.textContent = "";
    const row = document.createElement("p");
    row.className = "label";
    row.textContent = `Exposure load failed: ${error.message}`;
    exposureBlock.appendChild(row);
  }
}

function renderExposureSuggestions(items) {
  exposureBlock.textContent = "";
  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "label";
    empty.textContent = "Generate a report to view adjacent perspective options.";
    exposureBlock.appendChild(empty);
    return;
  }

  for (const item of items.slice(0, getDensityItemLimit(3))) {
    const row = document.createElement("div");
    row.className = "log-item";

    const source = document.createElement("p");
    source.className = "summary-value";
    source.textContent = item.sourceDomain;

    const framing = document.createElement("p");
    framing.className = "label";
    framing.textContent = item.framing;

    const suggestions = document.createElement("p");
    suggestions.className = "label";
    suggestions.textContent = item.suggestions.join(", ");

    row.append(source, framing, suggestions);
    exposureBlock.appendChild(row);
  }
}

async function loadSandboxConfig() {
  try {
    const config = await sendRuntimeMessage({ type: "get-sandbox-config" });
    sandboxEnabledCheckbox.checked = Boolean(config.enabled);
    sandboxVariantSelect.value = String(config.variant || "baseline");
    currentSandboxState = config;
    applySandboxVariant(config);
    sandboxStatusText.textContent = "Sandbox controls ready.";
  } catch (error) {
    sandboxStatusText.textContent = `Sandbox load failed: ${error.message}`;
  }
}

async function persistSandboxConfig() {
  try {
    const config = await sendRuntimeMessage({
      type: "set-sandbox-config",
      payload: {
        enabled: Boolean(sandboxEnabledCheckbox.checked),
        variant: sandboxVariantSelect.value
      }
    });
    sandboxEnabledCheckbox.checked = Boolean(config.enabled);
    sandboxVariantSelect.value = String(config.variant);
    currentSandboxState = config;
    applySandboxVariant(config);
    await refreshSandboxDependentViews();
    sandboxStatusText.textContent = `Sandbox updated: ${config.enabled ? "enabled" : "disabled"} (${config.variant}).`;
  } catch (error) {
    sandboxStatusText.textContent = `Sandbox update failed: ${error.message}`;
  }
}

function renderDensityCheck(check) {
  densityBlock.textContent = "";
  const summary = document.createElement("p");
  summary.className = "label";
  summary.textContent = `Status: ${String(check.status).toUpperCase()}`;
  densityBlock.appendChild(summary);

  for (const item of check.checks || []) {
    const row = document.createElement("div");
    row.className = "log-item";

    const name = document.createElement("p");
    name.className = "summary-value";
    name.textContent = item.name;

    const value = document.createElement("p");
    value.className = "label";
    value.textContent = `Value: ${item.value} | Limit: ${item.limit}`;

    const pass = document.createElement("p");
    pass.className = "label";
    pass.textContent = `Pass: ${item.pass ? "yes" : "no"}`;

    row.append(name, value, pass);
    densityBlock.appendChild(row);
  }
}

function renderInvariantCheck(result) {
  invariantBlock.textContent = "";
  const header = document.createElement("p");
  header.className = "label";
  header.textContent = `Status: ${String(result.status || "unknown").toUpperCase()}`;
  invariantBlock.appendChild(header);

  if (!Array.isArray(result.warnings) || result.warnings.length === 0) {
    const ok = document.createElement("p");
    ok.className = "label";
    ok.textContent = "No invariant warnings.";
    invariantBlock.appendChild(ok);
    return;
  }

  for (const warning of result.warnings) {
    const row = document.createElement("div");
    row.className = "log-item";
    const line = document.createElement("p");
    line.className = "label";
    line.textContent = warning;
    row.appendChild(line);
    invariantBlock.appendChild(row);
  }
}

async function loadTrustTrend() {
  try {
    const trend = await sendRuntimeMessage({ type: "get-trust-trend" });
    renderTrustTrend(trend);
  } catch (error) {
    trustTrendBlock.textContent = "";
    const row = document.createElement("p");
    row.className = "label";
    row.textContent = `Trust trend load failed: ${error.message}`;
    trustTrendBlock.appendChild(row);
  }
}

function renderTrustTrend(trend) {
  trustTrendBlock.textContent = "";
  const warnings = Array.isArray(trend.warnings) ? trend.warnings : [];
  const recent = Array.isArray(trend.recent) ? trend.recent : [];

  const warningHeader = document.createElement("p");
  warningHeader.className = "label";
  warningHeader.textContent = warnings.length === 0 ? "No trust warnings." : `Warnings: ${warnings.length}`;
  trustTrendBlock.appendChild(warningHeader);

  for (const warning of warnings) {
    const row = document.createElement("div");
    row.className = "log-item";
    const line = document.createElement("p");
    line.className = "label";
    line.textContent = warning;
    row.appendChild(line);
    trustTrendBlock.appendChild(row);
  }

  if (recent.length === 0) {
    const empty = document.createElement("p");
    empty.className = "label";
    empty.textContent = "No trust trend history yet.";
    trustTrendBlock.appendChild(empty);
    return;
  }

  const latest = recent[recent.length - 1];
  const latestRow = document.createElement("div");
  latestRow.className = "log-item";
  const latestText = document.createElement("p");
  latestText.className = "label";
  latestText.textContent =
    `Latest: feedback=${latest.negativeFeedbackCount}, disable=${latest.sectionDisablementCount}, reopen=${latest.reportReopenCount}, uninstall=${latest.uninstallProxyFlag ? "yes" : "no"}`;
  latestRow.appendChild(latestText);
  trustTrendBlock.appendChild(latestRow);
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

async function loadRollbackStatus() {
  try {
    const status = await sendRuntimeMessage({ type: "get-rollback-status" });
    rollbackButton.disabled = !status.available;
    if (status.available) {
      rollbackStatusText.textContent = `Rollback target: ${status.snapshotId} (${new Date(status.capturedAt).toLocaleString()})`;
    } else {
      rollbackStatusText.textContent = "No approved snapshot available yet.";
    }
  } catch (error) {
    rollbackStatusText.textContent = `Rollback status failed: ${error.message}`;
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

  const recentEntries = entries.slice(-5).reverse().slice(0, getDensityItemLimit(5));
  for (const entry of recentEntries) {
    const row = document.createElement("div");
    row.className = "log-item";

    const summary = document.createElement("p");
    summary.className = "summary-value";
    summary.textContent = entry.proposedChangeSummary || "No summary";

    const status = document.createElement("p");
    status.className = "label";
    status.textContent = `Status: ${entry.status || "unknown"}`;
    if (entry.requiresApproval) {
      status.textContent += " | Requires Approval";
    }

    const time = document.createElement("p");
    time.className = "label";
    const timeText = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "n/a";
    time.textContent = `At: ${timeText}`;

    row.append(summary, status, time);

    if (entry.comparisonReport?.summary) {
      const compare = document.createElement("p");
      compare.className = "label";
      compare.textContent =
        `Compare: governance changes=${entry.comparisonReport.summary.governanceChangeCount}, sandbox changes=${entry.comparisonReport.summary.sandboxChangeCount}`;
      row.appendChild(compare);
    }

    if (entry.status === "pending") {
      const actions = document.createElement("div");
      actions.className = "actions-row";

      const approveButton = document.createElement("button");
      approveButton.className = "button";
      approveButton.type = "button";
      approveButton.textContent = "Approve";
      approveButton.addEventListener("click", async () => {
        await applyProposalStatus(entry.id, "approved");
      });

      const rejectButton = document.createElement("button");
      rejectButton.className = "button";
      rejectButton.type = "button";
      rejectButton.textContent = "Reject";
      rejectButton.addEventListener("click", async () => {
        await applyProposalStatus(entry.id, "rejected");
      });

      actions.append(approveButton, rejectButton);
      row.appendChild(actions);
    }

    proposalLogList.appendChild(row);
  }
}

async function applyProposalStatus(proposalId, status) {
  try {
    await sendRuntimeMessage({
      type: "apply-governance-proposal-status",
      payload: { proposalId, status }
    });
    await loadGovernanceProposals();
    await loadRollbackStatus();
    setGovernanceStatus(`Proposal ${status}.`);
  } catch (error) {
    setGovernanceStatus(`Proposal update failed: ${error.message}`);
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

function getDensityItemLimit(defaultCount) {
  if (!currentSandboxState.enabled) {
    return defaultCount;
  }
  if (currentSandboxState.variant === "compact") {
    return Math.max(1, defaultCount - 2);
  }
  return defaultCount;
}

function applySandboxVariant(config) {
  resetSectionOrder();
  document.body.classList.toggle("sandbox-compact", Boolean(config.enabled && config.variant === "compact"));
  if (!config.enabled) {
    return;
  }

  const app = document.querySelector(".app");
  if (!app) {
    return;
  }

  if (config.variant === "replay_focus") {
    app.insertBefore(replaySection, governanceSection);
  } else if (config.variant === "exposure_focus") {
    app.insertBefore(exposureSection, governanceSection);
  }
}

function resetSectionOrder() {
  const app = document.querySelector(".app");
  const performanceSection = performanceBlock.closest(".section");
  if (!app || !performanceSection) {
    return;
  }

  app.insertBefore(governanceSection, performanceSection.nextElementSibling);
  app.insertBefore(replaySection, governanceSection.nextElementSibling);
  app.insertBefore(exposureSection, replaySection.nextElementSibling);
}

async function refreshSandboxDependentViews() {
  await Promise.all([loadGovernanceProposals(), loadExposureSuggestions()]);
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
      if ("snapshots" in response) {
        resolve(response.snapshots);
        return;
      }
      if ("suggestions" in response) {
        resolve(response.suggestions);
        return;
      }
      if ("result" in response) {
        resolve(response.result);
        return;
      }
      if ("check" in response) {
        resolve(response.check);
        return;
      }
      if ("trend" in response) {
        resolve(response.trend);
        return;
      }
      if ("status" in response) {
        resolve(response.status);
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
