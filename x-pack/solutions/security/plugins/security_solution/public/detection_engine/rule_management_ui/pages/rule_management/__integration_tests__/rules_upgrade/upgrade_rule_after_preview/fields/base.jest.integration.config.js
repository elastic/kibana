/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';

// Discover all test files
const allTestFiles = fs
  .readdirSync(__dirname, { recursive: true })
  .filter((f) => f.endsWith('.test.ts'));

/**
 * Distributes all field test files evenly using round-robin across available configs.
 */
function getTestsForConfig({ testsDirectory, groupNumber, totalGroups }) {
  const groupIndex = groupNumber - 1;

  const testFiles = allTestFiles.filter((file) => file.includes(testsDirectory));
  const testFilesForConfig = testFiles.filter((file, index) => index % totalGroups === groupIndex);

  console.log(
    `Rule Upgrade - Fields integration tests. ${testsDirectory}, config_${groupNumber}: Running ${testFilesForConfig.length} test files:`,
    testFilesForConfig
  );

  return testFilesForConfig;
}

/**
 * Base Jest configuration shared by all field test configs
 */
export function createFieldTestingConfig({ testsDirectory, groupNumber, totalGroups }) {
  const testFiles = getTestsForConfig({
    testsDirectory,
    groupNumber,
    totalGroups,
  });

  return {
    preset: '@kbn/test/jest_integration',
    rootDir: '../../../../../../../../../../../../../../..',
    roots: [
      '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_management_ui/pages/rule_management',
    ],
    testMatch: testFiles.map((file) => `**/${file}`),
    openHandlesTimeout: 0,
    forceExit: true,
  };
}
