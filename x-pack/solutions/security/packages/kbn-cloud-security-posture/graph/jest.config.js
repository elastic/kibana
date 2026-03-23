/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  roots: ['<rootDir>/x-pack/solutions/security/packages/kbn-cloud-security-posture/graph'],
  rootDir: '../../../../../..',
  transform: {
    '^.+\\.(js|tsx?)$':
      '<rootDir>/x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/.storybook/babel_with_emotion.ts',
  },
  setupFiles: ['jest-canvas-mock'],
  setupFilesAfterEnv: [
    '<rootDir>/x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/setup_tests.ts',
  ],
  moduleNameMapper: {
    // use the same mock that kbn-date-range-picker's own test suite uses.
    '^react-day-picker$':
      '<rootDir>/src/platform/packages/shared/shared-ux/datetime/kbn-date-range-picker/calendar/__mocks__/react-day-picker.tsx',
  },
};
