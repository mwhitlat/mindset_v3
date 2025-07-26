# Security Documentation for Mindset Extension

## Overview
This document outlines the security measures implemented in the Mindset browser extension to ensure user privacy and data protection.

## Security Features

### 1. Content Security Policy (CSP)
- **Implementation**: Added CSP to `manifest.json`
- **Purpose**: Prevents XSS attacks by restricting script execution
- **Policy**: Only allows scripts from the extension itself (`'self'`)

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
}
```

### 2. Input Validation & Sanitization

#### Background Script Security
- **Request Validation**: All incoming messages are validated for structure and type
- **Rate Limiting**: Implements rate limiting (60 requests per minute per sender)
- **Settings Sanitization**: All settings are validated and sanitized before storage

#### Content Script Security
- **Text Sanitization**: Removes potentially dangerous HTML, scripts, and event handlers
- **URL Validation**: Only allows HTTP/HTTPS protocols
- **Length Limits**: Text content limited to 5000 characters

#### Data Processing Security
- **Domain Sanitization**: Removes dangerous characters from domain names
- **Path Sanitization**: Cleans URL paths to prevent injection attacks
- **Title Sanitization**: Removes script tags and event handlers from page titles

### 3. Permission Model
- **Minimal Permissions**: Only requests necessary permissions
  - `storage`: For local data storage
  - `tabs`: For tracking tab changes
  - `activeTab`: For content analysis
  - `scripting`: For content script injection
- **Host Permissions**: `<all_urls>` for content analysis across all sites

### 4. Data Privacy & Storage
- **Local Storage Only**: All data stored locally using `chrome.storage.local`
- **Optional Encryption**: AES-256-GCM encryption with PBKDF2 key derivation
- **No External Transmission**: No data is sent to external servers
- **User Control**: Users can export or delete all data at any time
- **Data Retention**: Configurable data retention periods (1 week to 1 year)

### 5. Content Analysis Security
- **Safe Content Extraction**: Only extracts text content, no executable code
- **Script Removal**: Automatically removes `<script>` and `<iframe>` tags
- **Event Handler Removal**: Strips `onclick`, `onload`, etc. attributes
- **Protocol Validation**: Only processes HTTP/HTTPS URLs

### 6. Settings Security
- **Input Validation**: All settings inputs are validated for type and range
- **Boolean Validation**: Toggle settings are properly converted to booleans
- **Numeric Ranges**: Numeric settings have defined min/max values
- **Time Format Validation**: Time inputs must match HH:MM format

### 7. Data Encryption
- **AES-256-GCM**: Military-grade encryption algorithm
- **PBKDF2**: Password-based key derivation with 100,000 iterations
- **Optional Feature**: Users can enable/disable encryption
- **Password Requirements**: Minimum 8 characters
- **Salt**: Fixed salt for consistent key derivation
- **IV**: Random initialization vector for each encryption

## Security Measures by Component

### Background Script (`background.js`)
```javascript
// Rate limiting
checkRateLimit(sender) // Prevents abuse

// Input validation
if (!request || typeof request !== 'object') // Validates request structure

// Settings sanitization
sanitizeSettings(settings) // Validates and sanitizes all settings

// URL sanitization
sanitizeUrl(url) // Only allows HTTP/HTTPS

// Text sanitization
sanitizeText(text) // Removes dangerous content
```

### Content Script (`content.js`)
```javascript
// Text sanitization
sanitizeText(text) // Removes scripts and dangerous content

// URL validation
sanitizeUrl(url) // Protocol validation

// Content extraction limits
.substring(0, 5000) // Character limits
```

### Settings Page (`settings.js`)
```javascript
// Form validation
updateSetting(key, value) // Validates before sending to background

// Data export security
exportData() // Safe JSON export with proper MIME type
```

## Privacy Features

### 1. Data Minimization
- Only collects necessary browsing data
- No personal information is stored
- No tracking of user identity

### 2. User Control
- Complete data export functionality
- One-click data deletion
- Configurable tracking preferences
- Opt-out options for all features

### 3. Transparency
- Clear privacy policy
- Open source code
- Detailed data usage explanations
- No hidden data collection

## Security Best Practices

### 1. Code Review
- All code changes reviewed for security implications
- Regular security audits
- Dependency vulnerability scanning

### 2. Error Handling
- Graceful error handling without exposing sensitive information
- Secure error messages
- No stack traces in production

### 3. Data Validation
- Input validation at all entry points
- Output sanitization for all data
- Type checking for all parameters

### 4. Secure Communication
- No external API calls
- All communication internal to extension
- Message validation between components

## Threat Model

### Potential Threats Addressed

1. **Cross-Site Scripting (XSS)**
   - Mitigation: CSP, input sanitization, script removal

2. **Data Injection**
   - Mitigation: Input validation, sanitization, type checking

3. **Rate Limiting Attacks**
   - Mitigation: Request rate limiting per sender

4. **Data Exfiltration**
   - Mitigation: Local storage only, no external transmission

5. **Malicious Content**
   - Mitigation: Content sanitization, protocol validation

6. **Settings Manipulation**
   - Mitigation: Settings validation and sanitization

### Security Assumptions

1. **Browser Security**: Relies on Chrome's extension security model
2. **Local Environment**: Assumes user's device is secure
3. **Extension Permissions**: Assumes granted permissions are legitimate

## Security Checklist

- [x] Content Security Policy implemented
- [x] Input validation and sanitization
- [x] Rate limiting implemented
- [x] Data privacy controls
- [x] Secure data storage
- [x] Optional data encryption (AES-256-GCM)
- [x] Content analysis security
- [x] Settings validation
- [x] Error handling
- [x] User data control
- [x] No external data transmission

## Reporting Security Issues

If you discover a security vulnerability in the Mindset extension:

1. **Do not** create a public issue
2. **Email** security details to: security@mindset-extension.com
3. **Include** detailed description and reproduction steps
4. **Expect** response within 48 hours

## Security Updates

This document will be updated as new security measures are implemented or threats are identified. All security updates will be documented with version numbers and implementation details.

---

**Last Updated**: July 2024  
**Version**: 1.0.0  
**Security Level**: High 