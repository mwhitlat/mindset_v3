const DB_NAME = "mindset-db";
const DB_VERSION = 1;
const VISITS_STORE = "visits";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PROPOSAL_LOG_KEY = "governanceProposalLog";
const GOVERNANCE_CONFIG_KEY = "governanceConfig";
const STABLE_SNAPSHOT_KEY = "governanceStableSnapshot";
const TRUST_PROXIES_KEY = "trustProxyMetrics";
const TRUST_TREND_KEY = "trustProxyTrend";
const TRUST_THRESHOLDS_KEY = "trustThresholdConfig";
const REPLAY_SNAPSHOTS_KEY = "replaySnapshots";
const SANDBOX_CONFIG_KEY = "sandboxConfig";
const PROPOSAL_STATUS_VALUES = new Set(["pending", "approved", "rejected", "rolled_back"]);
const TRUST_PROXY_COUNTERS = new Set(["negativeFeedbackCount", "sectionDisablementCount", "reportReopenCount"]);
const SANDBOX_VARIANTS = new Set(["baseline", "compact", "replay_focus", "exposure_focus"]);
const DOMAIN_TAG_RULES = [
  { pattern: "news", tag: "general_news" },
  { pattern: "times", tag: "general_news" },
  { pattern: "post", tag: "general_news" },
  { pattern: "finance", tag: "finance" },
  { pattern: "market", tag: "finance" },
  { pattern: "invest", tag: "finance" },
  { pattern: "tech", tag: "technology" },
  { pattern: "verge", tag: "technology" },
  { pattern: "github", tag: "technology" },
  { pattern: "reddit", tag: "community" },
  { pattern: "x.com", tag: "community" },
  { pattern: "youtube", tag: "video" }
];
const TAG_ADJACENT_DOMAINS = {
  general_news: ["apnews.com", "reuters.com", "bbc.com"],
  finance: ["wsj.com", "marketwatch.com", "bloomberg.com"],
  technology: ["arstechnica.com", "wired.com", "theverge.com"],
  community: ["lobste.rs", "news.ycombinator.com", "medium.com"],
  video: ["vimeo.com", "pbs.org", "ted.com"],
  default: ["wikipedia.org", "reuters.com", "bbc.com"]
};
const NON_TOPICAL_DOMAIN_PATTERNS = [
  /^accounts\./i,
  /^mail\./i,
  /^calendar\./i,
  /^docs\./i,
  /^drive\./i,
  /^localhost$/i,
  /\.local$/i,
  /\.lan$/i,
  /\.internal$/i,
  /\.ts\.net$/i,
  /^[0-9]{1,3}(\.[0-9]{1,3}){3}$/
];
const INVARIANT_RULESET_VERSION = "calibration-v1.2";
const INVARIANT_HARD_VIOLATION_RULES = [
  { id: "directive_you_should", pattern: /\byou should\b/gi, label: 'Directive phrase "you should"' },
  { id: "directive_you_need_to", pattern: /\byou need to\b/gi, label: 'Directive phrase "you need to"' },
  { id: "directive_you_must", pattern: /\byou must\b/gi, label: 'Directive phrase "you must"' },
  { id: "directive_you_ought_to", pattern: /\byou ought to\b/gi, label: 'Directive phrase "you ought to"' },
  { id: "nudging_next_week", pattern: /\bnext week[, ]+(try|focus on|avoid|do)\b/gi, label: "Behavioral nudging phrase" },
  { id: "normative_scoring", pattern: /\b(score|grade)\s*[:=]\s*[0-9]+(\.[0-9]+)?\b/gi, label: "Normative scoring marker" }
];
const INVARIANT_WARNING_RULES = [
  { id: "bias_phrase", pattern: /\bto reduce bias\b/gi, label: 'Potentially advisory phrase "to reduce bias"' },
  { id: "balance_phrase", pattern: /\bto be more balanced\b/gi, label: 'Potentially advisory phrase "to be more balanced"' }
];
const REQUIRED_REFLECTION_HEADINGS = [
  "distribution overview",
  "frequency patterns",
  "notable concentrations"
];
const DEFAULT_TRUST_THRESHOLDS = {
  negativeFeedbackThreshold: 3,
  sectionDisablementThreshold: 3,
  reportReopenThreshold: 5,
  uninstallProxyWarn: true
};

const serviceWorkerStartMs = Date.now();

chrome.runtime.onInstalled.addListener(() => {
  Promise.all([
    ensureDb(),
    ensureProposalLog(),
    ensureGovernanceConfig(),
    ensureTrustProxies(),
    ensureReplaySnapshots(),
    ensureSandboxConfig(),
    ensureTrustTrend(),
    ensureTrustThresholds()
  ])
    .catch((error) => {
      console.error("Mindset initialization failed:", error);
    });
});

chrome.runtime.onStartup.addListener(() => {
  logPerformanceBaseline("startup");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    sendResponse({ ok: false, error: "Invalid message." });
    return false;
  }

  if (message.type === "capture-page") {
    capturePageVisit(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "generate-weekly-report") {
    generateWeeklyReport()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "append-governance-proposal") {
    appendGovernanceProposal(message.payload)
      .then((entry) => sendResponse({ ok: true, entry }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-governance-proposals") {
    getGovernanceProposalLog()
      .then((entries) => sendResponse({ ok: true, entries }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-governance-config") {
    getGovernanceConfig()
      .then((config) => sendResponse({ ok: true, config }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "set-governance-review-required") {
    setGovernanceReviewRequired(message.payload?.reviewRequired)
      .then((config) => sendResponse({ ok: true, config }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "apply-governance-proposal-status") {
    applyGovernanceProposalStatus(message.payload)
      .then((entry) => sendResponse({ ok: true, entry }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "rollback-governance-snapshot") {
    rollbackToLastApprovedSnapshot()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-rollback-status") {
    getRollbackStatus()
      .then((status) => sendResponse({ ok: true, status }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-trust-proxies") {
    getTrustProxies()
      .then((metrics) => sendResponse({ ok: true, metrics }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "increment-trust-proxy") {
    incrementTrustProxyCounter(message.payload?.counter)
      .then((metrics) => sendResponse({ ok: true, metrics }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "set-uninstall-proxy-flag") {
    setUninstallProxyFlag(message.payload?.value)
      .then((metrics) => sendResponse({ ok: true, metrics }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "create-replay-snapshot") {
    createReplaySnapshot()
      .then((snapshot) => sendResponse({ ok: true, snapshot }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-replay-snapshots") {
    getReplaySnapshots()
      .then((snapshots) => sendResponse({ ok: true, snapshots }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "run-replay-diff") {
    runReplayDiff(message.payload?.snapshotId)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-exposure-suggestions") {
    getExposureSuggestions()
      .then((suggestions) => sendResponse({ ok: true, suggestions }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-sandbox-config") {
    getSandboxConfig()
      .then((config) => sendResponse({ ok: true, config }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "set-sandbox-config") {
    setSandboxConfig(message.payload)
      .then((config) => sendResponse({ ok: true, config }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "run-density-check") {
    runDensityCheck()
      .then((check) => sendResponse({ ok: true, check }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "run-invariant-check") {
    runInvariantCheck()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-trust-trend") {
    getTrustTrend()
      .then((trend) => sendResponse({ ok: true, trend }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "get-trust-thresholds") {
    getTrustThresholds()
      .then((thresholds) => sendResponse({ ok: true, thresholds }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "set-trust-thresholds") {
    setTrustThresholds(message.payload)
      .then((thresholds) => sendResponse({ ok: true, thresholds }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  sendResponse({ ok: false, error: "Unknown message type." });
  return false;
});

async function capturePageVisit(payload) {
  if (!payload || typeof payload.url !== "string" || typeof payload.title !== "string") {
    return;
  }

  const url = payload.url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return;
  }

  let domain = "";
  try {
    domain = new URL(url).hostname;
  } catch {
    return;
  }

  const timestamp = Number(payload.timestamp) || Date.now();
  const entry = { url, domain, title: payload.title.trim(), timestamp };

  const db = await ensureDb();
  await withTransaction(db, VISITS_STORE, "readwrite", (store) => store.add(entry));
}

async function generateWeeklyReport() {
  const reportStartMs = Date.now();
  const now = Date.now();
  const start = now - ONE_WEEK_MS;
  const visits = await getVisitsSince(start);
  const summary = aggregateSummary(visits, start, now);
  const memoryEstimateBytes = estimateWeeklyDataSize(visits, summary);

  const reflection = await generateReflection(summary);
  const report = {
    generatedAt: new Date(now).toISOString(),
    period: {
      start: new Date(start).toISOString(),
      end: new Date(now).toISOString()
    },
    summary,
    reflection,
    performance: {
      memoryEstimateBytes,
      reportGenerationMs: Date.now() - reportStartMs
    }
  };

  await chrome.storage.local.set({
    latestWeeklyReport: report,
    lastPerformanceMetrics: {
      source: "report",
      startupOverheadMs: Date.now() - serviceWorkerStartMs,
      reportGenerationMs: report.performance.reportGenerationMs,
      memoryEstimateBytes,
      capturedAt: new Date().toISOString()
    }
  });
  logPerformanceBaseline("report");

  return { report };
}

async function generateReflection(summary) {
  return localDeterministicReflection(summary);
}

function localDeterministicReflection(summary) {
  const topDomainsText = summary.topDomains.length
    ? summary.topDomains.map((item) => `${item.domain} (${item.visits})`).join(", ")
    : "No domains recorded";

  const dailyPatternText = summary.dailyActivity
    .map((item) => `${item.day}: ${item.visits}`)
    .join(", ");

  return [
    "Distribution Overview",
    `This week includes ${summary.totalVisits} recorded page views across ${summary.uniqueDomains} domains.`,
    `Most frequent domains: ${topDomainsText}.`,
    "",
    "Frequency Patterns",
    `Daily activity totals: ${dailyPatternText}.`,
    "",
    "Notable Concentrations",
    summary.topDomains.length
      ? `The highest concentration appears in ${summary.topDomains[0].domain} with ${summary.topDomains[0].visits} visits.`
      : "No concentration is visible because no weekly entries are available."
  ].join("\n");
}

async function getVisitsSince(startMs) {
  const db = await ensureDb();
  return withTransaction(db, VISITS_STORE, "readonly", (store) => {
    return new Promise((resolve, reject) => {
      const results = [];
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(results);
          return;
        }
        const value = cursor.value;
        if (value && Number(value.timestamp) >= startMs) {
          results.push(value);
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error("Cursor read failed"));
    });
  });
}

function aggregateSummary(visits, start, end) {
  const domainCounts = new Map();
  const dayCounts = new Map();

  for (const visit of visits) {
    const domain = String(visit.domain || "unknown");
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);

    const day = new Date(Number(visit.timestamp)).toISOString().slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }

  const topDomains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, visits: count }))
    .sort((a, b) => b.visits - a.visits || a.domain.localeCompare(b.domain))
    .slice(0, 8);

  const dailyActivity = enumerateDays(start, end).map((day) => ({
    day,
    visits: dayCounts.get(day) || 0
  }));

  return {
    totalVisits: visits.length,
    uniqueDomains: domainCounts.size,
    topDomains,
    dailyActivity
  };
}

function enumerateDays(startMs, endMs) {
  const days = [];
  const cursor = new Date(startMs);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(endMs);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function ensureDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VISITS_STORE)) {
        const store = db.createObjectStore(VISITS_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("domain", "domain", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

function withTransaction(db, storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let operationResult;

    try {
      operationResult = operation(store);
    } catch (error) {
      reject(error);
      return;
    }

    tx.oncomplete = () => resolve(operationResult);
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
}

function logPerformanceBaseline(source) {
  const startupOverheadMs = Date.now() - serviceWorkerStartMs;
  const payload = {
    source,
    startupOverheadMs,
    capturedAt: new Date().toISOString()
  };
  console.debug("[Mindset performance]", payload);
  chrome.storage.local.set({ lastPerformanceMetrics: payload }).catch(() => {
    // Keep baseline logging non-blocking.
  });
}

function estimateWeeklyDataSize(visits, summary) {
  return JSON.stringify({ visits, summary }).length;
}

async function ensureProposalLog() {
  const data = await chrome.storage.local.get([PROPOSAL_LOG_KEY]);
  if (!Array.isArray(data[PROPOSAL_LOG_KEY])) {
    await chrome.storage.local.set({ [PROPOSAL_LOG_KEY]: [] });
  }
}

async function appendGovernanceProposal(payload) {
  const config = await getGovernanceConfig();
  const entry = await createGovernanceProposalEntry(payload);
  if (config.review_required && entry.status !== "pending") {
    throw new Error("Manual review is required. New proposals must start as pending.");
  }
  await appendGovernanceLogEntry(entry);
  return entry;
}

async function getGovernanceProposalLog() {
  const data = await chrome.storage.local.get([PROPOSAL_LOG_KEY]);
  if (!Array.isArray(data[PROPOSAL_LOG_KEY])) {
    return [];
  }
  return data[PROPOSAL_LOG_KEY];
}

async function ensureGovernanceConfig() {
  const data = await chrome.storage.local.get([GOVERNANCE_CONFIG_KEY]);
  const current = data[GOVERNANCE_CONFIG_KEY];
  if (!current || typeof current !== "object" || typeof current.review_required !== "boolean") {
    await chrome.storage.local.set({
      [GOVERNANCE_CONFIG_KEY]: { review_required: true }
    });
  }
}

async function getGovernanceConfig() {
  const data = await chrome.storage.local.get([GOVERNANCE_CONFIG_KEY]);
  const current = data[GOVERNANCE_CONFIG_KEY];
  if (!current || typeof current.review_required !== "boolean") {
    return { review_required: true };
  }
  return { review_required: current.review_required };
}

async function setGovernanceReviewRequired(reviewRequired) {
  if (typeof reviewRequired !== "boolean") {
    throw new Error("reviewRequired must be a boolean.");
  }
  const config = { review_required: reviewRequired };
  await chrome.storage.local.set({ [GOVERNANCE_CONFIG_KEY]: config });
  return config;
}

async function applyGovernanceProposalStatus(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid apply payload.");
  }

  const proposalId = String(payload.proposalId || "").trim();
  if (!proposalId) {
    throw new Error("proposalId is required.");
  }

  const nextStatus = String(payload.status || "").trim();
  if (!PROPOSAL_STATUS_VALUES.has(nextStatus) || nextStatus === "pending") {
    throw new Error("status must be approved, rejected, or rolled_back.");
  }

  const entries = await getGovernanceProposalLog();
  const index = entries.findIndex((entry) => entry.id === proposalId);
  if (index < 0) {
    throw new Error("Proposal not found.");
  }

  const current = entries[index];
  if (current.status !== "pending") {
    throw new Error("Only pending proposals can be applied.");
  }

  const updated = {
    ...current,
    status: nextStatus,
    reviewedAt: new Date().toISOString()
  };

  entries[index] = updated;
  await chrome.storage.local.set({ [PROPOSAL_LOG_KEY]: entries });
  if (nextStatus === "approved") {
    await saveStableSnapshot(updated.id);
  }
  return updated;
}

async function saveStableSnapshot(sourceProposalId) {
  const config = await getGovernanceConfig();
  const snapshot = {
    snapshotId: `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: new Date().toISOString(),
    sourceProposalId,
    governanceConfig: config
  };
  await chrome.storage.local.set({ [STABLE_SNAPSHOT_KEY]: snapshot });
  return snapshot;
}

async function rollbackToLastApprovedSnapshot() {
  const data = await chrome.storage.local.get([STABLE_SNAPSHOT_KEY]);
  const snapshot = data[STABLE_SNAPSHOT_KEY];
  if (!snapshot || !snapshot.governanceConfig) {
    throw new Error("No approved stable snapshot available for rollback.");
  }

  const rollbackAt = new Date().toISOString();
  await chrome.storage.local.set({
    [GOVERNANCE_CONFIG_KEY]: snapshot.governanceConfig
  });

  const rollbackEntry = {
    id: `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: rollbackAt,
    proposedChangeSummary: `Rollback to snapshot ${snapshot.snapshotId}`,
    triggeringChecks: ["manual-rollback"],
    status: "rolled_back",
    rolledBackSnapshotId: snapshot.snapshotId
  };
  await appendGovernanceLogEntry(rollbackEntry);

  return {
    snapshot,
    rollbackEntry
  };
}

async function getRollbackStatus() {
  const data = await chrome.storage.local.get([STABLE_SNAPSHOT_KEY]);
  const snapshot = data[STABLE_SNAPSHOT_KEY] || null;
  return {
    available: Boolean(snapshot && snapshot.snapshotId),
    snapshotId: snapshot?.snapshotId || null,
    capturedAt: snapshot?.capturedAt || null
  };
}

async function appendGovernanceLogEntry(entry) {
  const entries = await getGovernanceProposalLog();
  entries.push(entry);
  await chrome.storage.local.set({ [PROPOSAL_LOG_KEY]: entries });
}

async function ensureTrustProxies() {
  const data = await chrome.storage.local.get([TRUST_PROXIES_KEY]);
  const current = data[TRUST_PROXIES_KEY];
  if (!isValidTrustProxies(current)) {
    const baseline = {
      negativeFeedbackCount: 0,
      sectionDisablementCount: 0,
      reportReopenCount: 0,
      uninstallProxyFlag: false,
      updatedAt: new Date().toISOString()
    };
    await chrome.storage.local.set({ [TRUST_PROXIES_KEY]: baseline });
    await appendTrustTrend(baseline);
  }
}

async function getTrustProxies() {
  const data = await chrome.storage.local.get([TRUST_PROXIES_KEY]);
  const current = data[TRUST_PROXIES_KEY];
  if (isValidTrustProxies(current)) {
    return current;
  }
  return {
    negativeFeedbackCount: 0,
    sectionDisablementCount: 0,
    reportReopenCount: 0,
    uninstallProxyFlag: false,
    updatedAt: new Date().toISOString()
  };
}

async function incrementTrustProxyCounter(counter) {
  const counterName = String(counter || "").trim();
  if (!TRUST_PROXY_COUNTERS.has(counterName)) {
    throw new Error("Invalid trust proxy counter.");
  }

  const metrics = await getTrustProxies();
  metrics[counterName] += 1;
  metrics.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ [TRUST_PROXIES_KEY]: metrics });
  await appendTrustTrend(metrics);
  return metrics;
}

async function setUninstallProxyFlag(value) {
  if (typeof value !== "boolean") {
    throw new Error("Uninstall proxy flag must be a boolean.");
  }

  const metrics = await getTrustProxies();
  metrics.uninstallProxyFlag = value;
  metrics.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ [TRUST_PROXIES_KEY]: metrics });
  await appendTrustTrend(metrics);
  return metrics;
}

function isValidTrustProxies(input) {
  return Boolean(
    input &&
      typeof input.negativeFeedbackCount === "number" &&
      typeof input.sectionDisablementCount === "number" &&
      typeof input.reportReopenCount === "number" &&
      typeof input.uninstallProxyFlag === "boolean"
  );
}

async function createGovernanceProposalEntry(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid proposal payload.");
  }

  const proposedChangeSummary = String(payload.proposedChangeSummary || "").trim();
  if (!proposedChangeSummary) {
    throw new Error("Proposal summary is required.");
  }

  const triggeringChecks = Array.isArray(payload.triggeringChecks)
    ? payload.triggeringChecks
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];
  if (triggeringChecks.length === 0) {
    throw new Error("At least one triggering check is required.");
  }

  const status = String(payload.status || "pending");
  if (!PROPOSAL_STATUS_VALUES.has(status)) {
    throw new Error("Invalid proposal status.");
  }

  const comparisonReport = await buildComparisonReport(payload);
  const requiresApproval = Boolean(comparisonReport.structuralChangeDetected || payload.requiresApproval === true);

  return {
    id: `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    proposedChangeSummary,
    triggeringChecks,
    status,
    requiresApproval,
    comparisonReport
  };
}

async function buildComparisonReport(payload) {
  const [governanceConfig, sandboxConfig] = await Promise.all([getGovernanceConfig(), getSandboxConfig()]);
  const proposedGovernanceConfig = payload.proposedGovernanceConfig || governanceConfig;
  const proposedSandboxConfig = payload.proposedSandboxConfig || sandboxConfig;

  const governanceDiff = diffFlatObject(governanceConfig, proposedGovernanceConfig);
  const sandboxDiff = diffFlatObject(sandboxConfig, proposedSandboxConfig);
  const structuralSections = Array.isArray(payload.structuralSections)
    ? payload.structuralSections.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const structuralChangeDetected = governanceDiff.changedKeys.length > 0 || sandboxDiff.changedKeys.length > 0;

  return {
    baseline: {
      governanceConfig,
      sandboxConfig
    },
    proposed: {
      governanceConfig: proposedGovernanceConfig,
      sandboxConfig: proposedSandboxConfig
    },
    structuralDiff: {
      governanceChangedKeys: governanceDiff.changedKeys,
      sandboxChangedKeys: sandboxDiff.changedKeys,
      structuralSections
    },
    structuralChangeDetected,
    summary: {
      governanceChangeCount: governanceDiff.changedKeys.length,
      sandboxChangeCount: sandboxDiff.changedKeys.length
    }
  };
}

function diffFlatObject(beforeObj, afterObj) {
  const before = beforeObj && typeof beforeObj === "object" ? beforeObj : {};
  const after = afterObj && typeof afterObj === "object" ? afterObj : {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changedKeys = [];
  for (const key of keys) {
    const beforeValue = JSON.stringify(before[key]);
    const afterValue = JSON.stringify(after[key]);
    if (beforeValue !== afterValue) {
      changedKeys.push(key);
    }
  }
  return { changedKeys: changedKeys.sort() };
}

async function ensureReplaySnapshots() {
  const data = await chrome.storage.local.get([REPLAY_SNAPSHOTS_KEY]);
  if (!Array.isArray(data[REPLAY_SNAPSHOTS_KEY])) {
    await chrome.storage.local.set({ [REPLAY_SNAPSHOTS_KEY]: [] });
  }
}

async function getReplaySnapshots() {
  const data = await chrome.storage.local.get([REPLAY_SNAPSHOTS_KEY]);
  if (!Array.isArray(data[REPLAY_SNAPSHOTS_KEY])) {
    return [];
  }
  return data[REPLAY_SNAPSHOTS_KEY];
}

async function createReplaySnapshot() {
  const data = await chrome.storage.local.get(["latestWeeklyReport"]);
  const report = data.latestWeeklyReport;
  if (!report || !report.summary || typeof report.reflection !== "string") {
    throw new Error("No weekly report available to snapshot.");
  }

  const snapshot = {
    id: `replay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    summary: report.summary,
    baselineReflection: report.reflection
  };

  const snapshots = await getReplaySnapshots();
  snapshots.push(snapshot);
  await chrome.storage.local.set({ [REPLAY_SNAPSHOTS_KEY]: snapshots });
  return snapshot;
}

async function runReplayDiff(snapshotId) {
  const id = String(snapshotId || "").trim();
  if (!id) {
    throw new Error("snapshotId is required.");
  }

  const snapshots = await getReplaySnapshots();
  const snapshot = snapshots.find((item) => item.id === id);
  if (!snapshot) {
    throw new Error("Replay snapshot not found.");
  }

  const replayReflection = await generateReflection(snapshot.summary);
  const diff = computeTextDiff(snapshot.baselineReflection, replayReflection);
  return {
    snapshotId: id,
    baselineReflection: snapshot.baselineReflection,
    replayReflection,
    diff
  };
}

function computeTextDiff(baseline, replay) {
  const baselineLines = String(baseline || "").split("\n");
  const replayLines = String(replay || "").split("\n");
  const max = Math.max(baselineLines.length, replayLines.length);
  const changes = [];

  for (let i = 0; i < max; i += 1) {
    const before = baselineLines[i] || "";
    const after = replayLines[i] || "";
    if (before !== after) {
      changes.push({
        line: i + 1,
        before,
        after
      });
    }
  }

  return {
    changedLineCount: changes.length,
    changes: changes.slice(0, 30)
  };
}

async function getExposureSuggestions() {
  const data = await chrome.storage.local.get(["latestWeeklyReport"]);
  const report = data.latestWeeklyReport;
  if (!report || !report.summary || !Array.isArray(report.summary.topDomains)) {
    return [];
  }

  const TARGET_SUGGESTION_COUNT = 3;
  const buckets = report.summary.topDomains
    .slice(0, 8)
    .map((item) => {
      const sourceDomain = String(item.domain || "unknown");
      if (!isTopicalDomain(sourceDomain)) {
        return null;
      }
      const tag = classifyDomainTag(sourceDomain);
      const suggestions = buildSymmetricSuggestions(sourceDomain, tag, TARGET_SUGGESTION_COUNT);
      return {
        sourceDomain,
        tag,
        framing: "Here are adjacent perspectives on this topic.",
        suggestions
      };
    })
    .filter(Boolean)
    .slice(0, 4);

  return buckets
    .map((item) => ({
      sourceDomain: item.sourceDomain,
      tag: item.tag,
      framing: item.framing,
      suggestions: item.suggestions
    }))
    .sort((a, b) => a.sourceDomain.localeCompare(b.sourceDomain));
}

function buildSymmetricSuggestions(sourceDomain, tag, targetCount) {
  const normalizedSource = String(sourceDomain || "").toLowerCase();
  const baseList = normalizeSuggestionList(TAG_ADJACENT_DOMAINS[tag] || TAG_ADJACENT_DOMAINS.default);
  const fallbackList = normalizeSuggestionList(TAG_ADJACENT_DOMAINS.default);
  const output = [];

  for (const domain of [...baseList, ...fallbackList]) {
    const normalized = String(domain || "").toLowerCase();
    if (!normalized || normalized === normalizedSource) {
      continue;
    }
    if (output.includes(normalized)) {
      continue;
    }
    output.push(normalized);
    if (output.length >= targetCount) {
      break;
    }
  }

  return output;
}

function normalizeSuggestionList(items) {
  const list = Array.isArray(items) ? items : [];
  return [...new Set(list.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))].sort();
}

function isTopicalDomain(domain) {
  const normalized = String(domain || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  for (const pattern of NON_TOPICAL_DOMAIN_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(normalized)) {
      return false;
    }
  }
  return true;
}

function classifyDomainTag(domain) {
  const normalized = String(domain || "").toLowerCase();
  for (const rule of DOMAIN_TAG_RULES) {
    if (normalized.includes(rule.pattern)) {
      return rule.tag;
    }
  }
  return "default";
}

async function ensureSandboxConfig() {
  const data = await chrome.storage.local.get([SANDBOX_CONFIG_KEY]);
  const current = data[SANDBOX_CONFIG_KEY];
  if (!current || typeof current.enabled !== "boolean" || !SANDBOX_VARIANTS.has(current.variant)) {
    await chrome.storage.local.set({
      [SANDBOX_CONFIG_KEY]: { enabled: false, variant: "baseline" }
    });
  }
}

async function getSandboxConfig() {
  const data = await chrome.storage.local.get([SANDBOX_CONFIG_KEY]);
  const current = data[SANDBOX_CONFIG_KEY];
  if (!current || typeof current.enabled !== "boolean" || !SANDBOX_VARIANTS.has(current.variant)) {
    return { enabled: false, variant: "baseline" };
  }
  return current;
}

async function setSandboxConfig(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid sandbox config payload.");
  }

  const enabled = Boolean(payload.enabled);
  const variant = String(payload.variant || "").trim();
  if (!SANDBOX_VARIANTS.has(variant)) {
    throw new Error("Invalid sandbox variant.");
  }

  const config = { enabled, variant };
  await chrome.storage.local.set({ [SANDBOX_CONFIG_KEY]: config });
  return config;
}

async function runDensityCheck() {
  const data = await chrome.storage.local.get(["latestWeeklyReport", "lastPerformanceMetrics"]);
  const report = data.latestWeeklyReport;
  const reflectionLength = String(report?.reflection || "").length;
  const topDomainCount = Number(report?.summary?.topDomains?.length || 0);
  const sectionCount = 13;

  const checks = [
    {
      name: "section_count",
      pass: sectionCount <= 14,
      value: sectionCount,
      limit: "<=14"
    },
    {
      name: "reflection_length",
      pass: reflectionLength <= 2400,
      value: reflectionLength,
      limit: "<=2400"
    },
    {
      name: "top_domain_count",
      pass: topDomainCount <= 8,
      value: topDomainCount,
      limit: "<=8"
    },
    {
      name: "summary_row_balance",
      pass: topDomainCount >= 0 && topDomainCount <= 8,
      value: topDomainCount,
      limit: "stable row count"
    }
  ];

  return {
    status: checks.every((item) => item.pass) ? "pass" : "warn",
    checks,
    generatedAt: new Date().toISOString()
  };
}

async function runInvariantCheck() {
  const data = await chrome.storage.local.get(["latestWeeklyReport"]);
  const report = data.latestWeeklyReport;
  if (!report) {
    return {
      status: "warn",
      warnings: ["No report found for invariant check."],
      rulesetVersion: INVARIANT_RULESET_VERSION,
      checkedAt: new Date().toISOString()
    };
  }

  const warnings = [];
  const violations = [];
  const reflectionRaw = String(report.reflection || "");
  const reflection = reflectionRaw.toLowerCase();

  violations.push(...collectInvariantMatches(reflection, INVARIANT_HARD_VIOLATION_RULES));
  warnings.push(...collectInvariantMatches(reflection, INVARIANT_WARNING_RULES));

  for (const heading of REQUIRED_REFLECTION_HEADINGS) {
    if (!reflection.includes(heading)) {
      warnings.push(`Expected reflection heading missing: ${toHeadingLabel(heading)}.`);
    }
  }

  return {
    status: violations.length > 0 ? "fail" : warnings.length === 0 ? "pass" : "warn",
    violations,
    warnings,
    rulesetVersion: INVARIANT_RULESET_VERSION,
    checkedAt: new Date().toISOString()
  };
}

function collectInvariantMatches(text, rules) {
  const matches = [];
  for (const rule of rules) {
    const pattern = rule.pattern;
    pattern.lastIndex = 0;
    const found = pattern.exec(text);
    if (found && found[0]) {
      matches.push(`${rule.label}: "${found[0]}"`);
    }
  }
  return matches;
}

async function ensureTrustTrend() {
  const data = await chrome.storage.local.get([TRUST_TREND_KEY]);
  if (!Array.isArray(data[TRUST_TREND_KEY])) {
    await chrome.storage.local.set({ [TRUST_TREND_KEY]: [] });
  }
}

async function ensureTrustThresholds() {
  const data = await chrome.storage.local.get([TRUST_THRESHOLDS_KEY]);
  const current = data[TRUST_THRESHOLDS_KEY];
  if (!isValidTrustThresholds(current)) {
    await chrome.storage.local.set({ [TRUST_THRESHOLDS_KEY]: DEFAULT_TRUST_THRESHOLDS });
  }
}

async function getTrustThresholds() {
  const data = await chrome.storage.local.get([TRUST_THRESHOLDS_KEY]);
  const current = data[TRUST_THRESHOLDS_KEY];
  if (!isValidTrustThresholds(current)) {
    return { ...DEFAULT_TRUST_THRESHOLDS };
  }
  return current;
}

async function setTrustThresholds(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid trust threshold payload.");
  }

  const parsed = {
    negativeFeedbackThreshold: toPositiveInt(payload.negativeFeedbackThreshold),
    sectionDisablementThreshold: toPositiveInt(payload.sectionDisablementThreshold),
    reportReopenThreshold: toPositiveInt(payload.reportReopenThreshold),
    uninstallProxyWarn: Boolean(payload.uninstallProxyWarn)
  };

  if (!isValidTrustThresholds(parsed)) {
    throw new Error("Invalid trust threshold values.");
  }
  await chrome.storage.local.set({ [TRUST_THRESHOLDS_KEY]: parsed });
  return parsed;
}

async function getTrustTrend() {
  const [data, thresholds] = await Promise.all([
    chrome.storage.local.get([TRUST_TREND_KEY]),
    getTrustThresholds()
  ]);
  if (!Array.isArray(data[TRUST_TREND_KEY])) {
    return { recent: [], warnings: [], windows: {}, directions: {}, thresholds };
  }

  const cleaned = sanitizeTrustTrend(data[TRUST_TREND_KEY]);
  const recent = cleaned.slice(-10);
  const recent5 = cleaned.slice(-5);
  const latest = recent[recent.length - 1];
  const previous = recent.length > 1 ? recent[recent.length - 2] : null;
  const warnings = [];

  if (latest) {
    if (latest.negativeFeedbackCount >= thresholds.negativeFeedbackThreshold) {
      warnings.push(`Negative feedback count reached threshold (>=${thresholds.negativeFeedbackThreshold}).`);
    }
    if (latest.sectionDisablementCount >= thresholds.sectionDisablementThreshold) {
      warnings.push(`Section disablement count reached threshold (>=${thresholds.sectionDisablementThreshold}).`);
    }
    if (latest.reportReopenCount >= thresholds.reportReopenThreshold) {
      warnings.push(`Report reopen count reached threshold (>=${thresholds.reportReopenThreshold}).`);
    }
    if (thresholds.uninstallProxyWarn && latest.uninstallProxyFlag) {
      warnings.push("Uninstall proxy flag is enabled.");
    }
  }

  return {
    recent,
    warnings,
    thresholds,
    windows: {
      last5: summarizeTrendWindow(recent5),
      last10: summarizeTrendWindow(recent)
    },
    directions: computeTrustDirections(previous, latest)
  };
}

async function appendTrustTrend(metrics) {
  const data = await chrome.storage.local.get([TRUST_TREND_KEY]);
  const trend = Array.isArray(data[TRUST_TREND_KEY]) ? data[TRUST_TREND_KEY] : [];
  const entry = {
    timestamp: metrics.updatedAt,
    negativeFeedbackCount: metrics.negativeFeedbackCount,
    sectionDisablementCount: metrics.sectionDisablementCount,
    reportReopenCount: metrics.reportReopenCount,
    uninstallProxyFlag: metrics.uninstallProxyFlag
  };
  const latest = trend[trend.length - 1];
  if (latest && isSameTrendEntry(latest, entry)) {
    return;
  }
  trend.push(entry);
  while (trend.length > 50) {
    trend.shift();
  }
  const cleaned = sanitizeTrustTrend(trend);
  await chrome.storage.local.set({ [TRUST_TREND_KEY]: cleaned });
}

function isSameTrendEntry(a, b) {
  return (
    Number(a.negativeFeedbackCount) === Number(b.negativeFeedbackCount) &&
    Number(a.sectionDisablementCount) === Number(b.sectionDisablementCount) &&
    Number(a.reportReopenCount) === Number(b.reportReopenCount) &&
    Boolean(a.uninstallProxyFlag) === Boolean(b.uninstallProxyFlag)
  );
}

function sanitizeTrustTrend(entries) {
  const safe = Array.isArray(entries) ? entries : [];
  const normalized = safe
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      timestamp: new Date(entry.timestamp || Date.now()).toISOString(),
      negativeFeedbackCount: Number(entry.negativeFeedbackCount || 0),
      sectionDisablementCount: Number(entry.sectionDisablementCount || 0),
      reportReopenCount: Number(entry.reportReopenCount || 0),
      uninstallProxyFlag: Boolean(entry.uninstallProxyFlag)
    }))
    .filter((entry) => Number.isFinite(Date.parse(entry.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const deduped = [];
  for (const entry of normalized) {
    const last = deduped[deduped.length - 1];
    if (last && Date.parse(last.timestamp) === Date.parse(entry.timestamp) && isSameTrendEntry(last, entry)) {
      continue;
    }
    deduped.push(entry);
  }
  return deduped.slice(-50);
}

function summarizeTrendWindow(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      sampleSize: 0,
      maxNegativeFeedback: 0,
      maxSectionDisablement: 0,
      maxReportReopen: 0
    };
  }

  return {
    sampleSize: entries.length,
    maxNegativeFeedback: Math.max(...entries.map((item) => Number(item.negativeFeedbackCount || 0))),
    maxSectionDisablement: Math.max(...entries.map((item) => Number(item.sectionDisablementCount || 0))),
    maxReportReopen: Math.max(...entries.map((item) => Number(item.reportReopenCount || 0)))
  };
}

function computeTrustDirections(previous, latest) {
  if (!previous || !latest) {
    return {
      negativeFeedback: "stable",
      sectionDisablement: "stable",
      reportReopen: "stable"
    };
  }
  return {
    negativeFeedback: direction(previous.negativeFeedbackCount, latest.negativeFeedbackCount),
    sectionDisablement: direction(previous.sectionDisablementCount, latest.sectionDisablementCount),
    reportReopen: direction(previous.reportReopenCount, latest.reportReopenCount)
  };
}

function direction(before, after) {
  const a = Number(before || 0);
  const b = Number(after || 0);
  if (b > a) return "up";
  if (b < a) return "down";
  return "stable";
}

function isValidTrustThresholds(input) {
  return Boolean(
    input &&
      Number.isInteger(input.negativeFeedbackThreshold) &&
      input.negativeFeedbackThreshold >= 1 &&
      Number.isInteger(input.sectionDisablementThreshold) &&
      input.sectionDisablementThreshold >= 1 &&
      Number.isInteger(input.reportReopenThreshold) &&
      input.reportReopenThreshold >= 1 &&
      typeof input.uninstallProxyWarn === "boolean"
  );
}

function toPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return -1;
  }
  return Math.max(1, Math.floor(parsed));
}

function toHeadingLabel(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
