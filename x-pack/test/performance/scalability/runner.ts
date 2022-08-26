/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withProcRunner } from '@kbn/dev-proc-runner';
import { REPO_ROOT } from '@kbn/utils';
import fs from 'fs';
import path from 'path';
import { createFlagError } from '@kbn/dev-cli-errors';
import { FtrProviderContext } from '../ftr_provider_context';

const gatlingProjectRootPath: string =
  process.env.GATLING_PROJECT_PATH || path.resolve(REPO_ROOT, '../kibana-load-testing');
const journeyJsonPath = process.env.SCALABILITY_JOURNEY_PATH;

/**
 * ScalabilityTestRunner is used to run load simulation against local Kibana instance
 * Use SCALABILITY_JOURNEY_PATH to set path to scalability json file
 * Use GATLING_PROJECT_PATH to set root path to kibana-load-testing repo
 */
export async function ScalabilityTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');

  if (!fs.existsSync(gatlingProjectRootPath)) {
    throw createFlagError(
      `Incorrect path to load testing project: '${gatlingProjectRootPath}'\n
    Clone 'elastic/kibana-load-testing' and set path using 'GATLING_PROJECT_PATH' env var`
    );
  }

  if (!journeyJsonPath) {
    throw createFlagError(
      `Set path to scalability journey json using 'SCALABILITY_JOURNEY_PATH' env var`
    );
  }
  if (!fs.existsSync(journeyJsonPath) || path.extname(journeyJsonPath) !== '.json') {
    throw createFlagError(
      `Path to scalability journey json is invalid or non-json file: '${journeyJsonPath}'`
    );
  }

  log.info(`Running scalability test with json file: '${journeyJsonPath}'`);

  await withProcRunner(log, async (procs) => {
    await procs.run('gatling: test', {
      cmd: 'mvn',
      args: [
        'gatling:test',
        '-q',
        '-Dgatling.simulationClass=org.kibanaLoadTest.simulation.generic.GenericJourney',
        `-DjourneyPath=${journeyJsonPath}`,
      ],
      cwd: gatlingProjectRootPath,
      env: {
        ...process.env,
      },
      wait: true,
    });
  });
}
