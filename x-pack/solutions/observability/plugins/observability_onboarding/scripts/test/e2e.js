/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
const { times } = require('lodash');
const path = require('path');
const yargs = require('yargs');
const childProcess = require('child_process');
const { REPO_ROOT } = require('@kbn/repo-info');

const { argv } = yargs(process.argv.slice(2))
  .parserConfiguration({ 'unknown-options-as-args': true })
  .option('kibana-install-dir', {
    default: '',
    type: 'string',
    description: 'Path to the Kibana install directory',
  })
  .option('server', {
    default: false,
    type: 'boolean',
    description: 'Start Elasticsearch and Kibana',
  })
  .option('runner', {
    default: false,
    type: 'boolean',
    description:
      'Run all tests (an instance of Elasticsearch and kibana are needs to be available)',
  })
  .option('open', {
    default: false,
    type: 'boolean',
    description:
      'Open cypress dashboard (an instance of Elasticsearch and kibana are needs to be available)',
  })
  .option('times', {
    type: 'number',
    description: 'Repeat the test n number of times',
  })
  .option('bail', {
    default: false,
    type: 'boolean',
    description: 'stop tests after the first failure',
  })
  .help();

const e2eDir = path.join(__dirname, '../../e2e');

let ftrScript = 'functional_tests.js';
if (argv.server) {
  ftrScript = 'functional_tests_server.js';
} else if (argv.runner || argv.open) {
  ftrScript = 'functional_test_runner.js';
}

const cypressCliArgs = yargs(argv._).parserConfiguration({
  'boolean-negation': false,
}).argv;

if (cypressCliArgs.grep) {
  throw new Error('--grep is not supported. Please use --spec instead');
}

const ftrConfig = argv.open ? './ftr_config_open.ts' : './ftr_config_runner.ts';
const spawnArgs = [
  `${REPO_ROOT}/scripts/${ftrScript}`,
  `--config=${ftrConfig}`,
  `--kibana-install-dir=${argv.kibanaInstallDir}`,
  ...(argv.bail ? [`--bail`] : []),
];

function runTests() {
  console.log(`Running e2e tests: "node ${spawnArgs.join(' ')}"`);

  return childProcess.spawnSync('node', spawnArgs, {
    cwd: e2eDir,
    env: {
      ...process.env,
      CYPRESS_CLI_ARGS: JSON.stringify(cypressCliArgs),
    },
    encoding: 'utf8',
    stdio: 'inherit',
  });
}

const runCounter = { succeeded: 0, failed: 0, remaining: argv.times };
let exitStatus = 0;
times(argv.times ?? 1, () => {
  const child = runTests();
  if (child.status === 0) {
    runCounter.succeeded++;
  } else {
    exitStatus = child.status;
    runCounter.failed++;
  }

  runCounter.remaining--;

  if (argv.times > 1) {
    console.log(runCounter);
  }
});

process.exitCode = exitStatus;
console.log(`Quitting with exit code ${exitStatus}`);
