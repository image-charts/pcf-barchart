
# @image-charts/pcf-barchart

[![npm version](https://img.shields.io/npm/v/%40image-charts/pcf-barchart.svg)](https://www.npmjs.com/package/@image-charts/pcf-barchart)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Generate signed [Image-Charts](https://image-charts.com) Bar Charts directly in Microsoft Power Apps Canvas Apps

## Quick Start

```bash
npm install @image-charts/pcf-barchart
```

Import `node_modules/@image-charts/pcf-barchart/solution/ImageChartsBarChart.zip` into Power Apps.

```powerapps-fx
BarChartGenerator.accountId = "YOUR_ACCOUNT_ID"
BarChartGenerator.secretKey = "YOUR_SECRET_KEY"
BarChartGenerator.data = "10,20,30,40"
BarChartGenerator.labels = "Q1,Q2,Q3,Q4"
```

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `accountId` | Text | No* | Enterprise Account ID |
| `secretKey` | Text | No* | Enterprise Secret Key |
| `privateCloudDomain` | Text | No* | Private Cloud domain |
| `data` | Text | **Yes** | Chart values (CSV or pipe-separated) |
| `labels` | Text | No | X-axis labels |
| `colors` | Text | No | Bar colors (pipe-separated hex) |
| `title` | Text | No | Chart title |
| `orientation` | Text | No | `vertical` (default) or `horizontal` |
| `chartSize` | Text | No | Size (`WIDTHxHEIGHT`) |
| `advancedOptions` | Text | No | Additional parameters |
| `showDebugUrl` | Boolean | No | Display generated URL |
| `signedUrl` | Text | Output | Generated URL |

## Documentation

[https://documentation.image-charts.com/integrations/power-apps/](https://documentation.image-charts.com/integrations/power-apps/)

## License

MIT
