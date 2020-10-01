/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import buildState from './build_state';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import chalk from 'chalk';
import { esTestConfig, kbnTestConfig } from '@kbn/test';

const reportName = 'Stack Functional Integration Tests';
const testsFolder = '../apps';
const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});
log.info(`WORKSPACE in config file ${process.env.WORKSPACE}`);
const stateFilePath = process.env.WORKSPACE
  ? `${process.env.WORKSPACE}/qa/envvars.sh`
  : `${REPO_ROOT}/../integration-test/qa/envvars.sh`;

const prepend = (testFile) => require.resolve(`${testsFolder}/${testFile}`);

export default async ({ readConfigFile }) => {
  const defaultConfigs = await readConfigFile(require.resolve('../../functional/config'));
  const { tests, ...provisionedConfigs } = buildState(resolve(__dirname, stateFilePath));
  process.env.stack_functional_integration = true;

  const servers = {
    kibana: kbnTestConfig.getUrlParts(),
    elasticsearch: esTestConfig.getUrlParts(),
  };
  log.info(`servers data: ${JSON.stringify(servers)}`);
  const settings = {
    ...defaultConfigs.getAll(),
    junit: {
      reportName: `${reportName} - ${provisionedConfigs.VM}`,
    },
    servers,
    testFiles: tests.map(prepend).map(logTest),
    // testFiles: ['monitoring'].map(prepend).map(logTest),
    // If we need to do things like disable animations, we can do it in configure_start_kibana.sh, in the provisioner...which lives in the integration-test private repo
    uiSettings: {},
    security: { disableTestUser: true },
    // choose where screenshots should be saved
    screenshots: {
      directory: resolve(`${REPO_ROOT}/../integration-test`, 'test/screenshots'),
    },
    // choose where esArchiver should load archives from
    esArchiver: {
      directory: resolve(`${REPO_ROOT}/../integration-test`, 'test/es_archives'),
    },
  };
  return settings;
};

// Returns index 1 from the resulting array-like.
const splitRight = (re) => (testPath) => re.exec(testPath)[1];

function truncate(testPath) {
  const dropKibanaPath = splitRight(/^.+kibana[\\/](.*$)/gm);
  return dropKibanaPath(testPath);
}
function highLight(testPath) {
  const dropTestsPath = splitRight(/^.+apps[\\/](.*)[\\/]/gm);
  const cleaned = dropTestsPath(testPath);
  const colored = chalk.greenBright.bold(cleaned);
  return testPath.replace(cleaned, colored);
}
function logTest(testPath) {
  log.info(`Testing: '${highLight(truncate(testPath))}'`);
  return testPath;
}
