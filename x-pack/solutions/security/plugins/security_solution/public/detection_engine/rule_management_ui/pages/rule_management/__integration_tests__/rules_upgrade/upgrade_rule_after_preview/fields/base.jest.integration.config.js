/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

const fieldsDir = __dirname;

// Discover all test files in the fields directory
const allTestFiles = fs
  .readdirSync(fieldsDir)
  .filter((f) => f.endsWith('.test.ts'))
  .sort();

// Count config_* directories to determine total groups
const totalGroups = fs.readdirSync(fieldsDir).filter((dir) => {
  const fullPath = path.join(fieldsDir, dir);
  return fs.statSync(fullPath).isDirectory() && dir.startsWith('config_');
}).length;

/**
 * Discovers all field test files and distributes them using round-robin
 * across the available configs.
 */
function getTestsForConfig(configNumber) {
  const groupIndex = configNumber - 1;
  const configTestFiles = allTestFiles.filter((file, index) => index % totalGroups === groupIndex);

  console.log(
    `Rule Upgrade - Fields integration tests. config_${configNumber}: Running ${configTestFiles.length} test files:`,
    configTestFiles
  );

  return configTestFiles;
}

/**
 * Base Jest configuration shared by all field test configs
 */
export function createFieldTestingConfig(configNumber) {
  const testFiles = getTestsForConfig(configNumber);

  return {
    preset: '@kbn/test/jest_integration',
    rootDir: '../../../../../../../../../../../../../../..',
    roots: [
      '<rootDir>/x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_management_ui/pages/rule_management',
    ],
    testMatch: testFiles.map((file) => `**/fields/${file}`),
    openHandlesTimeout: 0,
    forceExit: true,
  };
}
