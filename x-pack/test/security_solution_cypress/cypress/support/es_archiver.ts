/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import * as Url from 'url';
import { EsArchiver } from '@kbn/es-archiver';
import { createEsClientForTesting, KbnClient, systemIndicesSuperuser } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { CA_CERT_PATH } from '@kbn/dev-utils';

export const esArchiver = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): EsArchiver => {
  const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

  const isServerless = config.env.IS_SERVERLESS;
  const isCloudServerless = config.env.CLOUD_SERVERLESS;

  const serverlessCloudUser = {
    username: 'elastic',
    password: config.env.ELASTICSEARCH_PASSWORD,
  };

  let authOverride;
  if (isServerless) {
    authOverride = isCloudServerless ? serverlessCloudUser : systemIndicesSuperuser;
  }

  const client = createEsClientForTesting({
    esUrl: Url.format(config.env.ELASTICSEARCH_URL),
    // Use system indices user so tests can write to system indices
    authOverride,
  });

  const kibanaUrl = config.env.KIBANA_URL || config.env.BASE_URL;

  const kbnClient = new KbnClient({
    log,
    url: kibanaUrl as string,
    ...(config.env.ELASTICSEARCH_URL.includes('https')
      ? { certificateAuthorities: [Fs.readFileSync(CA_CERT_PATH)] }
      : {}),
  });

  const esArchiverInstance = new EsArchiver({
    log,
    client,
    kbnClient,
    baseDir: '../es_archives',
  });

  on('task', {
    esArchiverLoad: async ({ archiveName, ...options }) =>
      esArchiverInstance.load(archiveName, options),
    esArchiverUnload: async (archiveName) => esArchiverInstance.unload(archiveName),
  });

  return esArchiverInstance;
};
