/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import consumeState from './consume_state';
import { ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import chalk from 'chalk';
import { esTestConfig, kbnTestConfig } from '@kbn/test';
import { TriggersActionsPageProvider } from '../../functional_with_es_ssl/page_objects/triggers_actions_ui_page';
import { services } from '../services';

const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});
const INTEGRATION_TEST_ROOT = process.env.WORKSPACE || resolve(REPO_ROOT, '../integration-test');
const stateFilePath = resolve(INTEGRATION_TEST_ROOT, 'qa/envvars.sh');

const testsFolder = '../apps';
const prepend = (testFile) => require.resolve(`${testsFolder}/${testFile}`);

export default async ({ readConfigFile }) => {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../../functional/config'));
  const externalConf = consumeState(resolve(__dirname, stateFilePath));
  process.env.stack_functional_integration = true;
  logAll(log);

  const settings = {
    ...xpackFunctionalConfig.getAll(),
    services,
    pageObjects: {
      triggersActionsUI: TriggersActionsPageProvider,
      ...xpackFunctionalConfig.get('pageObjects'),
    },
    apps: {
      ...xpackFunctionalConfig.get('apps'),
      triggersConnectors: {
        pathname: '/app/management/insightsAndAlerting/triggersActions/connectors',
      },
    },
    junit: {
      reportName: `Stack Functional Integration Tests - ${externalConf.VM}`,
    },
    servers: servers(),
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [...xpackFunctionalConfig.get('kbnTestServer.serverArgs')],
    },
    testFiles: tests(externalConf.TESTS_LIST).map(prepend).map(logTest),
    // testFiles: ['alerts'].map(prepend).map(logTest),
    // If we need to do things like disable animations, we can do it in configure_start_kibana.sh, in the provisioner...which lives in the integration-test private repo
    uiSettings: {},
    security: { disableTestUser: true },
    // choose where screenshots should be saved
    screenshots: {
      directory: resolve(INTEGRATION_TEST_ROOT, 'test/screenshots'),
    },
  };
  return settings;
};

const split = (splitter) => (x) => x.split(splitter);

function tests(externalTestsList) {
  return split(' ')(externalTestsList);
}

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
  log.info(`### Testing: '${highLight(truncate(testPath))}'`);
  return testPath;
}
function logAll(log) {
  log.info(`REPO_ROOT = ${REPO_ROOT}`);
  log.info(`WORKSPACE in config file ${process.env.WORKSPACE}`);
  log.info(`INTEGRATION_TEST_ROOT = ${INTEGRATION_TEST_ROOT}`);
  log.info(`stateFilePath = ${stateFilePath}`);
  log.info(`servers data: ${JSON.stringify(servers(), null, 2)}`);
}
function servers() {
  return {
    kibana: kbnTestConfig.getUrlParts(),
    elasticsearch: esTestConfig.getUrlParts(),
  };
}
