/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const TEST_DIRECTORIES = [
  '__tests__',
  '__test__',
  '__jest__',
  '__fixtures__',
  '__mocks__',
  'fixtures',
  'mock',
  'mocks',
  'test',
  'test_utils',
  'test_utilities',
  'test_helpers',
  'test-utils',
  'test-utilities',
  'test-helpers',
];

const TEST_FILE_PATTERNS = [
  '*.mock.{js,ts,tsx}',
  '*.test.{js,ts,tsx}',
  '*.test.helpers.{js,ts,tsx}',
  '*.stub.{js,ts,tsx}',
  'mock.{js,ts,tsx}',
  '_stubs.{js,ts,tsx}',
  '{testHelpers,test_helper,test_utils}.{js,ts,tsx}',
];

module.exports = {
  root: false,

  extends: ['../../../../../.eslintrc.js'],

  overrides: [
    {
      files: [
        ...TEST_DIRECTORIES.map((dir) => `**/${dir}/**/*.{js,ts,tsx}`),
        ...TEST_FILE_PATTERNS.map((pattern) => `**/${pattern}`),
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            name: 'enzyme',
            message: 'Please use @testing-library/react instead',
          },
        ],
      },
    },
  ],
};
