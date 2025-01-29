/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

const yargs = require('yargs');
const childProcess = require('child_process');
const { REPO_ROOT } = require('@kbn/repo-info');

const { argv } = yargs(process.argv.slice(2))
  .option('server', {
    default: false,
    type: 'boolean',
    description: 'Start Elasticsearch and kibana',
  })
  .option('runner', {
    default: false,
    type: 'boolean',
    description:
      'Run all tests (an instance of Elasticsearch and kibana are needs to be available)',
  })
  .option('pauseOnError', {
    default: false,
    type: 'boolean',
    description: 'Pause the Synthetics Test Runner on error',
  })
  .option('kibana-install-dir', {
    default: '',
    type: 'string',
    description: 'Path to the Kibana install directory',
  })
  .option('headless', {
    default: true,
    type: 'boolean',
    description: 'Start in headless mode',
  })
  .option('grep', {
    default: undefined,
    type: 'string',
    description: 'run only journeys with a name or tags that matches the glob',
  })
  .help();

const { server, runner, open, kibanaInstallDir, headless, grep, pauseOnError } = argv;

let ftrScript = 'functional_tests';
if (server) {
  ftrScript = 'functional_tests_server';
} else if (runner || open) {
  ftrScript = 'functional_test_runner';
}

function executeSyntheticsRunner(dirPath, config = './synthetics_run.ts') {
  console.log(`Running ${ftrScript} in ${dirPath}`);
  const grepArg = grep ? '--grep ' + grep : '';
  const kbnInstallDir = `--kibana-install-dir '${kibanaInstallDir}'`;
  const options = { cwd: dirPath, stdio: 'inherit' };

  if (server) {
    childProcess.execSync(
      `node ${REPO_ROOT}/scripts/${ftrScript} --config ${config}  ${kbnInstallDir}`,
      options
    );
  } else if (runner) {
    childProcess.execSync(
      `node ${REPO_ROOT}/scripts/${ftrScript} --config ${config} ${kbnInstallDir}  --headless ${headless} --bail ${pauseOnError} ${grepArg}`,
      options
    );
  } else {
    childProcess.execSync(
      `node ${REPO_ROOT}/scripts/${ftrScript} --config ${config}  ${kbnInstallDir} ${grepArg}`,
      options
    );
  }
}

module.exports = {
  executeSyntheticsRunner,
};
