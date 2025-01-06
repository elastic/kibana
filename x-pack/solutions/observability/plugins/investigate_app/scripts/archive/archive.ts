/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { spawnSync } from 'child_process';
import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
// @ts-expect-error
import { options } from './cli';
import { getServiceUrls } from '../common/get_service_urls';

async function archiveAllRelevantData({
  filePath,
  kibanaUrl,
  esUrl,
}: {
  filePath: string;
  kibanaUrl: string;
  esUrl: string;
}) {
  spawnSync(
    'node',
    [
      'scripts/es_archiver',
      'save',
      `${filePath}/alerts`,
      '.internal.alerts-observability.*',
      '--es-url',
      esUrl,
    ],
    {
      stdio: 'inherit',
    }
  );
}

function archiveData() {
  yargs(process.argv.slice(2))
    .command('*', 'Archive RCA data', async () => {
      const argv = await options(yargs);
      run(
        async ({ log }) => {
          const serviceUrls = await getServiceUrls({
            log,
            elasticsearch: argv.elasticsearch,
            kibana: argv.kibana,
          });
          await archiveAllRelevantData({
            kibanaUrl: serviceUrls.kibanaUrl,
            esUrl: serviceUrls.esUrl,
            filePath: argv.filePath,
          });
        },
        {
          log: {
            defaultLevel: argv.logLevel as any,
          },
          flags: {
            allowUnexpected: true,
          },
        }
      );
    })
    .parse();
}

async function getAPMIndexPattern({
  kibanaUrl,
}: {
  kibanaUrl: string;
}): Promise<Record<string, string>> {
  const response = await axios.get(`${kibanaUrl}/internal/apm/settings/apm-indices`, {
    headers: {
      'kbn-xsrf': 'foo',
      'x-elastic-internal-origin': 'observability-ai-assistant',
    },
  });
  const apmIndices = response.data;
  return apmIndices;
}

archiveData();
