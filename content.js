// Content script for Mindset extension
class ContentAnalyzer {
  constructor() {
    this.init();
  }

  init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getPageContent') {
        const content = this.extractPageContent();
        sendResponse({ content });
      }
    });
  }

  extractPageContent() {
    try {
      // Extract text content from the page
      const content = {
        title: this.sanitizeText(this.getPageTitle()),
        text: this.sanitizeText(this.getPageText()),
        metaDescription: this.sanitizeText(this.getMetaDescription()),
        url: this.sanitizeUrl(window.location.href),
        timestamp: Date.now()
      };

      return content;
    } catch (error) {
      console.error('Error extracting page content:', error);
      return null;
    }
  }

  getPageTitle() {
    return document.title || '';
  }

  getPageText() {
    // Get text content from main content areas
    const selectors = [
      'main',
      'article',
      '.content',
      '.post-content',
      '.entry-content',
      '#content',
      '.main-content',
      'p',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ];

    let text = '';
    
    // Try to get content from main content areas first
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(element => {
          if (element.textContent) {
            text += element.textContent + ' ';
          }
        });
        break; // Use the first successful selector
      }
    }

    // Fallback to body text if no main content found
    if (!text.trim()) {
      text = document.body.textContent || '';
    }

    // Clean up the text
    return this.cleanText(text);
  }

  getMetaDescription() {
    const metaDescription = document.querySelector('meta[name="description"]');
    return metaDescription ? metaDescription.getAttribute('content') : '';
  }

  cleanText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\t+/g, ' ') // Replace tabs with spaces
      .trim()
      .substring(0, 5000); // Limit to 5000 characters for performance
  }

  // Additional content analysis methods
  analyzeSentiment(text) {
    if (!text) return 'neutral';

    const lowerText = text.toLowerCase();
    
    // Simple sentiment analysis based on keyword counting
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'success', 'progress', 'improve', 'better', 'positive', 'happy',
      'love', 'like', 'enjoy', 'pleased', 'satisfied', 'content'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disaster', 'crisis',
      'problem', 'issue', 'fail', 'failure', 'broken', 'wrong',
      'hate', 'dislike', 'angry', 'sad', 'disappointed', 'frustrated'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        positiveCount += matches.length;
      }
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        negativeCount += matches.length;
      }
    });

    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  extractKeywords(text) {
    if (!text) return [];

    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3); // Only words longer than 3 characters

    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Get top keywords
    const keywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return keywords;
  }

  // Security helper functions
  sanitizeText(text) {
    if (typeof text !== 'string') return '';
    
    // Remove potentially dangerous content
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/vbscript:/gi, '')
      .trim()
      .substring(0, 5000); // Limit length
  }

  sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.href;
    } catch (error) {
      return null;
    }
  }
}

// Initialize the content analyzer
const contentAnalyzer = new ContentAnalyzer(); 