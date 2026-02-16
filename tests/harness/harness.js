(function () {
  const logEl = document.getElementById('log');

  const defaultScenario = {
    pageData: {
      domain: 'news.example.com',
      sourceName: 'Example News',
      category: 'news',
      credibility: 4.8,
      politicalBias: 'left',
      tone: 'neutral'
    },
    credibilityStatus: {
      enabled: true,
      mode: 'standard',
      threshold: 6.0,
      load: 68,
      level: 'elevated',
      elevatedAt: 45,
      highAt: 72,
      showNudge: true,
      showInterstitial: false,
      cooldownRemainingMs: 0,
      alternatives: [
        { name: 'Reuters', domain: 'reuters.com', url: 'https://reuters.com', credibility: 9.5, bias: 'center' },
        { name: 'AP News', domain: 'apnews.com', url: 'https://apnews.com', credibility: 9.5, bias: 'center' }
      ]
    },
    sameStory: {
      eligible: true,
      sourceName: 'Example News',
      credibility: 4.8,
      threshold: 7.0,
      searchLinks: [
        { name: 'Reuters', domain: 'reuters.com', searchUrl: 'https://www.reuters.com/search/news?query=markets%20inflation', icon: '📰', credibility: 9.5 },
        { name: 'Associated Press', domain: 'apnews.com', searchUrl: 'https://apnews.com/search?q=markets%20inflation', icon: '📰', credibility: 9.5 }
      ]
    },
    weekData: {
      visits: [
        { politicalBias: 'left', tone: 'neutral' },
        { politicalBias: 'center', tone: 'uplifting' },
        { politicalBias: 'right', tone: 'neutral' }
      ]
    },
    userData: {
      settings: {
        tabIndicators: true,
        interventionLevel: 'balanced',
        showCredibilityWarnings: true,
        showBiasWarnings: true,
        enableInterstitials: true
      }
    },
    echoStatus: {
      enabled: true,
      inDebt: false,
      threshold: 5,
      consecutiveCount: 1,
      dominantBias: 'left',
      recentBiasHistory: [{ bias: 'left' }],
      currentPageBias: 'left'
    }
  };

  const scenario = structuredClone(defaultScenario);

  function log(message, payload) {
    const line = `[${new Date().toISOString()}] ${message}`;
    logEl.textContent += payload ? `${line} ${JSON.stringify(payload)}\n` : `${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function computeCredibilityLevel(load, mode) {
    const map = {
      off: { elevated: 1000, high: 1000, enabled: false },
      gentle: { elevated: 55, high: 82, enabled: true },
      standard: { elevated: 45, high: 72, enabled: true },
      strong: { elevated: 35, high: 62, enabled: true }
    };
    const cfg = map[mode] || map.standard;
    if (!cfg.enabled) return 'normal';
    if (load >= cfg.high) return 'high';
    if (load >= cfg.elevated) return 'elevated';
    return 'normal';
  }

  window.chrome = {
    runtime: {
      onMessage: {
        addListener() {}
      },
      async sendMessage(request) {
        log('sendMessage', request);

        switch (request.action) {
          case 'getUserData':
            return { userData: scenario.userData };
          case 'analyzePageForTab':
            return { pageData: scenario.pageData };
          case 'getWeekData':
            return { weekData: scenario.weekData };
          case 'getAlternativeSources':
            return { alternatives: scenario.credibilityStatus.alternatives || [] };
          case 'getEchoChamberBreakerStatus':
            return scenario.echoStatus;
          case 'getCredibilityBudgetStatus':
            return {
              ...scenario.credibilityStatus,
              currentPageCredibility: scenario.pageData.credibility
            };
          case 'getSameStoryUpgrade':
            return scenario.sameStory;
          case 'markCredibilityInterventionShown':
          case 'trackSameStoryUpgradeEvent':
            return { success: true };
          default:
            return {};
        }
      }
    }
  };

  function applyFromControls() {
    const pageUrl = document.getElementById('pageUrl').value.trim();
    const pageTitle = document.getElementById('pageTitle').value.trim();
    const credibility = Number(document.getElementById('credibility').value);
    const category = document.getElementById('category').value;
    const load = Number(document.getElementById('credibilityLoad').value);
    const mode = document.getElementById('guidanceMode').value;
    const sameStoryEligible = document.getElementById('sameStoryEligible').value === 'true';

    const parsedUrl = new URL(pageUrl);
    history.replaceState({}, '', pageUrl);
    document.title = pageTitle;
    document.getElementById('mockHeadline').textContent = pageTitle;

    scenario.pageData.domain = parsedUrl.hostname;
    scenario.pageData.sourceName = parsedUrl.hostname;
    scenario.pageData.credibility = credibility;
    scenario.pageData.category = category;

    scenario.credibilityStatus.mode = mode;
    scenario.credibilityStatus.load = load;
    scenario.credibilityStatus.level = computeCredibilityLevel(load, mode);
    scenario.credibilityStatus.enabled = mode !== 'off';
    scenario.credibilityStatus.showNudge = scenario.credibilityStatus.level !== 'normal';
    scenario.credibilityStatus.showInterstitial = scenario.credibilityStatus.level === 'high';

    scenario.sameStory.eligible = sameStoryEligible;
    scenario.sameStory.credibility = credibility;
    scenario.sameStory.sourceName = parsedUrl.hostname;
    scenario.sameStory.searchLinks = sameStoryEligible ? defaultScenario.sameStory.searchLinks : [];

    scenario.userData.settings.credibilityGuidance = mode;
    scenario.userData.settings.enableCredibilityBudget = mode !== 'off';

    if (window.browserStatusIndicator) {
      window.browserStatusIndicator.getPageData();
      window.browserStatusIndicator.getWeeklySummary();
    }
    log('scenario-applied', {
      domain: scenario.pageData.domain,
      credibility,
      load,
      level: scenario.credibilityStatus.level,
      mode,
      sameStoryEligible
    });
  }

  function resetScenario() {
    Object.assign(scenario, structuredClone(defaultScenario));
    document.getElementById('pageUrl').value = 'https://news.example.com/story/123';
    document.getElementById('pageTitle').value = 'Markets rally after inflation data cools';
    document.getElementById('credibility').value = '4.8';
    document.getElementById('category').value = 'news';
    document.getElementById('credibilityLoad').value = '68';
    document.getElementById('guidanceMode').value = 'standard';
    document.getElementById('sameStoryEligible').value = 'true';
    applyFromControls();
  }

  document.getElementById('applyScenario').addEventListener('click', applyFromControls);
  document.getElementById('resetScenario').addEventListener('click', resetScenario);

  log('harness-ready');
})();
