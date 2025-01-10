/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { format, parse } from 'url';
import * as inquirer from 'inquirer';
import * as fs from 'fs';
import { Argv } from 'yargs';
import { readKibanaConfig } from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/read_kibana_config';

const config = readKibanaConfig();

export const kibanaOption = {
  describe: 'Where Kibana is running',
  string: true as const,
  default: process.env.KIBANA_HOST || 'http://localhost:5601',
};

export const elasticsearchOption = {
  alias: 'es',
  describe: 'Where Elasticsearch is running',
  string: true as const,
  default: format({
    ...parse(config['elasticsearch.hosts']),
    auth: `${config['elasticsearch.username']}:${config['elasticsearch.password']}`,
  }),
};

function getISOStringWithoutMicroseconds(): string {
  const now = new Date();
  const isoString = now.toISOString();
  return isoString.split('.')[0] + 'Z';
}

export async function options(y: Argv) {
  const argv = y
    .option('filePath', {
      string: true as const,
      describe: 'file path to store the archived data',
      default: `./.rca/archives/${getISOStringWithoutMicroseconds()}`,
    })
    .option('kibana', kibanaOption)
    .option('elasticsearch', elasticsearchOption)
    .option('logLevel', {
      describe: 'Log level',
      default: 'info',
    }).argv;

  if (
    fs.existsSync(`${argv.filePath}/data.json.gz`) ||
    fs.existsSync(`${argv.filePath}/mappings.json`)
  ) {
    const { confirmOverwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmOverwrite',
        message: `Archived data already exists at path: ${argv.filePath}. Do you want to overwrite it?`,
        default: false,
      },
    ]);

    if (!confirmOverwrite) {
      process.exit(1);
    }
  }

  return argv;
}
