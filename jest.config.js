module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  coverageDirectory: 'coverage',
  // Only collect coverage from JS test utilities, not TypeScript PCF components
  collectCoverageFrom: [
    'shared/**/*.js',
    '!**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  moduleFileExtensions: ['js', 'json'],
  testMatch: [
    '**/test.js',
    '**/test.integration.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/out/',
    '/Solutions/'
  ],
  reporters: ['default']
};
