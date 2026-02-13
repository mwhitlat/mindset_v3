// Popup script for Mindset extension
class PopupManager {
  constructor() {
    this.init();
  }

  init() {
    this.loadData();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Tracking toggle
    const trackingToggle = document.getElementById('trackingToggle');
    trackingToggle.addEventListener('change', (e) => {
      this.toggleTracking(e.target.checked);
    });

    // View report button
    const viewReportBtn = document.getElementById('viewReportBtn');
    viewReportBtn.addEventListener('click', () => {
      this.openDashboard();
    });

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    settingsBtn.addEventListener('click', () => {
      this.openSettings();
    });
  }

  async loadData() {
    try {
      // Get tracking state
      const trackingResponse = await this.sendMessage({ action: 'getTrackingState' });
      document.getElementById('trackingToggle').checked = trackingResponse.isTracking;

      // Get user data
      const userDataResponse = await this.sendMessage({ action: 'getUserData' });
      const userData = userDataResponse.userData;

      if (userData) {
        this.updateUI(userData);
      } else {
        this.showEmptyState();
      }

      // Load goals progress
      await this.loadGoalsProgress();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showErrorState();
    }
  }

  updateUI(userData) {
    this.updateQuickStats(userData);
    this.updateScores(userData.scores);
    this.updateInsights(userData);
  }

  updateQuickStats(userData) {
    const weekKey = this.getWeekKey();
    const weekData = userData.weeklyData[weekKey];

    if (weekData) {
      // Weekly visits
      document.getElementById('weeklyVisits').textContent = weekData.visits.length;

      // Unique domains
      document.getElementById('uniqueDomains').textContent = weekData.domains.size;

      // Total hours
      const totalHours = Math.round((weekData.totalTime / 60) * 10) / 10;
      document.getElementById('totalHours').textContent = totalHours;
    } else {
      // No data for current week
      document.getElementById('weeklyVisits').textContent = '0';
      document.getElementById('uniqueDomains').textContent = '0';
      document.getElementById('totalHours').textContent = '0';
    }
  }

  updateScores(scores) {
    if (!scores) return;

    // Update score displays
    this.updateScoreDisplay('overallHealth', scores.overallHealth);
    this.updateScoreDisplay('contentBalance', scores.contentBalance);
    this.updateScoreDisplay('sourceDiversity', scores.sourceDiversity);
    this.updateScoreDisplay('contentTone', scores.contentTone);
    this.updateScoreDisplay('politicalBalance', scores.politicalBalance);

    // Update stars for overall health
    this.updateStars('overallHealthStars', scores.overallHealth);
  }

  updateScoreDisplay(elementId, score) {
    const element = document.getElementById(elementId);
    if (element && score !== undefined) {
      element.textContent = score.toFixed(1);
      
      // Add color class based on score
      element.className = 'score-value';
      if (score >= 8) {
        element.classList.add('excellent');
      } else if (score >= 6) {
        element.classList.add('good');
      } else if (score >= 4) {
        element.classList.add('average');
      } else {
        element.classList.add('poor');
      }
    }
  }

  updateStars(elementId, score) {
    const element = document.getElementById(elementId);
    if (element && score !== undefined) {
      const fullStars = Math.floor(score);
      const hasHalfStar = score % 1 >= 0.5;
      
      let stars = '';
      for (let i = 0; i < fullStars; i++) {
        stars += '⭐';
      }
      if (hasHalfStar) {
        stars += '⭐';
      }
      
      element.textContent = stars;
    }
  }

  updateInsights(userData) {
    const insightsList = document.getElementById('insightsList');
    const weekKey = this.getWeekKey();
    const weekData = userData.weeklyData[weekKey];

    if (!weekData || weekData.visits.length === 0) {
      insightsList.innerHTML = `
        <div class="insight-item suggestion">
          <div class="insight-text">Start browsing to see your digital diet insights!</div>
        </div>
      `;
      return;
    }

    const insights = this.generateInsights(weekData, userData.scores);
    
    insightsList.innerHTML = insights.map(insight => `
      <div class="insight-item ${insight.type}">
        <div class="insight-text">${insight.message}</div>
      </div>
    `).join('');
  }

  generateInsights(weekData, scores) {
    const insights = [];

    // Source diversity insight
    if (weekData.domains.size >= 10) {
      insights.push({
        type: 'positive',
        message: `Great source diversity! You visited ${weekData.domains.size} different websites.`
      });
    } else if (weekData.domains.size >= 5) {
      insights.push({
        type: 'suggestion',
        message: `Good start! Try visiting more diverse sources. You visited ${weekData.domains.size} websites.`
      });
    } else {
      insights.push({
        type: 'warning',
        message: `Consider visiting more diverse sources. You visited ${weekData.domains.size} websites.`
      });
    }

    // Content balance insight
    const categories = weekData.categories;
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (categories.news && categories.news / total > 0.5) {
      insights.push({
        type: 'warning',
        message: 'You\'re consuming a lot of news content. Consider adding more entertainment or educational content.'
      });
    }

    if (categories.social && categories.social / total > 0.4) {
      insights.push({
        type: 'warning',
        message: 'High social media usage detected. Consider setting time limits.'
      });
    }

    if (categories.educational && categories.educational / total < 0.1) {
      insights.push({
        type: 'suggestion',
        message: 'Try adding more educational content to your digital diet.'
      });
    }

    // Tone insight
    if (scores.contentTone < 5) {
      insights.push({
        type: 'warning',
        message: 'Your content is mostly cynical. Try adding more uplifting, solution-focused content.'
      });
    } else if (scores.contentTone > 7) {
      insights.push({
        type: 'positive',
        message: 'Great balance of uplifting content! Keep it up.'
      });
    }

    // Political balance insight
    if (scores.politicalBalance < 5) {
      insights.push({
        type: 'warning',
        message: 'You might be in an echo chamber. Try reading from diverse political viewpoints.'
      });
    } else if (scores.politicalBalance > 7) {
      insights.push({
        type: 'positive',
        message: 'Excellent political diversity! You\'re getting balanced viewpoints.'
      });
    }

    // Time management insight
    const totalHours = weekData.totalTime / 60;
    const avgDailyHours = totalHours / 7;
    
    if (avgDailyHours > 5) {
      insights.push({
        type: 'warning',
        message: `You're spending ${avgDailyHours.toFixed(1)} hours daily online. Consider setting limits.`
      });
    } else if (avgDailyHours < 1) {
      insights.push({
        type: 'suggestion',
        message: 'You\'re spending very little time online. Consider exploring more content.'
      });
    }

    // Limit to 3 insights to avoid overwhelming
    return insights.slice(0, 3);
  }

  async toggleTracking(isTracking) {
    try {
      const response = await this.sendMessage({ 
        action: 'toggleTracking' 
      });
      
      if (response.isTracking !== isTracking) {
        // Revert the toggle if the action failed
        document.getElementById('trackingToggle').checked = response.isTracking;
      }
    } catch (error) {
      console.error('Error toggling tracking:', error);
      // Revert the toggle on error
      document.getElementById('trackingToggle').checked = !isTracking;
    }
  }

  openDashboard() {
    // Open the full dashboard in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html')
    });
  }

  openSettings() {
    // Open settings in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
    });
  }

  showEmptyState() {
    // Show empty state when no data is available
    document.getElementById('insightsList').innerHTML = `
      <div class="insight-item suggestion">
        <div class="insight-text">Welcome to Mindset! Start browsing to see your digital diet insights.</div>
      </div>
    `;
  }

  showErrorState() {
    // Show error state when data loading fails
    document.getElementById('insightsList').innerHTML = `
      <div class="insight-item warning">
        <div class="insight-text">Unable to load data. Please try refreshing the extension.</div>
      </div>
    `;
  }

  async loadGoalsProgress() {
    try {
      const response = await this.sendMessage({ action: 'getGoalsProgress' });
      this.updateGoalsUI(response);
    } catch (error) {
      console.error('Error loading goals progress:', error);
    }
  }

  updateGoalsUI(data) {
    const { daily, streaks, goals } = data;

    // Hide goals section if disabled
    const goalsSection = document.querySelector('.goals-section');
    if (!goals?.daily?.enabled) {
      if (goalsSection) goalsSection.style.display = 'none';
      return;
    }
    if (goalsSection) goalsSection.style.display = 'block';

    // Update streak badge
    const streakBadge = document.getElementById('dailyStreak');
    if (streakBadge) {
      const currentStreak = streaks?.daily?.current || 0;
      streakBadge.textContent = `🔥 ${currentStreak}`;
      if (currentStreak >= 7) {
        streakBadge.classList.add('hot-streak');
      } else {
        streakBadge.classList.remove('hot-streak');
      }
    }

    // Update each goal progress bar
    this.updateGoalItem('centerSources',
      daily.progress?.centerSourcesRead || 0,
      goals.daily?.minCenterSources || 1,
      daily.results?.centerSources || false
    );

    this.updateGoalItem('educational',
      daily.progress?.educationalPercent || 0,
      goals.daily?.minEducationalPercent || 10,
      daily.results?.educational || false,
      '%'
    );

    this.updateGoalItem('diversity',
      daily.progress?.uniqueDomains || 0,
      goals.daily?.minUniqueDomains || 3,
      daily.results?.diversity || false
    );
  }

  updateGoalItem(id, current, target, isMet, suffix = '') {
    const item = document.getElementById(`goal-${id}`);
    if (!item) return;

    const value = item.querySelector('.goal-value');
    const fill = item.querySelector('.goal-fill');

    if (value) {
      value.textContent = suffix ? `${current}${suffix}` : `${current}/${target}`;
    }

    if (fill) {
      const percent = Math.min((current / target) * 100, 100);
      fill.style.width = `${percent}%`;

      if (isMet) {
        item.classList.add('goal-met');
        fill.style.background = '#4CAF50';
      } else {
        item.classList.remove('goal-met');
        fill.style.background = '#667EEA';
      }
    }
  }

  getWeekKey() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return startOfWeek.toISOString().split('T')[0];
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize the popup manager when the popup loads
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 