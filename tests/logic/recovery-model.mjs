export function applyDecay(load, lastTs, nowTs, decayPerHour = 10) {
  if (!lastTs) return { load, ts: nowTs };
  const elapsedHours = Math.max(0, nowTs - lastTs) / (1000 * 60 * 60);
  const decayed = Math.max(0, load - (elapsedHours * decayPerHour));
  return { load: decayed, ts: nowTs };
}

export function applyVisit(load, credibility, threshold = 6.0) {
  if (credibility == null) return load;
  if (credibility < threshold) {
    const deficit = Math.max(0, threshold - credibility);
    const severityPoints = 8 + (deficit * 8) + (credibility < 3 ? 8 : 0);
    return Math.min(100, load + severityPoints);
  }
  if (credibility >= 8.0) return Math.max(0, load - 22);
  if (credibility >= 7.0) return Math.max(0, load - 8);
  return load;
}

export function levelFromLoad(load, guidanceMode = 'standard') {
  const configByGuidance = {
    off: { enabled: false, elevated: 1000, high: 1000 },
    gentle: { enabled: true, elevated: 55, high: 82 },
    standard: { enabled: true, elevated: 45, high: 72 },
    strong: { enabled: true, elevated: 35, high: 62 }
  };
  const config = configByGuidance[guidanceMode] || configByGuidance.standard;
  if (!config.enabled) return 'normal';
  if (load >= config.high) return 'high';
  if (load >= config.elevated) return 'elevated';
  return 'normal';
}
