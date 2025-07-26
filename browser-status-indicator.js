// Browser Status Indicator - Native browser integration
class BrowserStatusIndicator {
  constructor() {
    this.currentPageData = null;
    this.statusElement = null;
    this.init();
  }

  async init() {
    // Check if status indicators are enabled
    const enabled = await this.checkIfEnabled();
    if (!enabled) return;
    
    // Get page data from background script
    this.getPageData();
    // Get weekly summary from background script
    this.getWeeklySummary();
    
    // Create and inject the status indicator
    this.createStatusIndicator();
    
    // Listen for page changes
    this.setupPageChangeListener();
  }

  async checkIfEnabled() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getUserData'
      });
      
      return response?.userData?.settings?.tabIndicators !== false;
    } catch (error) {
      console.error('Error checking status indicators setting:', error);
      return true; // Default to enabled
    }
  }

  async getPageData() {
    try {
      // Extract basic page info
      const pageInfo = {
        domain: window.location.hostname,
        path: window.location.pathname,
        title: document.title,
        url: window.location.href
      };

      // Send to background script for analysis
      const response = await chrome.runtime.sendMessage({
        action: 'analyzePageForTab',
        pageInfo: pageInfo
      });

      if (response && response.pageData) {
        this.currentPageData = response.pageData;
        this.updateStatusIndicator();
      }
    } catch (error) {
      console.error('Error getting page data for status indicator:', error);
    }
  }

  async getWeeklySummary() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getWeekData' });
      if (response && response.weekData) {
        this.weeklyData = response.weekData;
        this.updateStatusIndicator();
      }
    } catch (error) {
      console.error('Error getting weekly summary:', error);
    }
  }

  createStatusIndicator() {
    // Create status indicator element
    this.statusElement = document.createElement('div');
    this.statusElement.id = 'mindset-status-indicator';
    this.statusElement.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      min-height: 38px;
      background: linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255,255,255,0.1);
    `;

    // Add rows for short-term and long-term feedback
    this.shortTermRow = document.createElement('div');
    this.shortTermRow.style.cssText = 'display: flex; align-items: center; gap: 12px; margin: 2px 0;';
    this.longTermRow = document.createElement('div');
    this.longTermRow.style.cssText = 'display: flex; align-items: center; gap: 12px; margin: 2px 0; opacity: 0.85; font-size: 10px;';

    this.statusElement.appendChild(this.shortTermRow);
    this.statusElement.appendChild(this.longTermRow);
    document.body.appendChild(this.statusElement);
    
    // Show indicator after a short delay
    setTimeout(() => {
      if (this.statusElement) {
        this.statusElement.style.opacity = '1';
      }
    }, 1000);
    
    // Initial state
    this.updateStatusIndicator();
  }

  updateStatusIndicator() {
    // Short-term (current page)
    const data = this.currentPageData || this.getDefaultData();
    this.shortTermRow.innerHTML = this.getShortTermText(data);
    this.shortTermRow.title = this.getShortTermTooltip(data);

    // Long-term (weekly summary)
    const week = this.weeklyData;
    this.longTermRow.innerHTML = week ? this.getLongTermText(week) : '<span style="color:#bbb;">Loading weekly summary...</span>';
    this.longTermRow.title = week ? this.getLongTermTooltip(week) : '';
    
    // Visual indicators
    this.addVisualIndicators(data);
  }

  getShortTermText(data) {
    const { category, credibility, politicalBias, tone } = data;
    const biasText = politicalBias === 'liberal' ? '🔵 Liberal' : politicalBias === 'conservative' ? '🔴 Conservative' : politicalBias === 'centrist' ? '🟡 Centrist' : '⚪ Unknown';
    const toneText = tone === 'uplifting' ? '😊 Uplifting' : tone === 'cynical' ? '😔 Cynical' : '😐 Neutral';
    return `<span style="margin-right:8px;"><span style="color:#64B5F6;">📄</span> ${category.charAt(0).toUpperCase() + category.slice(1)}</span><span style="margin-right:8px;"><span style="color:${this.getCredibilityColor(credibility)};">🔍</span> ${credibility.toFixed(1)}/10</span><span style="margin-right:8px;"><span style="color:#9C27B0;">🏛️</span> ${biasText}</span><span><span style="color:#FFB74D;">💭</span> ${toneText}</span>`;
  }

  getShortTermTooltip(data) {
    return `This page: ${data.politicalBias} bias, ${data.tone} tone.`;
  }

  getLongTermText(week) {
    // Calculate bias/tone breakdowns
    const visits = week.visits || [];
    const biasCounts = { liberal: 0, conservative: 0, centrist: 0, unknown: 0 };
    const toneCounts = { cynical: 0, uplifting: 0, neutral: 0 };
    visits.forEach(v => { biasCounts[v.politicalBias] = (biasCounts[v.politicalBias]||0)+1; toneCounts[v.tone] = (toneCounts[v.tone]||0)+1; });
    const total = visits.length || 1;
    const biasPct = k => Math.round((biasCounts[k]||0)/total*100);
    const tonePct = k => Math.round((toneCounts[k]||0)/total*100);
    return `<span style="margin-right:8px;">This week: <span style="color:#2196F3;">🔵</span> ${biasPct('liberal')}% <span style="color:#FF9800;">🟡</span> ${biasPct('centrist')}% <span style="color:#F44336;">🔴</span> ${biasPct('conservative')}%</span><span style="margin-right:8px;"> <span style="color:#FFB74D;">😊</span> ${tonePct('uplifting')}% <span style="color:#aaa;">😐</span> ${tonePct('neutral')}% <span style="color:#607D8B;">😔</span> ${tonePct('cynical')}%</span>`;
  }

  getLongTermTooltip(week) {
    return `This week: ${week.visits.length} pages\nLiberal: ${week.visits.filter(v=>v.politicalBias==='liberal').length}\nConservative: ${week.visits.filter(v=>v.politicalBias==='conservative').length}\nCentrist: ${week.visits.filter(v=>v.politicalBias==='centrist').length}\nUplifting: ${week.visits.filter(v=>v.tone==='uplifting').length}\nCynical: ${week.visits.filter(v=>v.tone==='cynical').length}`;
  }

  getCredibilityColor(credibility) {
    if (credibility >= 8.0) return '#4CAF50'; // Green
    if (credibility >= 6.0) return '#FF9800'; // Orange
    return '#F44336'; // Red
  }

  addVisualIndicators(data) {
    // Add subtle visual indicators
    if (data.credibility < 6.0) {
      this.statusElement.style.borderTop = '2px solid #F44336';
    } else if (data.credibility >= 8.0) {
      this.statusElement.style.borderTop = '2px solid #4CAF50';
    } else {
      this.statusElement.style.borderTop = '2px solid #FF9800';
    }
  }

  getDefaultData() {
    return {
      category: 'unknown',
      credibility: 5.0,
      tone: 'neutral'
    };
  }

  setupPageChangeListener() {
    // Listen for navigation events
    let currentUrl = window.location.href;
    
    const checkForPageChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => {
          this.getPageData();
        }, 1000); // Wait for page to load
      }
    };

    // Check periodically for SPA navigation
    setInterval(checkForPageChange, 2000);
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.getPageData();
      }, 1000);
    });
  }

  // Public method to update indicator from external calls
  updateFromExternal(data) {
    this.currentPageData = data;
    this.updateStatusIndicator();
  }

  // Public method to show/hide indicator
  setVisibility(visible) {
    if (this.statusElement) {
      this.statusElement.style.opacity = visible ? '1' : '0';
    }
  }
}

// Initialize browser status indicator
const browserStatusIndicator = new BrowserStatusIndicator();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateTabIndicator') {
    browserStatusIndicator.updateFromExternal(request.pageData);
    sendResponse({ success: true });
  } else if (request.action === 'setTabIndicatorVisibility') {
    browserStatusIndicator.setVisibility(request.visible);
    sendResponse({ success: true });
  }
}); 