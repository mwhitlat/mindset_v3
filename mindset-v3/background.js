const DB_NAME = "mindset-db";
const DB_VERSION = 1;
const VISITS_STORE = "visits";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PROPOSAL_LOG_KEY = "governanceProposalLog";
const GOVERNANCE_CONFIG_KEY = "governanceConfig";
const STABLE_SNAPSHOT_KEY = "governanceStableSnapshot";
const TRUST_PROXIES_KEY = "trustProxyMetrics";
const PROPOSAL_STATUS_VALUES = new Set(["pending", "approved", "rejected", "rolled_back"]);
const TRUST_PROXY_COUNTERS = new Set(["negativeFeedbackCount", "sectionDisablementCount", "reportReopenCount"]);

const serviceWorkerStartMs = Date.now();

chrome.runtime.onInstalled.addListener(() => {
  Promise.all([ensureDb(), ensureProposalLog(), ensureGovernanceConfig(), ensureTrustProxies()])
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
