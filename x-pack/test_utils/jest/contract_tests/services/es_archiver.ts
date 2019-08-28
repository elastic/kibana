/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import elasticsearch from 'elasticsearch';
import { ToolingLog } from '@kbn/dev-utils';
import { resolve } from 'path';
import { EsArchiver } from '../../../../../src/es_archiver/es_archiver';

interface ESServerConfig {
  hosts: string[];
  username: string;
  password: string;
}

export const getEsArchiver = (options: {
  kibanaUrl: string;
  logLevel?: 'silent' | 'error' | 'warning' | 'info' | 'debug' | 'verbose';
  dir: string;
}) => {
  options.logLevel = options.logLevel || 'info';

  let esConfig: ESServerConfig | undefined;
  if (process.env.__JEST__ESServer) {
    esConfig = JSON.parse(process.env.__JEST__ESServer);
  }

  if (!esConfig) {
    throw new Error(
      'getEsArchiver was called before ES was started or else Jest contract tests are not configured correctly.'
    );
  }

  const log = new ToolingLog({
    level: options.logLevel,
    writeTo: process.stdout,
  });

  const client = new elasticsearch.Client({
    hosts: esConfig.hosts,
    httpAuth: `${esConfig.username}:${esConfig.password}`,
    log: options.logLevel,
  });

  const esArchiver = new EsArchiver({
    log,
    client,
    dataDir: resolve(options.dir),
    kibanaUrl: `http://${esConfig.username}:${esConfig.password}@${
      options.kibanaUrl.split('://')[1]
    }`,
  });

  return esArchiver;
};
