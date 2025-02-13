/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import { run } from '@kbn/dev-cli-runner';
import yargs from 'yargs';
import { getServiceUrls } from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/get_service_urls';
import { options } from './cli';

async function archiveAllRelevantData({ filePath, esUrl }: { filePath: string; esUrl: string }) {
  spawnSync(
    'node',
    ['scripts/es_archiver', 'save', `${filePath}/alerts`, '.internal.alerts-*', '--es-url', esUrl],
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

archiveData();
