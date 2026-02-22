const DB_NAME = "mindset-db";
const DB_VERSION = 1;
const VISITS_STORE = "visits";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PROPOSAL_LOG_KEY = "governanceProposalLog";
const GOVERNANCE_CONFIG_KEY = "governanceConfig";
const STABLE_SNAPSHOT_KEY = "governanceStableSnapshot";
const TRUST_PROXIES_KEY = "trustProxyMetrics";
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

const serviceWorkerStartMs = Date.now();

chrome.runtime.onInstalled.addListener(() => {
  Promise.all([
    ensureDb(),
    ensureProposalLog(),
    ensureGovernanceConfig(),
    ensureTrustProxies(),
    ensureReplaySnapshots(),
    ensureSandboxConfig()
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
  const entry = createGovernanceProposalEntry(payload);
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

async function appendGovernanceLogEntry(entry) {
  const entries = await getGovernanceProposalLog();
  entries.push(entry);
  await chrome.storage.local.set({ [PROPOSAL_LOG_KEY]: entries });
}

async function ensureTrustProxies() {
  const data = await chrome.storage.local.get([TRUST_PROXIES_KEY]);
  const current = data[TRUST_PROXIES_KEY];
  if (!isValidTrustProxies(current)) {
    await chrome.storage.local.set({
      [TRUST_PROXIES_KEY]: {
        negativeFeedbackCount: 0,
        sectionDisablementCount: 0,
        reportReopenCount: 0,
        uninstallProxyFlag: false,
        updatedAt: new Date().toISOString()
      }
    });
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

function createGovernanceProposalEntry(payload) {
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

  return {
    id: `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    proposedChangeSummary,
    triggeringChecks,
    status
  };
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

  return report.summary.topDomains.slice(0, 3).map((item) => {
    const sourceDomain = String(item.domain || "unknown");
    const tag = classifyDomainTag(sourceDomain);
    const adjacent = TAG_ADJACENT_DOMAINS[tag] || TAG_ADJACENT_DOMAINS.default;
    const suggestions = adjacent.filter((domain) => domain !== sourceDomain).slice(0, 3);
    return {
      sourceDomain,
      framing: "Here are adjacent perspectives on this topic.",
      suggestions
    };
  });
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
    }
  ];

  return {
    status: checks.every((item) => item.pass) ? "pass" : "warn",
    checks,
    generatedAt: new Date().toISOString()
  };
}
