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

interface ClientOptions {
  url: string;
  username: string;
  password: string;
}

function createKibanaUrlWithAuth({ url, username, password }: ClientOptions) {
  const clientUrl = new URL(url);
  clientUrl.username = username;
  clientUrl.password = password;

  return clientUrl.toString();
}

export const esArchiver = (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions): void => {
  const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

  const isServerless = config.env.IS_SERVERLESS;
  const isCloudServerless = config.env.CLOUD_SERVERLESS;

  const serverlessCloudUser = {
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
  };

  let authOverride = systemIndicesSuperuser;
  if (isServerless) {
    authOverride = isCloudServerless ? serverlessCloudUser : systemIndicesSuperuser;
  }

  const client = createEsClientForTesting({
    esUrl: Url.format(config.env.ELASTICSEARCH_URL),
    // Use system indices user so tests can write to system indices
    authOverride,
  });

  const kibanaUrl = config.env.KIBANA_URL || config.env.BASE_URL;

  const kibanaUrlWithAuth = createKibanaUrlWithAuth({
    url: kibanaUrl,
    ...authOverride,
  });

  const kbnClient = new KbnClient({
    log,
    url: kibanaUrlWithAuth,
    ...(config.env.ELASTICSEARCH_URL.includes('https')
      ? { certificateAuthorities: [Fs.readFileSync(CA_CERT_PATH)] }
      : {}),
  });

  const esArchiverFactory = (baseDir: string) =>
    new EsArchiver({
      log,
      client,
      kbnClient,
      baseDir,
    });
  const cypressEsArchiverInstance = esArchiverFactory('../es_archives');
  const ftrEsArchiverInstance = esArchiverFactory(
    '../../../../../solutions/security/test/fixtures/es_archives/security_solution'
  );
  const platformEsArchiverInstance = esArchiverFactory(
    '../../../../../platform/test/fixtures/es_archives'
  );

  on('task', {
    esArchiverLoad: async ({ archiveName, type = 'cypress', ...options }) => {
      if (type === 'cypress') {
        return cypressEsArchiverInstance.load(archiveName, options);
      } else if (type === 'ftr') {
        return ftrEsArchiverInstance.load(archiveName, options);
      } else if (type === 'platform') {
        return platformEsArchiverInstance.load(archiveName, options);
      } else {
        throw new Error(
          `Unable to load the specified archive: ${JSON.stringify({ archiveName, type, options })}`
        );
      }
    },
    esArchiverUnload: async ({ archiveName, type = 'cypress' }) => {
      if (type === 'cypress') {
        return cypressEsArchiverInstance.unload(archiveName);
      } else if (type === 'ftr') {
        return ftrEsArchiverInstance.unload(archiveName);
      } else if (type === 'platform') {
        return platformEsArchiverInstance.unload(archiveName);
      } else {
        throw new Error('It is not possible to unload the archive.');
      }
    },
  });
};
