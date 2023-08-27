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

  const client = createEsClientForTesting({
    esUrl: Url.format(config.env.ELASTICSEARCH_URL),
    // Use system indices user so tests can write to system indices
    authOverride: !isServerless ? systemIndicesSuperuser : undefined,
  });

  const kbnClient = new KbnClient({
    log,
    url: config.env.CYPRESS_BASE_URL as string,
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
    esArchiverLoad: async (archiveName) => esArchiverInstance.load(archiveName),
    esArchiverUnload: async (archiveName) => esArchiverInstance.unload(archiveName),
    esArchiverResetKibana: async () => esArchiverInstance.emptyKibanaIndex(),
  });

  return esArchiverInstance;
};
