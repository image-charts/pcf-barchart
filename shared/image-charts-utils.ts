/**
 * Image-Charts PCF Utilities
 * Shared utilities for all Image-Charts PCF components
 *
 * @version 1.0.0
 */

// ============================================================
// HMAC-SHA256 Signing
// ============================================================

/**
 * Compute HMAC-SHA256 signature using Web Crypto API (with crypto-js fallback)
 * @param secretKey - The secret key for signing
 * @param message - The message to sign (query string)
 * @returns Promise<string> - Hex-encoded signature
 */
export async function computeHmacSha256(secretKey: string, message: string): Promise<string> {
  // Try Web Crypto API first (modern browsers, lighter)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback to crypto-js (for older environments)
  const CryptoJS = await import('crypto-js');
  const hash = CryptoJS.HmacSHA256(message, secretKey);
  return CryptoJS.enc.Hex.stringify(hash);
}

/**
 * Synchronous HMAC-SHA256 using crypto-js (for environments without async support)
 * @param secretKey - The secret key for signing
 * @param message - The message to sign
 * @returns string - Hex-encoded signature
 */
export function computeHmacSha256Sync(secretKey: string, message: string): string {
  // Import crypto-js modules synchronously
  const HmacSHA256 = require('crypto-js/hmac-sha256');
  const Hex = require('crypto-js/enc-hex');
  return Hex.stringify(HmacSHA256(message, secretKey));
}

// ============================================================
// URL Building
// ============================================================

export interface ImageChartsConfig {
  accountId?: string;
  secretKey?: string;
  privateCloudDomain?: string;
  userAgent?: string;
}

export interface ChartParams {
  [key: string]: string | undefined;
}

/**
 * Build Image-Charts URL with optional HMAC signing
 * @param config - Account configuration
 * @param params - Chart parameters
 * @returns string - Complete URL (signed if Enterprise mode)
 */
export function buildImageChartsUrl(config: ImageChartsConfig, params: ChartParams): string {
  const baseHost = config.privateCloudDomain || 'image-charts.com';
  const baseUrl = `https://${baseHost}/chart`;

  // Build query string from params
  const queryParts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      queryParts.push(`${key}=${value}`);
    }
  }

  // Add account ID if Enterprise mode
  if (config.accountId && !config.privateCloudDomain) {
    queryParts.push(`icac=${config.accountId}`);
  }

  const queryString = queryParts.join('&');

  // Sign if Enterprise mode (accountId + secretKey, no privateCloudDomain)
  if (config.accountId && config.secretKey && !config.privateCloudDomain) {
    const signature = computeHmacSha256Sync(config.secretKey, queryString);
    return `${baseUrl}?${queryString}&ichm=${signature}`;
  }

  return `${baseUrl}?${queryString}`;
}

/**
 * Build URL asynchronously (uses Web Crypto when available)
 */
export async function buildImageChartsUrlAsync(config: ImageChartsConfig, params: ChartParams): Promise<string> {
  const baseHost = config.privateCloudDomain || 'image-charts.com';
  const baseUrl = `https://${baseHost}/chart`;

  const queryParts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      queryParts.push(`${key}=${value}`);
    }
  }

  if (config.accountId && !config.privateCloudDomain) {
    queryParts.push(`icac=${config.accountId}`);
  }

  const queryString = queryParts.join('&');

  if (config.accountId && config.secretKey && !config.privateCloudDomain) {
    const signature = await computeHmacSha256(config.secretKey, queryString);
    return `${baseUrl}?${queryString}&ichm=${signature}`;
  }

  return `${baseUrl}?${queryString}`;
}

// ============================================================
// Color Format Conversion
// ============================================================

/**
 * Normalize color to RRGGBB format (without #)
 * Accepts: RRGGBB, #RRGGBB
 * @param color - Color string
 * @returns string - Normalized RRGGBB or empty string if invalid
 */
export function normalizeColor(color: string | undefined): string {
  if (!color) return '';

  const trimmed = color.trim();

  // Remove # prefix if present
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;

  // Validate hex format (6 characters, 0-9 and A-F)
  if (/^[0-9A-Fa-f]{6}$/.test(withoutHash)) {
    return withoutHash.toUpperCase();
  }

  // Invalid format
  return '';
}

/**
 * Parse multiple colors (pipe-separated)
 * @param colors - Pipe-separated color string (e.g., "FF0000|00FF00|0000FF")
 * @returns string - Normalized pipe-separated colors
 */
export function normalizeColors(colors: string | undefined): string {
  if (!colors) return '';

  return colors
    .split('|')
    .map(c => normalizeColor(c))
    .filter(c => c !== '')
    .join('|');
}

// ============================================================
// Data Format Parsing
// ============================================================

/**
 * Parse data values from CSV or pipe-separated format
 * Accepts: "10,20,30" or "10|20|30"
 * @param data - Data string
 * @returns number[] - Array of numbers
 */
export function parseDataValues(data: string | undefined): number[] {
  if (!data) return [];

  const trimmed = data.trim();

  // Detect separator (pipe takes precedence for Image-Charts compatibility)
  const separator = trimmed.includes('|') ? '|' : ',';

  return trimmed
    .split(separator)
    .map(v => parseFloat(v.trim()))
    .filter(v => !isNaN(v));
}

/**
 * Format data values for Image-Charts (Awesome format)
 * @param values - Array of numbers
 * @returns string - Image-Charts data format "a:10,20,30"
 */
export function formatDataAwesome(values: number[]): string {
  if (values.length === 0) return '';
  return `a:${values.join(',')}`;
}

/**
 * Parse labels (CSV or pipe-separated)
 * @param labels - Labels string
 * @returns string[] - Array of labels
 */
export function parseLabels(labels: string | undefined): string[] {
  if (!labels) return [];

  const trimmed = labels.trim();
  const separator = trimmed.includes('|') ? '|' : ',';

  return trimmed
    .split(separator)
    .map(l => l.trim())
    .filter(l => l !== '');
}

/**
 * Format labels for Image-Charts (pipe-separated)
 * @param labels - Array of labels
 * @returns string - Pipe-separated labels
 */
export function formatLabels(labels: string[]): string {
  return labels.join('|');
}

// ============================================================
// Hostname Validation
// ============================================================

/**
 * Validate hostname format for Private Cloud domain
 * @param hostname - Hostname to validate
 * @returns boolean - True if valid hostname format
 */
export function isValidHostname(hostname: string | undefined): boolean {
  if (!hostname) return false;

  const trimmed = hostname.trim();

  // Basic hostname validation (RFC 1123)
  // Allows: letters, numbers, dots, hyphens
  // Must not start/end with dot or hyphen
  // Each label must be 1-63 chars, total max 253 chars
  if (trimmed.length > 253) return false;

  const hostnameRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*$/;
  return hostnameRegex.test(trimmed);
}

// ============================================================
// Debounce Utility
// ============================================================

/**
 * Create a debounced function
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

// ============================================================
// Retry with Exponential Backoff
// ============================================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  totalTimeout?: number;
}

/**
 * Load image with retry and exponential backoff
 * @param url - Image URL to load
 * @param options - Retry options
 * @returns Promise<HTMLImageElement> - Loaded image element
 */
export function loadImageWithRetry(
  url: string,
  options: RetryOptions = {}
): Promise<HTMLImageElement> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 5000,
    totalTimeout = 15000
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryLoad = () => {
      // Check total timeout
      if (Date.now() - startTime > totalTimeout) {
        reject(new Error(`Image load timeout after ${totalTimeout}ms`));
        return;
      }

      attempts++;
      const img = new Image();

      img.onload = () => resolve(img);

      img.onerror = () => {
        if (attempts >= maxRetries) {
          reject(new Error(`Failed to load image after ${maxRetries} attempts`));
          return;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(initialDelay * Math.pow(2, attempts - 1), maxDelay);

        // Check if we'd exceed total timeout
        if (Date.now() - startTime + delay > totalTimeout) {
          reject(new Error(`Image load timeout after ${totalTimeout}ms`));
          return;
        }

        setTimeout(tryLoad, delay);
      };

      img.src = url;
    };

    tryLoad();
  });
}

// ============================================================
// Error Placeholder
// ============================================================

/**
 * Create error placeholder element
 * @param message - Error message
 * @param customPlaceholderUrl - Optional custom placeholder image URL
 * @returns HTMLElement - Error placeholder element
 */
export function createErrorPlaceholder(
  message: string,
  customPlaceholderUrl?: string
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'image-charts-error';
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    text-align: center;
  `;

  if (customPlaceholderUrl) {
    const img = document.createElement('img');
    img.src = customPlaceholderUrl;
    img.alt = message;
    img.style.maxWidth = '100%';
    container.appendChild(img);
  } else {
    // Default branded placeholder with Image-Charts logo
    const logo = document.createElement('div');
    logo.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="8" fill="#4285F4"/>
        <path d="M25 70V40L40 55L55 35L75 60V70H25Z" fill="white"/>
        <circle cx="35" cy="35" r="8" fill="white"/>
      </svg>
    `;
    logo.style.marginBottom = '8px';
    container.appendChild(logo);

    const text = document.createElement('div');
    text.textContent = message;
    text.style.cssText = `
      color: #6c757d;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    container.appendChild(text);
  }

  return container;
}

// ============================================================
// User-Agent Builder
// ============================================================

/**
 * Build User-Agent string for Image-Charts requests
 * @param componentName - PCF component name (e.g., 'qrcode', 'barchart')
 * @param version - Component version
 * @param accountId - Optional account ID
 * @returns string - User-Agent string
 */
export function buildUserAgent(
  componentName: string,
  version: string,
  accountId?: string
): string {
  const base = `pcf-image-charts-${componentName}/${version}`;
  return accountId ? `${base} (${accountId})` : base;
}

// ============================================================
// Advanced Options Parser
// ============================================================

/**
 * Parse advanced options query string into key-value pairs
 * @param options - Query string format "key=value&key2=value2"
 * @returns Record<string, string> - Parsed key-value pairs
 */
export function parseAdvancedOptions(options: string | undefined): Record<string, string> {
  if (!options) return {};

  const result: Record<string, string> = {};
  const pairs = options.split('&');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      // Skip forbidden params that could break signing
      if (key === 'ichm' || key === 'icac') continue;
      result[key.trim()] = value.trim();
    }
  }

  return result;
}

// ============================================================
// Exports
// ============================================================

export const IMAGE_CHARTS_VERSION = '1.0.0';
export const DEFAULT_DEBOUNCE_MS = 300;
export const DEFAULT_TIMEOUT_MS = 15000;
