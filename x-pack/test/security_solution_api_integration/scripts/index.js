/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { spawn } = require('child_process');

const [
  ,
  ,
  type,
  folder,
  projectType,
  environment,
  area = 'detections_response',
  licenseFolder = 'default_license',
  ...args
] = process.argv;

const configPath = `./test_suites/${area}/${licenseFolder}/${folder}/configs/${projectType}.config.ts`;

const command =
  type === 'server'
    ? '../../scripts/functional_tests_server.js'
    : '../../scripts/functional_test_runner';

let grepArgs = [];

if (type !== 'server') {
  switch (environment) {
    case 'serverlessEnv':
      grepArgs = ['--grep', '@serverless', '--grep', '@brokenInServerless', '--invert'];
      break;

    case 'essEnv':
      grepArgs = ['--grep', '@ess'];
      break;

    case 'qaEnv':
      grepArgs = ['--grep', '@serverless', '--grep', '@brokenInServerless|@skipInQA', '--invert'];
      break;

    default:
      console.error(`Unsupported environment: ${environment}`);
      process.exit(1);
  }
}

const child = spawn('node', [command, '--config', configPath, ...grepArgs, ...args], {
  stdio: 'inherit',
});

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
