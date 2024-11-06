/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { systemIndicesSuperuser } from '@kbn/test';
import { createEsClient } from '@kbn/security-solution-plugin/scripts/endpoint/common/stack_services';

export const esClient = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
): Promise<void> => {
  const isServerless = config.env.IS_SERVERLESS;
  const isCloudServerless = config.env.CLOUD_SERVERLESS;

  const serverlessCloudUser = {
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
  };

  let authOverride;
  if (isServerless) {
    authOverride = isCloudServerless ? serverlessCloudUser : systemIndicesSuperuser;
  }
  const client = createEsClient({
    url: config.env.ELASTICSEARCH_URL,
    username: authOverride?.username,
    password: authOverride?.password,
  });

  on('task', {
    putMapping: async (index: string) => {
      await client.indices.putMapping({
        index,
        body: {
          dynamic: true,
        },
      });
      return null;
    },
    bulkInsert: async (body) => {
      await client.bulk({
        refresh: true,
        body,
      });
      return null;
    },
  });

  return Promise.resolve();
};
