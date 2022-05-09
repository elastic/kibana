/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withProcRunner } from '@kbn/dev-utils';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import Fs from 'fs';
import { createFlagError } from '@kbn/dev-utils';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { FtrProviderContext } from '../functional/ftr_provider_context';

const baseSimulationPath = 'src/test/scala/org/kibanaLoadTest/simulation';
const simulationPackage = 'org.kibanaLoadTest.simulation';
const simulationFIleExtension = '.scala';
const gatlingProjectRootPath: string =
  process.env.GATLING_PROJECT_PATH || resolve(REPO_ROOT, '../kibana-load-testing');
const puppeteerProjectRootPath: string = resolve(gatlingProjectRootPath, 'puppeteer');
const simulationEntry: string = process.env.GATLING_SIMULATIONS || 'branch.DemoJourney';

if (!Fs.existsSync(gatlingProjectRootPath)) {
  throw createFlagError(
    `Incorrect path to load testing project: '${gatlingProjectRootPath}'\n
  Clone 'elastic/kibana-load-testing' and set path using 'GATLING_PROJECT_PATH' env var`
  );
}

const dropEmptyLines = (s: string) =>
  s
    .split(',')
    .filter((i) => i.length > 0)
    .map((i) => (i.includes('.') ? i : `branch.${i}`));
const simulationClasses = dropEmptyLines(simulationEntry);
const simulationsRootPath = resolve(gatlingProjectRootPath, baseSimulationPath);

simulationClasses.map((className) => {
  const simulationClassPath = resolve(
    simulationsRootPath,
    className.replace('.', '/') + simulationFIleExtension
  );
  if (!Fs.existsSync(simulationClassPath)) {
    throw createFlagError(`Simulation class is not found: '${simulationClassPath}'`);
  }
});

/**
 *
 * GatlingTestRunner is used to run load simulation against local Kibana instance
 *
 * Use GATLING_SIMULATIONS to pass comma-separated class names
 * Use GATLING_PROJECT_PATH to override path to 'kibana-load-testing' project
 */
export async function GatlingTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');

  await withProcRunner(log, async (procs) => {
    for (let i = 0; i < simulationClasses.length; i++) {
      await procs.run('node build/index.js', {
        cmd: 'node',
        args: [
          'build/index.js',
          `--simulation='${simulationClasses[i]}'`,
          `--config='./config.json'`,
        ],
        cwd: puppeteerProjectRootPath,
        env: {
          ...process.env,
        },
        wait: true,
      });
      await procs.run('gatling: test', {
        cmd: 'mvn',
        args: [
          'gatling:test',
          '-q',
          `-Dgatling.simulationClass=${simulationPackage}.${simulationClasses[i]}`,
        ],
        cwd: gatlingProjectRootPath,
        env: {
          ...process.env,
        },
        wait: true,
      });
      // wait a minute between simulations, skip for the last one
      if (i < simulationClasses.length - 1) {
        await setTimeoutAsync(60 * 1000);
      }
    }
  });
}
