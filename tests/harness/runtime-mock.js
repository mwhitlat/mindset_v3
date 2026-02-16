(function () {
  const state = window.__HARNESS_STATE__ || {};

  function postLog(message, payload) {
    try {
      window.parent.postMessage({
        type: 'harness-log',
        message,
        payload
      }, '*');
    } catch {}
  }

  function getWeekKey() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    return start.toISOString().split('T')[0];
  }

  function generateVisits(config = {}) {
    const count = Math.max(1, Number(config.visitsCount || 24));
    const domainsCount = Math.max(1, Number(config.domainsCount || 8));
    const categoryFocus = config.categoryFocus || 'balanced';
    const biasFocus = config.biasFocus || 'balanced';
    const toneFocus = config.toneFocus || 'neutral';
    const baseCred = Number(config.baseCredibility ?? 6.2);

    const domains = Array.from({ length: domainsCount }, (_, i) => `source${i + 1}.example.com`);
    const catsBalanced = ['news', 'news', 'social', 'entertainment', 'educational', 'professional'];
    const catsNewsHeavy = ['news', 'news', 'news', 'social', 'educational'];
    const catsSocialHeavy = ['social', 'social', 'news', 'entertainment', 'educational'];
    const categories = categoryFocus === 'news' ? catsNewsHeavy : categoryFocus === 'social' ? catsSocialHeavy : catsBalanced;

    const biasPool = biasFocus === 'left'
      ? ['liberal', 'liberal', 'liberal', 'centrist', 'conservative']
      : biasFocus === 'right'
        ? ['conservative', 'conservative', 'conservative', 'centrist', 'liberal']
        : ['liberal', 'centrist', 'conservative'];

    const tonePool = toneFocus === 'cynical'
      ? ['cynical', 'cynical', 'neutral']
      : toneFocus === 'uplifting'
        ? ['uplifting', 'uplifting', 'neutral']
        : ['neutral', 'neutral', 'uplifting', 'cynical'];

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekStart = now - (new Date().getDay() * dayMs);

    const visits = [];
    for (let i = 0; i < count; i++) {
      const domain = domains[i % domains.length];
      const category = categories[i % categories.length];
      const politicalBias = biasPool[i % biasPool.length];
      const tone = tonePool[i % tonePool.length];
      const credibilityJitter = ((i % 7) - 3) * 0.2;
      const credibility = Math.max(1, Math.min(10, baseCred + credibilityJitter));
      visits.push({
        domain,
        path: `/story/${i + 1}`,
        title: `Mock headline ${i + 1}`,
        category,
        credibility,
        politicalBias,
        tone,
        duration: 4 + (i % 9),
        timestamp: weekStart + ((i % 7) * dayMs) + ((i % 20) * 60000)
      });
    }
    return visits;
  }

  function scoreClass(score) {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'average';
    return 'poor';
  }

  function buildUserData() {
    const weekKey = getWeekKey();
    const visits = generateVisits(state.weekly || {});

    const categories = {};
    let totalTime = 0;
    const domainSet = new Set();
    for (const visit of visits) {
      categories[visit.category] = (categories[visit.category] || 0) + 1;
      totalTime += Number(visit.duration || 0);
      domainSet.add(visit.domain);
    }

    const scores = state.scores || {
      overallHealth: 6.9,
      contentBalance: 6.5,
      sourceDiversity: 7.2,
      timeManagement: 6.3,
      contentTone: 6.4,
      politicalBalance: 6.1
    };

    return {
      trackingStartDate: state.trackingStartDate || '2025-01-01T00:00:00.000Z',
      settings: {
        tabIndicators: true,
        interventionLevel: 'balanced',
        showCredibilityWarnings: true,
        showBiasWarnings: true,
        enableInterstitials: true,
        enableCredibilityBudget: true,
        credibilityGuidance: state.guidanceMode || 'standard',
        ...state.settings
      },
      scores,
      goals: state.goals || {
        daily: { enabled: true, minCenterSources: 1, minEducationalPercent: 10, maxNewsPercent: 60, minUniqueDomains: 3 },
        weekly: { enabled: true, minSourceDiversity: 10, targetEducationalPercent: 20, targetPoliticalBalance: 6 }
      },
      streaks: state.streaks || {
        daily: { current: 2, longest: 6 },
        weekly: { current: 1, longest: 3 }
      },
      weeklyData: {
        [weekKey]: {
          visits,
          domains: Array.from(domainSet),
          categories,
          totalTime,
          scores
        }
      }
    };
  }

  function buildCredibilityStatus() {
    const load = Number(state.credibilityLoad ?? 64);
    const mode = state.guidanceMode || 'standard';
    const thresholds = mode === 'strong'
      ? { elevated: 35, high: 62 }
      : mode === 'gentle'
        ? { elevated: 55, high: 82 }
        : mode === 'off'
          ? { elevated: 1000, high: 1000 }
          : { elevated: 45, high: 72 };

    let level = 'normal';
    if (mode !== 'off' && load >= thresholds.high) level = 'high';
    else if (mode !== 'off' && load >= thresholds.elevated) level = 'elevated';

    return {
      enabled: mode !== 'off',
      mode,
      threshold: 6.0,
      load,
      level,
      elevatedAt: thresholds.elevated,
      highAt: thresholds.high,
      recoveryProgress: Math.max(0, Math.min(100, Math.round(((thresholds.elevated - load) / thresholds.elevated) * 100))),
      showNudge: level !== 'normal',
      showInterstitial: level === 'high',
      cooldownRemainingMs: 0,
      alternatives: [
        { name: 'Reuters', domain: 'reuters.com', url: 'https://reuters.com', credibility: 9.5, bias: 'center' },
        { name: 'AP News', domain: 'apnews.com', url: 'https://apnews.com', credibility: 9.5, bias: 'center' },
        { name: 'BBC', domain: 'bbc.com', url: 'https://bbc.com', credibility: 8.8, bias: 'center' }
      ]
    };
  }

  function buildEchoAnalysis() {
    const visits = generateVisits(state.weekly || {});
    const counts = { left: 0, center: 0, right: 0, unknown: 0 };
    for (const visit of visits) {
      if (visit.politicalBias === 'liberal') counts.left++;
      else if (visit.politicalBias === 'conservative') counts.right++;
      else if (visit.politicalBias === 'centrist') counts.center++;
      else counts.unknown++;
    }
    const total = visits.length || 1;
    const percentages = {
      left: Math.round((counts.left / total) * 100),
      center: Math.round((counts.center / total) * 100),
      right: Math.round((counts.right / total) * 100),
      unknown: Math.round((counts.unknown / total) * 100)
    };
    const dominantBias = percentages.left > percentages.right ? 'left' : 'right';
    const isEchoChamber = Math.max(percentages.left, percentages.right) >= 70;
    return {
      total,
      breakdown: counts,
      percentages,
      dominantBias,
      isEchoChamber,
      echoChamberSeverity: isEchoChamber ? Math.max(percentages.left, percentages.right) - 50 : 0,
      balanceScore: Math.max(0, 10 - Math.abs(percentages.left - percentages.right) / 10)
    };
  }

  function buildGoalsProgress() {
    return {
      daily: {
        progress: {
          centerSourcesRead: 1,
          educationalPercent: 14,
          uniqueDomains: Number(state.weekly?.domainsCount || 8)
        },
        results: {
          centerSources: true,
          educational: true,
          diversity: Number(state.weekly?.domainsCount || 8) >= 3
        }
      },
      weekly: { met: false },
      goals: {
        daily: { enabled: true, minCenterSources: 1, minEducationalPercent: 10, minUniqueDomains: 3 },
        weekly: { enabled: true, minSourceDiversity: 10, targetEducationalPercent: 20, targetPoliticalBalance: 6 }
      },
      streaks: {
        daily: { current: 2, longest: 6 },
        weekly: { current: 1, longest: 3 }
      }
    };
  }

  const runtime = {
    lastError: null,
    getURL: (p) => p,
    onMessage: { addListener() {} },
    sendMessage(request, callback) {
      postLog('sendMessage', request);

      const action = request?.action;
      let response = {};
      const userData = buildUserData();

      if (action === 'getTrackingState') response = { isTracking: state.isTracking !== false };
      else if (action === 'toggleTracking') {
        state.isTracking = !(state.isTracking !== false);
        response = { isTracking: state.isTracking };
      }
      else if (action === 'getUserData') response = { userData };
      else if (action === 'getCurrentScores') response = { scores: userData.scores };
      else if (action === 'getGoalsProgress') response = buildGoalsProgress();
      else if (action === 'getWeekData') response = { weekData: userData.weeklyData[getWeekKey()] };
      else if (action === 'getEchoChamberAnalysis') response = { weekly: buildEchoAnalysis(), realtime: { isEchoChamber: false, consecutiveCount: 1 } };
      else if (action === 'getEchoChamberBreakerStatus') response = { enabled: true, inDebt: false, threshold: 5, consecutiveCount: 1, dominantBias: 'left', recentBiasHistory: [] };
      else if (action === 'analyzePageForTab') {
        const pageData = {
          domain: new URL(window.location.href).hostname,
          sourceName: 'Harness Source',
          category: state.pageCategory || 'news',
          credibility: Number(state.pageCredibility ?? 5.2),
          politicalBias: state.pageBias || 'left',
          tone: state.pageTone || 'neutral'
        };
        response = { pageData };
      }
      else if (action === 'getCredibilityBudgetStatus') {
        response = { ...buildCredibilityStatus(), currentPageCredibility: Number(state.pageCredibility ?? 5.2) };
      }
      else if (action === 'markCredibilityInterventionShown') response = { success: true };
      else if (action === 'getAlternativeSources') response = { alternatives: buildCredibilityStatus().alternatives };
      else if (action === 'getSameStoryUpgrade') {
        const eligible = state.sameStoryEligible !== false;
        response = eligible
          ? {
            eligible: true,
            sourceName: 'Harness Source',
            credibility: Number(state.pageCredibility ?? 5.2),
            threshold: 7.0,
            searchLinks: [
              { name: 'Reuters', domain: 'reuters.com', searchUrl: 'https://www.reuters.com/search/news?query=markets', icon: '📰', credibility: 9.5 },
              { name: 'Associated Press', domain: 'apnews.com', searchUrl: 'https://apnews.com/search?q=markets', icon: '📰', credibility: 9.5 },
              { name: 'BBC', domain: 'bbc.com', searchUrl: 'https://www.bbc.co.uk/search?q=markets', icon: '📺', credibility: 8.8 }
            ]
          }
          : { eligible: false, reason: 'disabled' };
      }
      else if (action === 'trackSameStoryUpgradeEvent') response = { success: true };
      else if (action === 'importBrowserHistory') response = { success: true, imported: 42 };
      else if (action === 'clearAllData') response = { success: true };
      else if (action === 'updateSettings') {
        state.settings = { ...(state.settings || {}), ...(request.settings || {}) };
        response = { success: true };
      }
      else if (action === 'updateGoals') response = { success: true };
      else if (action === 'enableEncryption' || action === 'disableEncryption') response = { success: true };
      else response = {};

      if (typeof callback === 'function') {
        setTimeout(() => callback(response), 0);
        return;
      }
      return Promise.resolve(response);
    }
  };

  window.chrome = {
    runtime,
    tabs: {
      create(details) {
        postLog('tabs.create', details);
      }
    },
    permissions: {
      async contains() { return true; },
      async request() { return true; }
    }
  };
})();
