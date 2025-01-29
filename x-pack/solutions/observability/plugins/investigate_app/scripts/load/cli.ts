/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Argv } from 'yargs';
import {
  elasticsearchOption,
  kibanaOption,
} from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/cli';

export async function options(y: Argv) {
  const argv = y
    .option('kibana', kibanaOption)
    .option('elasticsearch', elasticsearchOption)
    .option('logLevel', {
      describe: 'Log level',
      default: 'info',
    }).argv;

  return argv;
}
