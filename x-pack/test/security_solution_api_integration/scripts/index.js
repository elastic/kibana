/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { spawn } = require('child_process');

const [, , type, area, licenseFolder, domain, projectType, environment, ...args] = process.argv;

const configPath = `./test_suites/${area}/${domain}/${licenseFolder}/configs/${projectType}.config.ts`;

const command =
  type === 'server'
    ? '../../scripts/functional_tests_server.js'
    : '../../scripts/functional_test_runner';

let grepArgs = [];

if (type !== 'server') {
  switch (environment) {
    case 'serverlessEnv':
      grepArgs = ['--grep', '/^(?!.*@skipInServerless).*@serverless.*/'];
      break;

    case 'essEnv':
      grepArgs = ['--grep', '/^(?!.*@skipInEss).*@ess.*/'];
      break;

    case 'qaPeriodicEnv':
      grepArgs = ['--grep', '/^(?!.*@skipInServerless|.*@skipInServerlessMKI).*@serverless.*/'];
      break;

    case 'qaEnv':
      grepArgs = ['--grep', '/^(?!.*@skipInServerless|.*@skipInServerlessMKI).*@serverlessQA.*/'];
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
