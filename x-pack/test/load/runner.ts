/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withProcRunner } from '@kbn/dev-utils';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import Fs from 'fs';
import { createFlagError } from '@kbn/dev-utils';
import { FtrProviderContext } from './../functional/ftr_provider_context';

const baseSimulationPath = 'src/test/scala/org/kibanaLoadTest/simulation';
const simulationPackage = 'org.kibanaLoadTest.simulation';
const simulationFIleExtension = '.scala';
const gatlingProjectRootPath: string =
  process.env.GATLING_PROJECT_PATH || resolve(REPO_ROOT, '../kibana-load-testing');
const simulationEntry: string = process.env.GATLING_SIMULATIONS || 'DemoJourney';

if (!Fs.existsSync(gatlingProjectRootPath)) {
  throw createFlagError(
    `Incorrect path to load testing project: '${gatlingProjectRootPath}'\n
  Clone 'elastic/kibana-load-testing' and set path using 'GATLING_PROJECT_PATH' env var`
  );
}

const dropEmptyLines = (s: string) => s.split(',').filter((i) => i.length > 0);
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
    await procs.run('mvn: clean compile', {
      cmd: 'mvn',
      args: [
        '-Dmaven.wagon.http.retryHandler.count=3',
        '-Dmaven.test.failure.ignore=true',
        '-q',
        'clean',
        'compile',
      ],
      cwd: gatlingProjectRootPath,
      env: {
        ...process.env,
      },
      wait: true,
    });
    for (const simulationClass of simulationClasses) {
      await procs.run('gatling: test', {
        cmd: 'mvn',
        args: [
          'gatling:test',
          '-q',
          `-Dgatling.simulationClass=${simulationPackage}.${simulationClass}`,
        ],
        cwd: gatlingProjectRootPath,
        env: {
          ...process.env,
        },
        wait: true,
      });
    }
  });
}
