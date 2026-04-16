/**
 * Unit Tests for BarChartGenerator PCF Component
 */

const crypto = require('crypto');

// Mock utility functions
function computeHmacSha256Sync(secretKey, message) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
}

function normalizeColors(colors) {
  if (!colors) return '';
  return colors.split('|').map(c => {
    const trimmed = c.trim();
    const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    return /^[0-9A-Fa-f]{6}$/.test(withoutHash) ? withoutHash.toUpperCase() : '';
  }).filter(c => c !== '').join('|');
}

function parseDataValues(data) {
  if (!data) return [];
  const trimmed = data.trim();
  const separator = trimmed.includes('|') ? '|' : ',';
  return trimmed.split(separator).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
}

function formatDataAwesome(values) {
  if (values.length === 0) return '';
  return 'a:' + values.join(',');
}

function parseLabels(labels) {
  if (!labels) return [];
  const trimmed = labels.trim();
  const separator = trimmed.includes('|') ? '|' : ',';
  return trimmed.split(separator).map(l => l.trim()).filter(l => l !== '');
}

function formatLabels(labels) {
  return labels.join('|');
}

function buildBarChartUrl(params) {
  const { accountId, secretKey, privateCloudDomain, data, labels, colors, title, orientation, chartSize } = params;
  const host = privateCloudDomain || 'image-charts.com';
  const chartType = orientation === 'horizontal' ? 'bhs' : 'bvs';
  const dataValues = parseDataValues(data);

  const queryParts = ['cht=' + chartType, 'chs=' + (chartSize || '400x300'), 'chd=' + formatDataAwesome(dataValues)];

  if (labels) {
    const labelArr = parseLabels(labels);
    if (labelArr.length > 0) queryParts.push('chl=' + formatLabels(labelArr));
  }
  if (colors) {
    const normalizedColors = normalizeColors(colors);
    if (normalizedColors) queryParts.push('chco=' + normalizedColors);
  }
  if (title) queryParts.push('chtt=' + title);
  if (accountId && !privateCloudDomain) queryParts.push('icac=' + accountId);

  const queryString = queryParts.join('&');

  if (accountId && secretKey && !privateCloudDomain) {
    const signature = computeHmacSha256Sync(secretKey, queryString);
    return 'https://' + host + '/chart?' + queryString + '&ichm=' + signature;
  }
  return 'https://' + host + '/chart?' + queryString;
}

// Tests
describe('Data Parsing', () => {
  test('should parse CSV data', () => {
    expect(parseDataValues('10,20,30')).toEqual([10, 20, 30]);
    expect(parseDataValues('10.5, 20.5, 30.5')).toEqual([10.5, 20.5, 30.5]);
  });

  test('should parse pipe-separated data', () => {
    expect(parseDataValues('10|20|30')).toEqual([10, 20, 30]);
  });

  test('should handle empty/invalid data', () => {
    expect(parseDataValues('')).toEqual([]);
    expect(parseDataValues(null)).toEqual([]);
    expect(parseDataValues('a,b,c')).toEqual([]);
  });

  test('should format data in Awesome format', () => {
    expect(formatDataAwesome([10, 20, 30])).toBe('a:10,20,30');
    expect(formatDataAwesome([])).toBe('');
  });
});

describe('Label Parsing', () => {
  test('should parse CSV labels', () => {
    expect(parseLabels('Q1,Q2,Q3,Q4')).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  test('should parse pipe-separated labels', () => {
    expect(parseLabels('Q1|Q2|Q3|Q4')).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  test('should format labels as pipe-separated', () => {
    expect(formatLabels(['Q1', 'Q2', 'Q3'])).toBe('Q1|Q2|Q3');
  });
});

describe('Color Normalization', () => {
  test('should normalize pipe-separated colors', () => {
    expect(normalizeColors('ff0000|00ff00|0000ff')).toBe('FF0000|00FF00|0000FF');
    expect(normalizeColors('#FF0000|#00FF00')).toBe('FF0000|00FF00');
  });

  test('should filter invalid colors', () => {
    expect(normalizeColors('ff0000|invalid|0000ff')).toBe('FF0000|0000FF');
  });
});

describe('Bar Chart URL Building', () => {
  test('should build vertical bar chart URL', () => {
    const url = buildBarChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '10,20,30,40',
      labels: 'Q1,Q2,Q3,Q4',
      chartSize: '400x300'
    });

    expect(url).toContain('cht=bvs');
    expect(url).toContain('chd=a:10,20,30,40');
    expect(url).toContain('chl=Q1|Q2|Q3|Q4');
    expect(url).toContain('ichm=');
  });

  test('should build horizontal bar chart URL', () => {
    const url = buildBarChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '10,20,30',
      orientation: 'horizontal'
    });

    expect(url).toContain('cht=bhs');
  });

  test('should include colors', () => {
    const url = buildBarChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '10,20,30',
      colors: 'FF0000|00FF00|0000FF'
    });

    expect(url).toContain('chco=FF0000|00FF00|0000FF');
  });

  test('should include title', () => {
    const url = buildBarChartUrl({
      accountId: 'test_account',
      secretKey: 'test_secret',
      data: '10,20,30',
      title: 'Sales Report'
    });

    expect(url).toContain('chtt=Sales Report');
  });

  test('should build Private Cloud URL without signature', () => {
    const url = buildBarChartUrl({
      privateCloudDomain: 'charts.mycompany.com',
      data: '10,20,30'
    });

    expect(url).toContain('https://charts.mycompany.com/chart');
    expect(url).not.toContain('ichm=');
    expect(url).not.toContain('icac=');
  });
});
