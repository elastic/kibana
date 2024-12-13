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
      '<rootDir>/x-pack/packages/kbn-cloud-security-posture/storybook/config/babel_with_emotion.ts',
  },
  setupFiles: ['jest-canvas-mock'],
  setupFilesAfterEnv: [
    '<rootDir>/x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/setup_tests.ts',
  ],
};
