/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RESERVED_DIR_JEST_INTEGRATION_TESTS } from '../../../src/dev/constants';

export default {
  rootDir: '../../',
  roots: [
    '<rootDir>/plugins',
    '<rootDir>/server',
    '<rootDir>/common',
    '<rootDir>/test_utils/jest/integration_tests',
  ],
  collectCoverageFrom: [
    'plugins/**/*.js',
    'common/**/*.js',
    'server/**/*.js',
  ],
  moduleNameMapper: {
    '^ui/(.*)': '<rootDir>**/public/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/dev/jest/mocks/file_mock.js',
    '\\.(css|less|scss)$': '<rootDir>/../src/dev/jest/mocks/style_mock.js',
  },
  setupFiles: [
    '<rootDir>/../src/dev/jest/setup/babel_polyfill.js',
    '<rootDir>/../src/dev/jest/setup/polyfills.js',
    '<rootDir>/../src/dev/jest/setup/enzyme.js',
  ],
  coverageDirectory: '<rootDir>/../target/jest-coverage',
  coverageReporters: [
    'html',
  ],
  moduleFileExtensions: [
    'js',
    'json',
    'ts',
    'tsx',
  ],
  modulePathIgnorePatterns: [
    '__fixtures__/',
    'target/',
  ],
  testMatch: [
    '**/*.test.{js,ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/packages/kbn-ui-framework/(dist|doc_site|generator-kui)/',
    '<rootDir>/packages/kbn-pm/dist/',
    `${RESERVED_DIR_JEST_INTEGRATION_TESTS}/`,
  ],
  transform: {
    '^.+\\.(js|tsx?)$': '<rootDir>/../src/dev/jest/babel_transform.js',
    '^.+\\.txt?$': 'jest-raw-loader',
    '^.+\\.html?$': 'jest-raw-loader',
  },
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\].+\\.js$',
    'packages/kbn-pm/dist/index.js'
  ],
  snapshotSerializers: [
    '<rootDir>/../node_modules/enzyme-to-json/serializer',
  ],
  reporters: [
    'default',
    '<rootDir>/../src/dev/jest/junit_reporter.js',
  ],
};
