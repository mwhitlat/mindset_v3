const DB_NAME = "mindset-db";
const DB_VERSION = 1;
const VISITS_STORE = "visits";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const serviceWorkerStartMs = Date.now();

chrome.runtime.onInstalled.addListener(() => {
  ensureDb().catch((error) => {
    console.error("Mindset DB initialization failed:", error);
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
