/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';
import buildState from './build_state';
import { ToolingLog } from '@kbn/dev-utils';

const reportName = 'Stack Functional Integration Tests';
const testsFolder = '../test/functional/apps';
const stateFilePath = '../../../../../integration-test/qa/envvars.sh';
const prepend = testFile => require.resolve(`${testsFolder}/${testFile}`);
const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

export default async ({ readConfigFile }) => {
  const confs = await readConfigFile(require.resolve('./config.server.js'));
  const { servers, apps } = confs.getAll();
  const defaultConfigs = await readConfigFile(require.resolve('../../functional/config'));
  const { tests, ...provisionedConfigs } = buildState(resolve(__dirname, stateFilePath));

  return {
    ...defaultConfigs.getAll(),
    junit: {
      reportName: `${reportName} - ${provisionedConfigs.VM}`,
    },
    servers,
    apps,
    stackFunctionalIntegrationTests: {
      envObj: provisionedConfigs,
    },
    testFiles: tests.map(logTest).map(prepend),
    // testFiles: ['sampleData', 'reporting', 'management'].map(logTest).map(prepend),
  };
}
function logTest(x) {
  log.info(`### Testing: '${x}' app`);
  return x;
}
