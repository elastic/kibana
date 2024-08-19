/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@playwright/test';
import Fs from 'fs';
import * as Url from 'url';
import { EsArchiver } from '@kbn/es-archiver';
import { createEsClientForTesting, KbnClient, systemIndicesSuperuser } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { CA_CERT_PATH } from '@kbn/dev-utils';

export const test = base.extend({
  esArchiver: async ({}, use) => {
    const log = new ToolingLog({ level: 'verbose', writeTo: process.stdout });

    const isServerless = process.env.IS_SERVERLESS === 'true';
    const isCloudServerless = process.env.CLOUD_SERVERLESS === 'true';

    const serverlessCloudUser = {
      username: process.env.ELASTICSEARCH_USERNAME ?? '',
      password: process.env.ELASTICSEARCH_PASSWORD ?? '',
    };

    if (isServerless && (!serverlessCloudUser.username || !serverlessCloudUser.password)) {
      throw new Error(
        'ELASTICSEARCH_USERNAME and ELASTICSEARCH_PASSWORD must be defined for serverless configuration'
      );
    }

    let authOverride;
    if (isServerless) {
      authOverride = isCloudServerless ? serverlessCloudUser : systemIndicesSuperuser;
    }

    const esUrl = process.env.ELASTICSEARCH_URL;
    if (!esUrl) {
      throw new Error('ELASTICSEARCH_URL environment variable is not set');
    }

    const client = createEsClientForTesting({
      esUrl: Url.format(new URL(esUrl)), // Ensure esUrl is a valid URL
      authOverride,
    });

    const kibanaUrl = process.env.KIBANA_URL || process.env.BASE_URL;

    const kbnClient = new KbnClient({
      log,
      url: kibanaUrl as string,
      ...(esUrl.includes('https')
        ? { certificateAuthorities: [Fs.readFileSync(CA_CERT_PATH)] }
        : {}),
    });

    const esArchiverInstance = new EsArchiver({
      log,
      client,
      kbnClient,
      baseDir: './es_archives',
    });

    await use(esArchiverInstance);
  },
});
