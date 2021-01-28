/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withProcRunner } from '@kbn/dev-utils';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { FtrProviderContext } from './../functional/ftr_provider_context';

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
    const simulationPackage = 'org.kibanaLoadTest.simulation';
    const gatlingProjectRootPath: string =
      process.env.GATLING_PROJECT_PATH || resolve(REPO_ROOT, '../kibana-load-testing');
    const simulations: string = process.env.GATLING_SIMULATIONS || 'DemoJourney';
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
    for (const simulationClass of simulations.split(',').filter((i) => i.length > 0)) {
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
