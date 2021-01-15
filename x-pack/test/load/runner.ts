/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { withProcRunner } from '@kbn/dev-utils';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { FtrProviderContext } from './../functional/ftr_provider_context';

export async function GatlingTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');
  const gatlingProjectRootPath = resolve(REPO_ROOT, '../kibana-load-testing');

  await withProcRunner(log, async (procs) => {
    await procs.run('gatling', {
      cmd: 'mvn',
      args: [
        'clean',
        '-q',
        '-Dmaven.test.failure.ignore=true',
        'compile',
        'gatling:test',
        '-q',
        '-Dgatling.simulationClass=org.kibanaLoadTest.simulation.DemoJourney',
      ],
      cwd: gatlingProjectRootPath,
      env: {
        ...process.env,
      },
      wait: true,
    });
  });
}
