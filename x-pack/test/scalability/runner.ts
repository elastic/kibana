/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withProcRunner } from '@kbn/dev-proc-runner';
import path from 'path';
import { FtrProviderContext } from './ftr_provider_context';

/**
 * ScalabilityTestRunner is used to run load simulation against local Kibana instance
 * scalabilityJsonPath defines path to the file, parsed and executed by Gatling runner
 * gatlingProjectRootPath defines root path to the kibana-load-testing repo
 */
export async function ScalabilityTestRunner(
  { getService }: FtrProviderContext,
  scalabilityJsonPath: string,
  gatlingProjectRootPath: string
) {
  const log = getService('log');
  const gatlingReportBaseDir = path.parse(scalabilityJsonPath).name;

  log.info(`Running scalability test with json file: '${scalabilityJsonPath}'`);

  await withProcRunner(log, async (procs) => {
    await procs.run('gatling: test', {
      cmd: 'mvn',
      args: [
        'gatling:test',
        '-q',
        `-Dgatling.core.outputDirectoryBaseName=${gatlingReportBaseDir}`,
        '-Dgatling.simulationClass=org.kibanaLoadTest.simulation.generic.GenericJourney',
        `-DjourneyPath=${scalabilityJsonPath}`,
      ],
      cwd: gatlingProjectRootPath,
      env: {
        ...process.env,
      },
      wait: true,
    });
  });
}
