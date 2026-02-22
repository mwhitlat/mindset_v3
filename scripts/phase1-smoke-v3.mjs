import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";

const installHint = [
  "Playwright is optional and not installed.",
  "To enable Phase 1 smoke tests:",
  "1) npm i -D playwright",
  "2) npx playwright install chromium",
  "3) node scripts/phase1-smoke-v3.mjs"
].join("\n");

let playwright;
try {
  playwright = await import("playwright");
} catch {
  console.log(installHint);
  process.exit(0);
}

const extensionPath = path.resolve(process.cwd(), "mindset-v3");
const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runCheck(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const context = await playwright.chromium.launchPersistentContext("", {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
});

try {
  const setupPage = await context.newPage();
  await setupPage.goto("https://example.com", { waitUntil: "domcontentloaded" });
  await delay(1500);

  const extensionId = await detectExtensionId(context, setupPage);
  assert(extensionId, "Could not detect extension id.");

  await runCheck("Captures visit metadata and generates report", async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });

    await popupPage.click("#generateReportButton");
    await popupPage.waitForTimeout(2000);

    const totalVisits = await popupPage.evaluate(async () => {
      const data = await chrome.storage.local.get(["latestWeeklyReport"]);
      return data.latestWeeklyReport?.summary?.totalVisits ?? 0;
    });
    assert(totalVisits > 0, "Report summary has zero visits.");
  });

  await runCheck("Generates neutral weekly report", async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });
    await popupPage.waitForTimeout(300);

    const reflection = await popupPage.$eval("#reflectionText", (el) => (el.textContent || "").toLowerCase());
    assert(reflection.includes("distribution overview"), "Missing expected reflection section heading.");
    assert(!reflection.includes("you should"), "Reflection includes advisory language.");
    assert(!reflection.includes("to improve"), "Reflection includes prescriptive language.");
  });

  await runCheck("Appends and reads governance proposal log", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });

    const entry = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "append-governance-proposal",
            payload: {
              proposedChangeSummary: "Smoke test proposal append check",
              triggeringChecks: ["smoke-check"]
            }
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "append-governance-proposal failed"));
              return;
            }
            resolve(response.entry);
          }
        );
      });
    });

    assert(entry && typeof entry.id === "string", "Proposal entry id missing.");

    const entries = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "get-governance-proposals" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.ok) {
            reject(new Error(response?.error || "get-governance-proposals failed"));
            return;
          }
          resolve(response.entries);
        });
      });
    });

    assert(Array.isArray(entries), "Proposal log response is not an array.");
    assert(entries.some((item) => item.id === entry.id), "Appended proposal was not found in proposal log.");
  });

  await runCheck("Enforces manual review toggle behavior", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });

    const config = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "set-governance-review-required", payload: { reviewRequired: true } },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "set-governance-review-required failed"));
              return;
            }
            resolve(response.config);
          }
        );
      });
    });

    assert(config && config.review_required === true, "review_required did not persist as true.");

    const disallowedResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: "append-governance-proposal",
            payload: {
              proposedChangeSummary: "Should fail when review is required",
              triggeringChecks: ["smoke-check"],
              status: "approved"
            }
          },
          (response) => resolve(response)
        );
      });
    });

    assert(disallowedResult && disallowedResult.ok === false, "Non-pending proposal was incorrectly accepted.");

    const pendingEntry = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "append-governance-proposal",
            payload: {
              proposedChangeSummary: "Pending proposal for apply test",
              triggeringChecks: ["smoke-check"]
            }
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "pending append failed"));
              return;
            }
            resolve(response.entry);
          }
        );
      });
    });

    const appliedEntry = await page.evaluate(async (proposalId) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "apply-governance-proposal-status",
            payload: {
              proposalId,
              status: "approved"
            }
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "apply-governance-proposal-status failed"));
              return;
            }
            resolve(response.entry);
          }
        );
      });
    }, pendingEntry.id);

    assert(appliedEntry.status === "approved", "Pending proposal was not transitioned to approved.");
  });

  await runCheck("Rolls back to last approved snapshot and logs event", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });

    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "set-governance-review-required", payload: { reviewRequired: false } },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "failed to set review_required=false"));
              return;
            }
            resolve(response.config);
          }
        );
      });
    });

    const pendingEntry = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "append-governance-proposal",
            payload: {
              proposedChangeSummary: "Create approved snapshot for rollback test",
              triggeringChecks: ["smoke-check"]
            }
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "failed to append pending proposal"));
              return;
            }
            resolve(response.entry);
          }
        );
      });
    });

    await page.evaluate(async (proposalId) => {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "apply-governance-proposal-status",
            payload: { proposalId, status: "approved" }
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "failed to approve proposal"));
              return;
            }
            resolve(response.entry);
          }
        );
      });
    }, pendingEntry.id);

    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "set-governance-review-required", payload: { reviewRequired: true } },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "failed to set review_required=true"));
              return;
            }
            resolve(response.config);
          }
        );
      });
    });

    const rollbackResult = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "rollback-governance-snapshot" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.ok) {
            reject(new Error(response?.error || "rollback-governance-snapshot failed"));
            return;
          }
          resolve(response);
        });
      });
    });

    assert(
      rollbackResult.snapshot?.governanceConfig?.review_required === false,
      "Rollback snapshot did not restore expected governance config."
    );
    assert(
      rollbackResult.rollbackEntry?.status === "rolled_back",
      "Rollback event was not logged with rolled_back status."
    );
  });

  await runCheck("Tracks trust proxies counters and uninstall flag", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });

    const before = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "get-trust-proxies" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.ok) {
            reject(new Error(response?.error || "get-trust-proxies failed"));
            return;
          }
          resolve(response.metrics);
        });
      });
    });

    const incremented = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "increment-trust-proxy", payload: { counter: "negativeFeedbackCount" } },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "increment-trust-proxy failed"));
              return;
            }
            resolve(response.metrics);
          }
        );
      });
    });

    assert(
      incremented.negativeFeedbackCount === before.negativeFeedbackCount + 1,
      "negativeFeedbackCount did not increment."
    );

    const flagged = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "set-uninstall-proxy-flag", payload: { value: true } },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response || !response.ok) {
              reject(new Error(response?.error || "set-uninstall-proxy-flag failed"));
              return;
            }
            resolve(response.metrics);
          }
        );
      });
    });

    assert(flagged.uninstallProxyFlag === true, "Uninstall proxy flag did not set to true.");
  });
} finally {
  await context.close();
}

for (const result of results) {
  if (result.ok) {
    console.log(`PASS: ${result.name}`);
  } else {
    console.log(`FAIL: ${result.name} :: ${result.error}`);
  }
}

const failures = results.filter((item) => !item.ok).length;
if (failures > 0) {
  console.error(`\nPhase 1 smoke failed (${failures}/${results.length} checks failed).`);
  process.exit(1);
}

console.log(`\nPhase 1 smoke passed (${results.length} checks).`);

async function detectExtensionId(context, page) {
  const session = await context.newCDPSession(page);
  const maxAttempts = 15;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { targetInfos } = await session.send("Target.getTargets");
    for (const target of targetInfos) {
      const url = String(target.url || "");
      if (!url.startsWith("chrome-extension://")) continue;
      const host = new URL(url).host;
      if (host) return host;
    }
    await delay(500);
  }

  return "";
}
