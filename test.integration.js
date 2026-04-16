/**
 * Integration Tests for BarChartGenerator PCF Component
 * Black-box tests against the real Image-Charts API.
 * Based on test scenarios from the Zapier connector.
 */

const crypto = require('crypto');
const https = require('https');

const ACCOUNT_ID = process.env.IMAGE_CHARTS_ACCOUNT_ID;
const SECRET_KEY = process.env.IMAGE_CHARTS_SECRET_KEY;
const PRIVATE_CLOUD_DOMAIN = process.env.IMAGE_CHARTS_PRIVATE_CLOUD_DOMAIN;
const USER_AGENT = process.env.IMAGE_CHARTS_USER_AGENT || 'pcf-image-charts-barchart/1.0.0-test';

const describeIfCredentials = ACCOUNT_ID && SECRET_KEY ? describe : describe.skip;
const describeIfPrivateCloud = PRIVATE_CLOUD_DOMAIN ? describe : describe.skip;

function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function buildSignedBarChartUrl(params) {
  const { accountId, secretKey, data, labels, colors, orientation, stacked, chartSize, chartType } = params;
  let cht = chartType;
  if (!cht) {
    if (orientation === 'horizontal') {
      cht = stacked ? 'bhs' : 'bhg';
    } else {
      cht = stacked ? 'bvs' : 'bvg';
    }
  }
  const searchParams = new URLSearchParams();
  searchParams.append('cht', cht);
  searchParams.append('chs', chartSize || '400x300');
  searchParams.append('chd', 'a:' + data);
  if (labels) searchParams.append('chl', labels);
  if (colors) searchParams.append('chco', colors);
  searchParams.append('icac', accountId);
  const signature = computeHmacSha256Sync(secretKey, searchParams.toString());
  searchParams.append('ichm', signature);
  return 'https://image-charts.com/chart?' + searchParams.toString();
}

function buildPrivateCloudBarChartUrl(params) {
  const { domain, data, labels, colors, orientation, stacked, chartSize, chartType } = params;
  let cht = chartType;
  if (!cht) {
    if (orientation === 'horizontal') {
      cht = stacked ? 'bhs' : 'bhg';
    } else {
      cht = stacked ? 'bvs' : 'bvg';
    }
  }
  const searchParams = new URLSearchParams();
  searchParams.append('cht', cht);
  searchParams.append('chs', chartSize || '400x300');
  searchParams.append('chd', 'a:' + data);
  if (labels) searchParams.append('chl', labels);
  if (colors) searchParams.append('chco', colors);
  // Private Cloud: no icac/ichm needed
  const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;
  return baseUrl + '/chart?' + searchParams.toString();
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ============================================================
// URL Generation Tests
// ============================================================

describe('URL Generation', () => {
  const testAccountId = 'test_account';
  const testSecretKey = 'test_secret_key_123';

  test('should generate correct URL structure for vertical grouped bar chart', () => {
    const url = buildSignedBarChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '60,40',
      chartSize: '300x300'
    });
    expect(url).toContain('cht=bvg');
    expect(url).toContain('chs=300x300');
    expect(url).toContain('chd=a%3A60%2C40');
    expect(url).toContain('icac=' + testAccountId);
    expect(url).toContain('ichm=');
  });

  test('should generate correct URL for horizontal grouped bar chart (bhg)', () => {
    const url = buildSignedBarChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '10,30,40,50',
      orientation: 'horizontal',
      chartSize: '150x150'
    });
    expect(url).toContain('cht=bhg');
    expect(url).toContain('chd=a%3A10%2C30%2C40%2C50');
  });

  test('should generate correct URL for vertical stacked bar chart (bvs)', () => {
    const url = buildSignedBarChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '10,20,30,40',
      stacked: true,
      chartSize: '300x300'
    });
    expect(url).toContain('cht=bvs');
  });

  test('should generate correct URL for horizontal stacked bar chart (bhs)', () => {
    const url = buildSignedBarChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '10,20,30',
      orientation: 'horizontal',
      stacked: true
    });
    expect(url).toContain('cht=bhs');
  });

  test('should include labels when provided', () => {
    const url = buildSignedBarChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '10,20,30',
      labels: 'Hello world'
    });
    expect(url).toContain('chl=Hello+world');
  });

  test('should include colors when provided', () => {
    const url = buildSignedBarChartUrl({
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '10,20,30',
      colors: 'FF0000|00FF00|0000FF'
    });
    expect(url).toContain('chco=FF0000%7C00FF00%7C0000FF');
  });

  test('HMAC signature should be deterministic', () => {
    const params = {
      accountId: testAccountId,
      secretKey: testSecretKey,
      data: '10,20,30',
      chartSize: '300x300'
    };
    const url1 = buildSignedBarChartUrl(params);
    const url2 = buildSignedBarChartUrl(params);
    expect(url1).toBe(url2);
  });

  test('Private Cloud URL should not include icac or ichm', () => {
    const url = buildPrivateCloudBarChartUrl({
      domain: 'https://private.example.com',
      data: '10,20,30'
    });
    expect(url).not.toContain('icac=');
    expect(url).not.toContain('ichm=');
  });
});

// ============================================================
// API Integration Tests - Enterprise Mode
// ============================================================

describeIfCredentials('Enterprise Mode - Bar Charts', () => {
  test('should return 200 for vertical grouped bar chart (bvg)', () => {
    const url = buildSignedBarChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '60,40',
      chartSize: '300x300'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for horizontal grouped bar chart (bhg)', () => {
    const url = buildSignedBarChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '10,30,40,50',
      orientation: 'horizontal',
      labels: 'Hello world',
      chartSize: '150x150'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for vertical stacked bar chart (bvs)', () => {
    const url = buildSignedBarChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '10,20,30,40',
      stacked: true
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for horizontal stacked bar chart (bhs)', () => {
    const url = buildSignedBarChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '10,20,30',
      orientation: 'horizontal',
      stacked: true
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 with custom colors', () => {
    const url = buildSignedBarChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '10,20,30',
      colors: 'FF0000|00FF00|0000FF'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 with labels', () => {
    const url = buildSignedBarChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '10,20,30,40',
      labels: 'Q1|Q2|Q3|Q4',
      chartSize: '400x300'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 403 for invalid signature', () => {
    const url = 'https://image-charts.com/chart?cht=bvs&chs=400x300&chd=a%3A10%2C20%2C30&icac=' + ACCOUNT_ID + '&ichm=invalid_signature';
    return fetchUrl(url).then((response) => {
      expect([400, 403]).toContain(response.statusCode);
    });
  }, 15000);
});

// ============================================================
// Private Cloud Mode Tests
// ============================================================

describeIfPrivateCloud('Private Cloud Mode - Bar Charts', () => {
  test('should return 200 for vertical grouped bar chart (bvg)', () => {
    const url = buildPrivateCloudBarChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '60,40',
      chartSize: '300x300'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for horizontal grouped bar chart (bhg)', () => {
    const url = buildPrivateCloudBarChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '10,30,40,50',
      orientation: 'horizontal',
      labels: 'Hello world',
      chartSize: '150x150'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for vertical stacked bar chart (bvs)', () => {
    const url = buildPrivateCloudBarChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '10,20,30,40',
      stacked: true
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\//);
    });
  }, 15000);

  test('should return 200 for horizontal stacked bar chart (bhs)', () => {
    const url = buildPrivateCloudBarChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '10,20,30',
      orientation: 'horizontal',
      stacked: true
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 with custom colors', () => {
    const url = buildPrivateCloudBarChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '10,20,30',
      colors: 'FF0000|00FF00|0000FF'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);

  test('should return 200 with labels', () => {
    const url = buildPrivateCloudBarChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '10,20,30,40',
      labels: 'Q1|Q2|Q3|Q4',
      chartSize: '400x300'
    });
    return fetchUrl(url).then((response) => {
      expect(response.statusCode).toBe(200);
    });
  }, 15000);
});

// ============================================================
// Performance Tests
// ============================================================

describeIfCredentials('Performance - Enterprise', () => {
  test('should respond within 5 seconds', () => {
    const startTime = Date.now();
    const url = buildSignedBarChartUrl({
      accountId: ACCOUNT_ID,
      secretKey: SECRET_KEY,
      data: '10,20,30,40,50'
    });
    return fetchUrl(url).then((response) => {
      const duration = Date.now() - startTime;
      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000);
    });
  }, 10000);
});

describeIfPrivateCloud('Performance - Private Cloud', () => {
  test('should respond within 5 seconds', () => {
    const startTime = Date.now();
    const url = buildPrivateCloudBarChartUrl({
      domain: PRIVATE_CLOUD_DOMAIN,
      data: '10,20,30,40,50'
    });
    return fetchUrl(url).then((response) => {
      const duration = Date.now() - startTime;
      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000);
    });
  }, 10000);
});
