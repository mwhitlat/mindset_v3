// Dashboard script for Mindset extension
class DashboardManager {
  constructor() {
    this.userData = null;
    this.currentWeekData = null;
    this.init();
  }

  init() {
    this.loadData();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Export button
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportReport();
    });

    // Share button
    document.getElementById('shareBtn').addEventListener('click', () => {
      this.shareReport();
    });

    // Download image button
    document.getElementById('downloadImageBtn').addEventListener('click', () => {
      this.downloadAsImage();
    });

    // Copy link button
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
      this.copyLink();
    });

    // Footer links
    document.getElementById('settingsLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });

    document.getElementById('exportDataLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.exportData();
    });

    document.getElementById('deleteDataLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.deleteData();
    });
  }

  async loadData() {
    try {
      // Get user data from background script
      const response = await this.sendMessage({ action: 'getUserData' });
      this.userData = response.userData;

      if (this.userData) {
        this.currentWeekData = this.getCurrentWeekData();
        this.updateDashboard();
      } else {
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showErrorState();
    }
  }

  getCurrentWeekData() {
    const weekKey = this.getWeekKey();
    return this.userData.weeklyData[weekKey];
  }

  getWeekKey() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return startOfWeek.toISOString().split('T')[0];
  }

  updateDashboard() {
    this.updateReportHeader();
    this.updateScores();
    this.updateContentBreakdown();
    this.updateTimeAnalysis();
    this.updateSourceAnalysis();
    this.updateTonePoliticalAnalysis();
    this.updateInsightsRecommendations();
    this.updateShareableReport();
  }

  updateReportHeader() {
    // Update report date
    const weekKey = this.getWeekKey();
    const startDate = new Date(weekKey);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    document.getElementById('reportDate').textContent = 
      `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Update tracking start date
    const trackingStart = new Date(this.userData.trackingStartDate);
    document.getElementById('trackingStartDate').textContent = 
      trackingStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Update data points
    const totalVisits = this.currentWeekData ? this.currentWeekData.visits.length : 0;
    document.getElementById('totalDataPoints').textContent = totalVisits;
  }

  updateScores() {
    const scores = this.userData.scores;
    if (!scores) return;

    // Update all score displays
    this.updateScoreDisplay('overallHealthScore', scores.overallHealth);
    this.updateScoreDisplay('contentBalanceScore', scores.contentBalance);
    this.updateScoreDisplay('sourceDiversityScore', scores.sourceDiversity);
    this.updateScoreDisplay('timeManagementScore', scores.timeManagement);
    this.updateScoreDisplay('contentToneScore', scores.contentTone);
    this.updateScoreDisplay('politicalBalanceScore', scores.politicalBalance);

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

  updateContentBreakdown() {
    if (!this.currentWeekData) return;

    const categories = this.currentWeekData.categories;
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return;

    // Generate chart bars
    const chartContainer = document.getElementById('contentChart');
    const categoryOrder = ['news', 'social', 'entertainment', 'educational', 'professional'];
    
    chartContainer.innerHTML = categoryOrder.map(category => {
      const count = categories[category] || 0;
      const percentage = (count / total) * 100;
      const height = Math.max(percentage, 5); // Minimum 5% height for visibility
      
      return `
        <div class="chart-bar ${category}" style="height: ${height}%">
          <div class="chart-label">${Math.round(percentage)}%</div>
        </div>
      `;
    }).join('');

    // Update stats
    const topCategory = Object.entries(categories).reduce((a, b) => categories[a[0]] > categories[b[0]] ? a : b)[0];
    document.getElementById('topCategory').textContent = this.formatCategoryName(topCategory);

    // Calculate balance score
    const ideal = { news: 0.3, social: 0.25, entertainment: 0.25, educational: 0.15, professional: 0.05 };
    let balance = 0;
    Object.keys(ideal).forEach(cat => {
      const actual = (categories[cat] || 0) / total;
      balance += Math.min(actual / ideal[cat], ideal[cat] / actual);
    });
    balance = (balance / Object.keys(ideal).length) * 10;
    
    document.getElementById('categoryBalance').textContent = `${balance.toFixed(1)}/10`;

    // Generate recommendation
    const recommendations = [];
    if ((categories.news || 0) / total > 0.5) {
      recommendations.push('Reduce news consumption');
    }
    if ((categories.social || 0) / total > 0.4) {
      recommendations.push('Limit social media time');
    }
    if ((categories.educational || 0) / total < 0.1) {
      recommendations.push('Add educational content');
    }
    
    document.getElementById('categoryRecommendation').textContent = 
      recommendations.length > 0 ? recommendations[0] : 'Good balance!';
  }

  formatCategoryName(category) {
    const names = {
      news: 'News & Info',
      social: 'Social Media',
      entertainment: 'Entertainment',
      educational: 'Educational',
      professional: 'Professional'
    };
    return names[category] || category;
  }

  updateTimeAnalysis() {
    if (!this.currentWeekData) return;

    const totalMinutes = this.currentWeekData.totalTime;
    const totalHours = totalMinutes / 60;
    const dailyAverage = totalHours / 7;

    // Update time stats
    document.getElementById('totalTime').textContent = `${totalHours.toFixed(1)} hours`;
    document.getElementById('dailyAverage').textContent = `${dailyAverage.toFixed(1)} hours`;

    // Find longest session
    const longestSession = this.currentWeekData.visits.reduce((max, visit) => 
      Math.max(max, visit.duration || 0), 0);
    document.getElementById('longestSession').textContent = `${longestSession} minutes`;

    // Generate daily chart
    this.generateDailyChart();
  }

  generateDailyChart() {
    const dailyData = this.getDailyUsageData();
    const chartContainer = document.getElementById('dailyChart');
    
    chartContainer.innerHTML = dailyData.map((data, index) => {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const height = Math.max((data.hours / 3) * 100, 5); // Scale to 3 hours max
      
      return `
        <div class="daily-bar" style="height: ${height}%">
          <div class="daily-label">${dayNames[index]}</div>
        </div>
      `;
    }).join('');
  }

  getDailyUsageData() {
    // This would be calculated from actual visit data
    // For now, return sample data
    return [
      { day: 0, hours: 1.2 },
      { day: 1, hours: 2.1 },
      { day: 2, hours: 1.8 },
      { day: 3, hours: 2.5 },
      { day: 4, hours: 1.9 },
      { day: 5, hours: 3.2 },
      { day: 6, hours: 2.8 }
    ];
  }

  updateSourceAnalysis() {
    if (!this.currentWeekData) return;

    const visits = this.currentWeekData.visits;
    const uniqueDomains = this.currentWeekData.domains.size;

    // Update source stats
    document.getElementById('uniqueDomains').textContent = uniqueDomains;

    // Calculate average credibility
    const totalCredibility = visits.reduce((sum, visit) => sum + (visit.credibility || 6), 0);
    const avgCredibility = totalCredibility / visits.length;
    document.getElementById('avgCredibility').textContent = `${avgCredibility.toFixed(1)}/10`;

    // Assess echo chamber risk
    const domainCount = uniqueDomains;
    let echoRisk = 'Low';
    if (domainCount < 5) echoRisk = 'High';
    else if (domainCount < 10) echoRisk = 'Medium';
    document.getElementById('echoChamberRisk').textContent = echoRisk;

    // Generate top sources list
    this.generateTopSourcesList(visits);
  }

  generateTopSourcesList(visits) {
    const sourceCounts = {};
    visits.forEach(visit => {
      sourceCounts[visit.domain] = (sourceCounts[visit.domain] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const container = document.getElementById('topSources');
    container.innerHTML = topSources.map(([domain, count]) => {
      const visit = visits.find(v => v.domain === domain);
      const credibility = visit ? visit.credibility : 6;
      
      return `
        <div class="source-item">
          <span class="source-name">${domain}</span>
          <span class="source-credibility">${credibility.toFixed(1)}/10 (${count} visits)</span>
        </div>
      `;
    }).join('');
  }

  updateTonePoliticalAnalysis() {
    if (!this.currentWeekData) return;

    const visits = this.currentWeekData.visits;
    
    // Calculate tone breakdown
    const toneCounts = { cynical: 0, uplifting: 0, neutral: 0 };
    visits.forEach(visit => {
      toneCounts[visit.tone] = (toneCounts[visit.tone] || 0) + 1;
    });

    const total = visits.length;
    if (total > 0) {
      this.updateToneBars(toneCounts, total);
    }

    // Calculate political breakdown
    const biasCounts = { liberal: 0, conservative: 0, centrist: 0, unknown: 0 };
    visits.forEach(visit => {
      biasCounts[visit.politicalBias] = (biasCounts[visit.politicalBias] || 0) + 1;
    });

    if (total > 0) {
      this.updatePoliticalBars(biasCounts, total);
    }
  }

  updateToneBars(toneCounts, total) {
    const cynicalPercent = (toneCounts.cynical / total) * 100;
    const upliftingPercent = (toneCounts.uplifting / total) * 100;
    const neutralPercent = (toneCounts.neutral / total) * 100;

    document.getElementById('cynicalBar').style.width = `${cynicalPercent}%`;
    document.getElementById('upliftingBar').style.width = `${upliftingPercent}%`;
    document.getElementById('neutralBar').style.width = `${neutralPercent}%`;

    document.getElementById('cynicalPercentage').textContent = `${Math.round(cynicalPercent)}%`;
    document.getElementById('upliftingPercentage').textContent = `${Math.round(upliftingPercent)}%`;
    document.getElementById('neutralPercentage').textContent = `${Math.round(neutralPercent)}%`;
  }

  updatePoliticalBars(biasCounts, total) {
    const liberalPercent = (biasCounts.liberal / total) * 100;
    const conservativePercent = (biasCounts.conservative / total) * 100;
    const centristPercent = (biasCounts.centrist / total) * 100;

    document.getElementById('liberalBar').style.width = `${liberalPercent}%`;
    document.getElementById('conservativeBar').style.width = `${conservativePercent}%`;
    document.getElementById('centristBar').style.width = `${centristPercent}%`;

    document.getElementById('liberalPercentage').textContent = `${Math.round(liberalPercent)}%`;
    document.getElementById('conservativePercentage').textContent = `${Math.round(conservativePercent)}%`;
    document.getElementById('centristPercentage').textContent = `${Math.round(centristPercent)}%`;
  }

  updateInsightsRecommendations() {
    if (!this.currentWeekData) return;

    const insights = this.generateInsights();
    const goals = this.generateGoals();

    // Update insights list
    const insightsContainer = document.getElementById('insightsList');
    insightsContainer.innerHTML = insights.map(insight => `
      <div class="insight-item ${insight.type}">
        <div class="insight-text">${insight.message}</div>
      </div>
    `).join('');

    // Update goals list
    const goalsContainer = document.getElementById('goalsList');
    goalsContainer.innerHTML = goals.map(goal => `
      <div class="goal-item">${goal}</div>
    `).join('');
  }

  generateInsights() {
    const insights = [];
    const weekData = this.currentWeekData;
    const scores = this.userData.scores;

    // Source diversity insight
    if (weekData.domains.size >= 10) {
      insights.push({
        type: 'positive',
        message: `Excellent source diversity! You visited ${weekData.domains.size} different websites this week.`
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

    return insights.slice(0, 4); // Limit to 4 insights
  }

  generateGoals() {
    const goals = [];
    const weekData = this.currentWeekData;
    const scores = this.userData.scores;

    // Content balance goal
    const categories = weekData.categories;
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    
    if (categories.educational && categories.educational / total < 0.1) {
      goals.push('Add 30 minutes of educational content daily');
    }

    if (categories.social && categories.social / total > 0.4) {
      goals.push('Limit social media to 1 hour per day');
    }

    // Tone goal
    if (scores.contentTone < 6) {
      goals.push('Read 2-3 uplifting articles daily');
    }

    // Source diversity goal
    if (weekData.domains.size < 10) {
      goals.push('Visit 3 new websites this week');
    }

    return goals.slice(0, 3); // Limit to 3 goals
  }

  updateShareableReport() {
    const scores = this.userData.scores;
    if (!scores) return;

    // Update share card
    document.getElementById('shareOverallHealth').textContent = `${scores.overallHealth.toFixed(1)}/10`;

    // Generate content breakdown for sharing
    if (this.currentWeekData) {
      const categories = this.currentWeekData.categories;
      const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
      
      const breakdown = Object.entries(categories)
        .map(([cat, count]) => `${this.formatCategoryName(cat)}: ${Math.round((count / total) * 100)}%`)
        .join(', ');
      
      document.getElementById('shareContentBreakdown').textContent = breakdown;
    }

    // Generate achievement
    const achievements = [];
    if (scores.overallHealth >= 8) achievements.push('Excellent digital diet');
    if (scores.sourceDiversity >= 8) achievements.push('Great source diversity');
    if (scores.contentTone >= 7) achievements.push('Balanced content tone');
    if (scores.politicalBalance >= 7) achievements.push('Diverse viewpoints');
    
    document.getElementById('shareAchievement').textContent = 
      achievements.length > 0 ? achievements[0] : 'Making progress on digital wellness';
  }

  // Export and sharing functions
  exportReport() {
    // Generate PDF or export data
    console.log('Exporting report...');
    // Implementation would use a library like jsPDF
  }

  shareReport() {
    // Share functionality
    console.log('Sharing report...');
    // Implementation would use Web Share API or generate shareable link
  }

  downloadAsImage() {
    // Convert share card to image
    console.log('Downloading as image...');
    // Implementation would use html2canvas
  }

  copyLink() {
    // Copy shareable link to clipboard
    console.log('Copying link...');
    // Implementation would use Clipboard API
  }

  openSettings() {
    // Open settings page
    console.log('Opening settings...');
    // Implementation would open settings modal or page
  }

  exportData() {
    // Export raw data
    console.log('Exporting data...');
    const dataStr = JSON.stringify(this.userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mindset-data.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  deleteData() {
    // Delete all data
    if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      console.log('Deleting data...');
      // Implementation would clear storage and reload
    }
  }

  showEmptyState() {
    // Show empty state when no data
    document.querySelector('.dashboard-main').innerHTML = `
      <div class="empty-state">
        <h2>No Data Available</h2>
        <p>Start browsing to see your digital diet insights!</p>
      </div>
    `;
  }

  showErrorState() {
    // Show error state
    document.querySelector('.dashboard-main').innerHTML = `
      <div class="error-state">
        <h2>Error Loading Data</h2>
        <p>Unable to load your data. Please try refreshing the page.</p>
      </div>
    `;
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

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new DashboardManager();
}); 