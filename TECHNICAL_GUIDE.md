# Mindset Technical Guide

A comprehensive guide to understanding how the Mindset browser extension works, the software engineering concepts it uses, and how to maintain and extend it.

---

## Table of Contents

1. [Browser Extension Architecture](#1-browser-extension-architecture)
2. [The Manifest File](#2-the-manifest-file)
3. [Script Contexts Explained](#3-script-contexts-explained)
4. [Message Passing System](#4-message-passing-system)
5. [Data Storage](#5-data-storage)
6. [Class-Based Architecture](#6-class-based-architecture)
7. [File-by-File Breakdown](#7-file-by-file-breakdown)
8. [Data Flow Examples](#8-data-flow-examples)
9. [The Warning System](#9-the-warning-system)
10. [Key Programming Concepts](#10-key-programming-concepts)
11. [Debugging Tips](#11-debugging-tips)
12. [Common Patterns to Reuse](#12-common-patterns-to-reuse)

---

## 1. Browser Extension Architecture

Browser extensions are programs that run inside your browser and can interact with web pages, browser tabs, and browser APIs. Think of them as mini-applications that live in your browser.

### The Three Worlds

A browser extension operates across **three isolated worlds** that cannot directly access each other:

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BACKGROUND (Service Worker)                               │  │
│  │  - Runs independently, always "on"                         │  │
│  │  - Has access to most Chrome APIs                          │  │
│  │  - Cannot access web page content directly                 │  │
│  │  - File: background.js                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │ Messages                          │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  CONTENT SCRIPTS (Injected into web pages)                 │  │
│  │  - Runs in context of each web page                        │  │
│  │  - Can read/modify the page's DOM                          │  │
│  │  - Limited Chrome API access                               │  │
│  │  - Files: content.js, browser-status-indicator.js          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │ Messages                          │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  EXTENSION PAGES (Popup, Dashboard, Settings)              │  │
│  │  - Full HTML pages owned by the extension                  │  │
│  │  - Has access to Chrome APIs                               │  │
│  │  - Cannot access web page content                          │  │
│  │  - Files: popup.html/js, dashboard.html/js, settings.html/js│  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Why this separation?** Security. If a malicious website could directly access your extension's data or the background script, it could steal sensitive information. The isolation protects users.

---

## 2. The Manifest File

`manifest.json` is the **configuration file** that tells the browser everything about your extension. It's like a `package.json` for browser extensions.

```json
{
  "manifest_version": 3,           // Which manifest API version (3 is current)
  "name": "Mindset - Digital Diet Tracker",
  "version": "1.0.0",
  "description": "...",

  "permissions": [                  // What the extension can do
    "storage",                     // Save data locally
    "tabs",                        // Access tab information
    "activeTab",                   // Access the current tab
    "scripting",                   // Inject scripts into pages
    "notifications"                // Show system notifications
  ],

  "optional_permissions": [         // Permissions user can grant later
    "history"                      // Access browser history (for import feature)
  ],

  "host_permissions": [             // Which websites we can access
    "https://*/*",                 // All HTTPS sites
    "http://*/*"                   // All HTTP sites
  ],

  "background": {
    "service_worker": "background.js"  // The always-running background script
  },

  "content_scripts": [              // Scripts injected into web pages
    {
      "matches": ["<all_urls>"],   // Inject on all pages
      "js": ["content.js", "browser-status-indicator.js"],
      "run_at": "document_end"     // Run after page loads
    }
  ],

  "action": {
    "default_popup": "popup.html"  // What shows when you click the icon
  },

  "web_accessible_resources": [     // Files that web pages can access
    {
      "resources": ["dashboard.html", "..."],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Key Concepts:

- **Permissions**: You must declare what your extension needs access to. Users see these when installing.
- **Content Scripts**: Automatically injected into matching pages
- **Service Worker**: The background script that coordinates everything

---

## 3. Script Contexts Explained

### Background Script (`background.js`)

**What it is:** A service worker that runs in the background, independent of any web page.

**What it can do:**
- Access Chrome storage APIs
- Listen for browser events (tabs opening, closing, updating)
- Coordinate between different parts of the extension
- Make network requests
- Show notifications

**What it cannot do:**
- Access or modify web page content directly
- Access the DOM of any page

**In Mindset:** The `MindsetTracker` class lives here. It:
- Tracks page visits
- Stores data in `chrome.storage.local`
- Calculates health scores
- Manages the media sources database
- Handles all message routing

### Content Scripts (`content.js`, `browser-status-indicator.js`)

**What they are:** Scripts that get injected into every web page you visit.

**What they can do:**
- Read the page's HTML/DOM
- Modify the page (add elements, change styles)
- Extract information from the page
- Send messages to the background script

**What they cannot do:**
- Access Chrome storage directly (must ask background)
- Access variables/functions from the page's own JavaScript
- Persist data themselves

**In Mindset:**
- `content.js`: Extracts page content (title, text, metadata) for analysis
- `browser-status-indicator.js`: Creates and manages the status bar, warning banners, and interstitials

### Extension Pages (`popup.js`, `dashboard.js`, `settings.js`)

**What they are:** Full HTML pages that are part of your extension.

**What they can do:**
- Full access to Chrome APIs
- Display rich UIs
- Send messages to background script
- Store data

**In Mindset:**
- `popup.js`: The small window when you click the extension icon
- `dashboard.js`: Full analytics dashboard
- `settings.js`: Settings management page

---

## 4. Message Passing System

Since the three worlds can't directly access each other, they communicate through **messages**. This is the most important pattern in extension development.

### Sending a Message

```javascript
// From content script or popup to background:
chrome.runtime.sendMessage(
  { action: 'getUserData' },           // The message object
  (response) => {                       // Callback with response
    console.log(response.userData);
  }
);

// Modern async/await version:
const response = await chrome.runtime.sendMessage({ action: 'getUserData' });
```

### Receiving Messages (in background.js)

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // request = the message that was sent
  // sender = info about who sent it (which tab, etc.)
  // sendResponse = function to send a response back

  switch (request.action) {
    case 'getUserData':
      sendResponse({ userData: this.userData });
      break;
    case 'updateSettings':
      this.updateSettings(request.settings);
      sendResponse({ success: true });
      break;
  }

  return true; // IMPORTANT: Keeps the message channel open for async responses
});
```

### The Message Flow Pattern

```
┌──────────────┐     Message: {action: 'getUserData'}      ┌──────────────┐
│              │ ─────────────────────────────────────────▶│              │
│  popup.js    │                                           │ background.js│
│              │◀───────────────────────────────────────── │              │
└──────────────┘     Response: {userData: {...}}           └──────────────┘
```

### Promise Wrapper Pattern

The codebase wraps `sendMessage` in a Promise for cleaner async/await usage:

```javascript
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

// Usage:
const { userData } = await this.sendMessage({ action: 'getUserData' });
```

---

## 5. Data Storage

### chrome.storage.local

Browser extensions use `chrome.storage.local` instead of `localStorage`. It's similar but:
- Works across all extension contexts
- Can store more data
- Is async (returns Promises)

```javascript
// Saving data
await chrome.storage.local.set({
  userData: { name: 'John', scores: {...} },
  isTracking: true
});

// Loading data
const result = await chrome.storage.local.get(['userData', 'isTracking']);
console.log(result.userData);  // { name: 'John', scores: {...} }
console.log(result.isTracking); // true
```

### Data Structure in Mindset

```javascript
userData = {
  trackingStartDate: '2024-01-01T00:00:00.000Z',

  settings: {
    isTracking: true,
    interventionLevel: 'balanced',
    showCredibilityWarnings: true,
    // ... more settings
  },

  scores: {
    overallHealth: 7.2,
    contentBalance: 6.8,
    sourceDiversity: 8.1,
    // ... more scores
  },

  weeklyData: {
    '2024-01-14': {  // Week key (Sunday's date)
      visits: [
        {
          domain: 'nytimes.com',
          path: '/article/...',
          title: 'Article Title',
          timestamp: 1705276800000,
          duration: 15,
          category: 'news',
          credibility: 8.5,
          politicalBias: 'left-center',
          tone: 'neutral',
          sourceName: 'New York Times'
        },
        // ... more visits
      ],
      domains: Set(['nytimes.com', 'bbc.com', ...]),
      categories: { news: 5, social: 3, educational: 2 },
      totalTime: 120
    }
  }
}
```

### Why Week Keys?

Data is organized by week for:
- Easy weekly reports
- Manageable data size
- Natural time boundaries

```javascript
getWeekKey() {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  return startOfWeek.toISOString().split('T')[0];  // "2024-01-14"
}
```

---

## 6. Class-Based Architecture

The codebase uses **ES6 classes** to organize code. Each file typically has one main class.

### Class Structure Pattern

```javascript
class ClassName {
  constructor() {
    // Initialize instance variables
    this.someData = null;
    this.someState = false;

    // Start initialization
    this.init();
  }

  async init() {
    // Setup that might be async
    await this.loadData();
    this.setupEventListeners();
  }

  // Methods organized by responsibility
  async loadData() { ... }

  setupEventListeners() { ... }

  // Helper methods
  calculateSomething() { ... }
  formatSomething() { ... }
}

// Instantiate at the bottom of the file
const instance = new ClassName();
```

### Why Classes?

1. **Encapsulation**: Related data and functions stay together
2. **State Management**: Instance variables (`this.xyz`) maintain state
3. **Organization**: Easy to find what you're looking for
4. **Reusability**: Methods can call other methods easily

---

## 7. File-by-File Breakdown

### `manifest.json`
**Purpose:** Configuration file that defines the extension
**Key Info:** Permissions, scripts to inject, background worker

---

### `background.js` - The Brain

**Class:** `MindsetTracker`

**Key Responsibilities:**
- Coordinates all extension functionality
- Stores and retrieves data
- Analyzes pages
- Calculates scores
- Handles all messages from other scripts

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `init()` | Loads data, starts tracking |
| `trackPageVisit(tab)` | Called when a tab loads |
| `saveVisitData(visitData)` | Saves a page visit to storage |
| `calculateScores(weekKey)` | Computes all health scores |
| `assessCredibility(domain)` | Looks up credibility in database |
| `assessPoliticalBias(domain)` | Looks up political bias |
| `handleMessage(request, sender, sendResponse)` | Routes all incoming messages |
| `getAlternativeSources(bias, category)` | Finds alternative news sources |

**Message Actions Handled:**
- `getTrackingState` - Returns if tracking is on
- `toggleTracking` - Turns tracking on/off
- `getUserData` - Returns all user data
- `getCurrentScores` - Returns health scores
- `getWeekData` - Returns current week's data
- `updateSettings` - Saves settings changes
- `analyzePageForTab` - Analyzes a page
- `getAlternativeSources` - Gets alternative sources

---

### `content.js` - Page Content Extractor

**Class:** `ContentAnalyzer`

**Purpose:** Extracts text and metadata from web pages for analysis.

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `extractPageContent()` | Gets title, text, meta description |
| `getPageText()` | Extracts main content text |
| `sanitizeText(text)` | Removes dangerous content (XSS protection) |
| `analyzeSentiment(text)` | Simple positive/negative analysis |

**How it's used:** Background script sends a message asking for page content:

```javascript
// In background.js
const response = await chrome.tabs.sendMessage(tabId, { action: 'getPageContent' });
```

---

### `browser-status-indicator.js` - The UI Layer

**Class:** `BrowserStatusIndicator`

**Purpose:** Creates and manages all visual elements that appear on web pages:
- Status bar at bottom
- Warning banners
- Interstitial overlays
- Alternatives panel

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `createStatusIndicator()` | Creates the bottom status bar |
| `createWarningBanner()` | Creates the Tier 2 warning banner |
| `createInterstitialOverlay()` | Creates the Tier 3 full-page overlay |
| `determineWarningLevel(pageData)` | Decides which warning to show (0-3) |
| `showWarnings(pageData)` | Orchestrates the warning display |
| `showWarningBanner(pageData, alternatives)` | Shows the dismissable banner |
| `showInterstitial(pageData, alternatives)` | Shows the full-page warning |
| `showAlternativesPanel(alternatives)` | Shows alternative sources modal |
| `getAlternatives(pageData)` | Requests alternatives from background |

**DOM Manipulation Pattern:**

```javascript
// Create an element
this.warningBanner = document.createElement('div');

// Set styles (inline CSS)
this.warningBanner.style.cssText = `
  position: fixed;
  top: 0;
  ...
`;

// Set content
this.warningBanner.innerHTML = `
  <div>...</div>
  <button id="some-button">Click</button>
`;

// Add to page
document.body.appendChild(this.warningBanner);

// Add event listeners
document.getElementById('some-button').addEventListener('click', () => {
  this.handleClick();
});
```

---

### `popup.js` - The Popup Window

**Class:** `PopupManager`

**Purpose:** Manages the small popup when you click the extension icon.

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `loadData()` | Fetches data from background |
| `updateUI(userData)` | Updates all UI elements |
| `updateScores(scores)` | Displays health scores |
| `generateInsights(weekData)` | Creates insight messages |
| `openDashboard()` | Opens dashboard in new tab |
| `openSettings()` | Opens settings in new tab |

---

### `settings.js` - Settings Management

**Class:** `SettingsManager`

**Purpose:** Handles the settings page.

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `loadData()` | Gets current settings |
| `populateSettings()` | Fills form with current values |
| `updateSetting(key, value)` | Saves a setting change |
| `exportData()` | Downloads user data as JSON |
| `clearData()` | Deletes all user data |

---

### `media-sources.json` - The Database

**Purpose:** Static database of news sources with credibility and bias ratings.

**Structure:**
```json
{
  "domains": {
    "nytimes.com": {
      "credibility": 8.5,
      "bias": "left-center",
      "category": "news",
      "name": "New York Times"
    }
  }
}
```

**How it's loaded:**
```javascript
async loadMediaSources() {
  const response = await fetch(chrome.runtime.getURL('media-sources.json'));
  const data = await response.json();
  this.mediaSources = data.domains;
}
```

---

## 8. Data Flow Examples

### Example 1: User Visits a Page

```
1. User navigates to nytimes.com
          │
          ▼
2. Chrome fires tabs.onUpdated event
          │
          ▼
3. background.js: trackPageVisit(tab) is called
          │
          ▼
4. background.js: Sends message to content script
   { action: 'getPageContent' }
          │
          ▼
5. content.js: Extracts page content
   Returns: { title, text, metaDescription }
          │
          ▼
6. background.js: analyzePageContent()
   - Looks up nytimes.com in mediaSources
   - Gets credibility: 8.5, bias: "left-center"
   - Analyzes tone from title
          │
          ▼
7. background.js: saveVisitData(visitData)
   - Adds to userData.weeklyData[weekKey].visits
   - Updates domains Set
   - Updates category counts
          │
          ▼
8. background.js: calculateScores(weekKey)
   - Recalculates all health scores
          │
          ▼
9. background.js: Saves to chrome.storage.local
          │
          ▼
10. Content scripts update UI
    - Status bar shows credibility
    - Warning banner if needed
```

### Example 2: Warning System Flow

```
1. browser-status-indicator.js: getPageData() called
          │
          ▼
2. Sends message: { action: 'analyzePageForTab', pageInfo }
          │
          ▼
3. background.js: Returns pageData with credibility, bias, category
          │
          ▼
4. browser-status-indicator.js: showWarnings(pageData)
          │
          ▼
5. determineWarningLevel(pageData)
   - credibility < 3 OR conspiracy/state-media → Tier 3
   - credibility < 5 OR far-left/far-right → Tier 2
   - credibility < 6 OR left/right (strict mode) → Tier 1
   - Otherwise → Tier 0 (no warning)
          │
          ▼
6. If Tier 2 or 3: getAlternatives(pageData)
   - Sends message: { action: 'getAlternativeSources' }
   - background.js finds opposite-bias, high-credibility sources
          │
          ▼
7. Show appropriate UI:
   - Tier 1: Enhanced status bar
   - Tier 2: Warning banner with dismiss option
   - Tier 3: Full-page interstitial with countdown
```

### Example 3: User Opens Popup

```
1. User clicks extension icon
          │
          ▼
2. popup.html loads, popup.js runs
          │
          ▼
3. PopupManager.loadData()
   - Sends: { action: 'getTrackingState' }
   - Sends: { action: 'getUserData' }
          │
          ▼
4. background.js responds with data
          │
          ▼
5. PopupManager.updateUI(userData)
   - Updates stats (visits, domains, hours)
   - Updates health scores
   - Generates and displays insights
```

---

## 9. The Warning System

### Tier Overview

| Tier | Trigger | UI Element | User Action |
|------|---------|------------|-------------|
| 0 | Good source | No warning | None needed |
| 1 | Moderate concern | Orange status bar | Informational |
| 2 | Low credibility or extreme bias | Dismissable banner | Can dismiss or see alternatives |
| 3 | Conspiracy/state-media | Full-page overlay | Must wait 5s or go back |

### Warning Level Logic

```javascript
determineWarningLevel(pageData) {
  const { credibility, politicalBias, category } = pageData;

  // Tier 3: Highest concern
  if (credibility < 3) return 3;
  if (['conspiracy', 'state-media'].includes(category)) return 3;

  // Tier 2: Significant concern
  if (credibility < 5) return 2;
  if (['far-left', 'far-right'].includes(politicalBias)) return 2;

  // Tier 1: Moderate concern (strict mode only)
  if (interventionLevel === 'strict') {
    if (credibility < 6) return 1;
    if (['left', 'right'].includes(politicalBias)) return 1;
  }

  return 0; // No warning
}
```

### Alternative Sources Algorithm

```javascript
getAlternativeSources(currentBias, category) {
  // 1. Determine target biases (opposite of current)
  if (currentBias.includes('left')) {
    targetBiases = ['center', 'right-center', 'right'];
  } else if (currentBias.includes('right')) {
    targetBiases = ['center', 'left-center', 'left'];
  }

  // 2. Filter media sources
  // - Must be news, fact-check, or science category
  // - Must match target bias
  // - Must have credibility >= 7

  // 3. Deduplicate by name (AP has two domains)

  // 4. Sort by credibility, return top 3
}
```

---

## 10. Key Programming Concepts

### Async/Await

JavaScript operations that take time (network requests, storage) are **asynchronous**. They don't block other code from running.

```javascript
// Old callback style (harder to read)
chrome.storage.local.get(['userData'], (result) => {
  console.log(result.userData);
});

// Promise style
chrome.storage.local.get(['userData'])
  .then(result => console.log(result.userData));

// Async/await style (cleanest)
async function loadData() {
  const result = await chrome.storage.local.get(['userData']);
  console.log(result.userData);
}
```

### Event Listeners

Listen for things happening:

```javascript
// DOM events (clicks, etc.)
button.addEventListener('click', () => {
  console.log('Button clicked!');
});

// Chrome events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab finished loading');
  }
});

// Message events
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle message
});
```

### DOM Manipulation

Creating and modifying HTML elements:

```javascript
// Create element
const div = document.createElement('div');

// Set properties
div.id = 'my-element';
div.className = 'warning-box';
div.style.cssText = 'color: red; font-size: 14px;';
div.innerHTML = '<p>Hello</p>';
div.textContent = 'Plain text (safer)';

// Add to page
document.body.appendChild(div);

// Find elements
const element = document.getElementById('my-element');
const elements = document.querySelectorAll('.warning-box');

// Remove element
element.remove();
```

### Object Destructuring

Extracting values from objects:

```javascript
const pageData = {
  credibility: 8.5,
  politicalBias: 'center',
  category: 'news',
  sourceName: 'Reuters'
};

// Instead of:
const credibility = pageData.credibility;
const bias = pageData.politicalBias;

// You can do:
const { credibility, politicalBias, category, sourceName } = pageData;
```

### Template Literals

Creating strings with variables:

```javascript
const name = 'Reuters';
const score = 9.5;

// Old way
const message = 'Source: ' + name + ' has score ' + score + '/10';

// Template literal (backticks)
const message = `Source: ${name} has score ${score}/10`;

// Multi-line strings
const html = `
  <div class="card">
    <h2>${name}</h2>
    <p>Credibility: ${score}/10</p>
  </div>
`;
```

### Sets

Collections of unique values:

```javascript
const domains = new Set();

domains.add('nytimes.com');
domains.add('bbc.com');
domains.add('nytimes.com');  // Duplicate, ignored

console.log(domains.size);  // 2
console.log(domains.has('bbc.com'));  // true

// Convert to array
const array = Array.from(domains);  // ['nytimes.com', 'bbc.com']
```

### Map vs Object

Both store key-value pairs, but Map has advantages:

```javascript
// Object (traditional)
const obj = {};
obj['key'] = 'value';

// Map (better for dynamic keys)
const map = new Map();
map.set('key', 'value');
map.get('key');  // 'value'
map.has('key');  // true
map.delete('key');

// Maps preserve insertion order
// Maps can have any type as key (not just strings)
```

---

## 11. Debugging Tips

### Chrome DevTools for Extensions

1. **Background Script Console:**
   - Go to `chrome://extensions`
   - Find Mindset, click "Service Worker" link
   - Opens DevTools for background.js

2. **Content Script Console:**
   - Right-click on any page → Inspect
   - Console shows content script logs
   - Look for "content.js" or "browser-status-indicator.js" in source

3. **Popup Console:**
   - Right-click the popup → Inspect
   - Opens DevTools for popup.html

### Useful Console Commands

```javascript
// In background script console:
chrome.storage.local.get(null, console.log);  // See all stored data

// Check mediaSources loaded:
mindsetTracker.mediaSources

// See current user data:
mindsetTracker.userData

// Test a function:
mindsetTracker.assessCredibility('breitbart.com')
```

### Common Issues

1. **"Cannot read property of undefined"**
   - Something wasn't loaded yet
   - Add `console.log()` to see what's null

2. **Message not received**
   - Check `return true;` in message listener
   - Check if background script reloaded (breaks connections)

3. **UI not updating**
   - Check if element exists: `console.log(document.getElementById('xyz'))`
   - Check if data is what you expect: `console.log(pageData)`

4. **Storage not saving**
   - Sets don't serialize to JSON - convert to Array first
   - Check for circular references

### Reload Extension After Changes

After editing code:
1. Go to `chrome://extensions`
2. Click the reload button on Mindset
3. Refresh any open pages (content scripts need fresh injection)

---

## 12. Common Patterns to Reuse

### Pattern 1: Message Handler Switch

```javascript
handleMessage(request, sender, sendResponse) {
  switch (request.action) {
    case 'doSomething':
      const result = this.doSomething(request.data);
      sendResponse({ result });
      break;
    case 'doSomethingElse':
      // ...
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }
  return true;  // Keep channel open for async
}
```

### Pattern 2: Async Data Loading

```javascript
async loadData() {
  try {
    const response = await this.sendMessage({ action: 'getUserData' });
    if (response.userData) {
      this.updateUI(response.userData);
    } else {
      this.showEmptyState();
    }
  } catch (error) {
    console.error('Error loading data:', error);
    this.showErrorState();
  }
}
```

### Pattern 3: Creating UI Elements

```javascript
createWarningBanner() {
  // 1. Create container
  this.banner = document.createElement('div');
  this.banner.id = 'my-extension-banner';

  // 2. Style it (inline for isolation from page styles)
  this.banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999999;
  `;

  // 3. Add content
  this.banner.innerHTML = `
    <span>Message here</span>
    <button id="my-dismiss-btn">Dismiss</button>
  `;

  // 4. Add to page
  document.body.appendChild(this.banner);

  // 5. Add event listeners
  document.getElementById('my-dismiss-btn')
    .addEventListener('click', () => this.hideBanner());
}
```

### Pattern 4: Settings Management

```javascript
// Save setting
async updateSetting(key, value) {
  this.settings[key] = value;
  await this.sendMessage({
    action: 'updateSettings',
    settings: this.settings
  });
}

// Load settings into form
populateSettings() {
  const { showWarnings, interventionLevel } = this.settings;

  document.getElementById('showWarnings').checked = showWarnings;
  document.getElementById('interventionLevel').value = interventionLevel;
}

// Listen for changes
document.getElementById('showWarnings')
  .addEventListener('change', (e) => {
    this.updateSetting('showWarnings', e.target.checked);
  });
```

### Pattern 5: Deduplication

```javascript
getUniqueItems(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Usage
const uniqueSources = getUniqueItems(sources, s => s.name);
```

---

## Summary

The Mindset extension demonstrates key software engineering concepts:

1. **Separation of Concerns**: Different files handle different responsibilities
2. **Message Passing**: Isolated contexts communicate through a defined protocol
3. **State Management**: Central data store in background, UI syncs on demand
4. **Progressive Enhancement**: Multiple warning tiers based on severity
5. **User Control**: Settings allow customization
6. **Security**: Input sanitization, content security policies
7. **Performance**: Data organized by week, limited history

Understanding these patterns will help you:
- Debug issues by tracing the data flow
- Add new features by following existing patterns
- Build new extensions using the same architecture

---

## Next Steps for Learning

1. **Add a new message type**: Create a new action in handleMessage and call it from another script
2. **Add a new setting**: Follow the pattern in settings.html/js
3. **Modify the warning UI**: Change styles or add new buttons
4. **Add a new data field**: Track something new for each visit
5. **Read Chrome Extension docs**: https://developer.chrome.com/docs/extensions/
