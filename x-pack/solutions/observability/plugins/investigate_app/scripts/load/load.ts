/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import { run } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
// @ts-expect-error
import { options } from './cli';
import { getServiceUrls } from '../common/get_service_urls';

async function loadFixtureData({
  filePath,
  esUrl,
  kibanaUrl,
  log,
}: {
  filePath: string;
  esUrl: string;
  kibanaUrl: string;
  log: ToolingLog;
}) {
  const directory = `${__dirname}/fixtures`;
  const directories = getDirectories({ filePath: `${__dirname}/fixtures`, log });
  directories.forEach((dir) => {
    spawnSync(
      'node',
      [
        'scripts/es_archiver',
        'load',
        `${directory}/${dir}`,
        '--es-url',
        esUrl,
        '--kibana-url',
        kibanaUrl,
      ],
      {
        stdio: 'inherit',
      }
    );
  });
}

function getDirectories({ filePath, log }: { filePath: string; log: ToolingLog }): string[] {
  try {
    const items = fs.readdirSync(filePath);
    const folders = items.filter((item) => {
      const itemPath = path.join(filePath, item);
      return fs.statSync(itemPath).isDirectory();
    });
    return folders;
  } catch (error) {
    log.error(`Error reading directory: ${error.message}`);
    return [];
  }
}

function loadData() {
  yargs(process.argv.slice(2))
    .command('*', 'Load RCA data', async () => {
      const argv = await options(yargs);
      run(
        async ({ log }) => {
          const serviceUrls = await getServiceUrls({
            log,
            elasticsearch: argv.elasticsearch,
            kibana: argv.kibana,
          });
          loadFixtureData({
            filePath: argv.filePath,
            esUrl: serviceUrls.esUrl,
            kibanaUrl: serviceUrls.kibanaUrl,
            log,
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

loadData();
