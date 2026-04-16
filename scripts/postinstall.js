#!/usr/bin/env node
/**
 * Post-install script for @image-charts/pcf-barchart
 */

const path = require('path');
const fs = require('fs');

const packageDir = path.dirname(__dirname);
const solutionPath = path.join(packageDir, 'solution', 'ImageChartsBarChart.zip');

console.log(`
===============================================================================
  Image-Charts Bar Chart Generator for Power Apps
===============================================================================

The PCF solution has been installed successfully!

NEXT STEPS:

1. MANUAL IMPORT (Recommended for Production):
   - Go to https://make.powerapps.com
   - Select your environment
   - Navigate to Solutions > Import
   - Select the solution file:
     ${solutionPath}

2. DIRECT PUSH (For Development):
   - First, authenticate with your Power Platform environment:
     pac auth create --url https://your-org.crm.dynamics.com

   - Then push the component:
     npx @image-charts/pcf-barchart push --publisher-prefix ic

DOCUMENTATION:
  https://documentation.image-charts.com/integrations/power-apps/

SUPPORT:
  https://github.com/image-charts/pcf-barchart/issues

===============================================================================
`);

if (fs.existsSync(solutionPath)) {
  console.log('Solution file verified at:', solutionPath);
} else {
  console.warn('WARNING: Solution file not found. You may need to build it first.');
  console.log('Run: npm run build');
}
