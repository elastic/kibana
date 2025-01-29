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

  const user = {
    username: config.env.ELASTICSEARCH_USERNAME,
    password: config.env.ELASTICSEARCH_PASSWORD,
  };

  /*
  system_indices_superuser is a user created for testing purposes (an operator one) that does not have restrictions,
  that user is the one used on ESS and stateless environments to access internal indexes directly and does not exist on MKI environments. 
  */
  const authOverride = isServerless ? (isCloudServerless ? user : systemIndicesSuperuser) : user;

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
    refreshIndex: async (index: string) => {
      try {
        await client.indices.refresh({ index });
        return true;
      } catch (error) {
        return false;
      }
    },
    searchIndex: async (index) => {
      try {
        const response = await client.search({
          index,
          body: {
            query: {
              match_all: {},
            },
          },
        });

        return response.hits.hits.length;
      } catch (error) {
        return null;
      }
    },
    deleteDataStream: async (dataStreamName) => {
      try {
        await client.indices.deleteDataStream({
          name: dataStreamName,
        });

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    deleteIndex: async (index) => {
      try {
        await client.indices.delete({
          index,
        });

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    deleteDocuments: async (index: string) => {
      await client.deleteByQuery({
        index,
        body: {
          query: {
            match_all: {},
          },
        },
        conflicts: 'proceed',
        scroll_size: 10000,
        refresh: true,
      });
      return null;
    },
    createIndex: async ({ index: indexName, properties }) => {
      const result = await client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties,
          },
        },
      });
      return result;
    },
    createDocument: async ({ index: indexName, document }) => {
      const result = await client.index({
        index: indexName,
        body: document,
        refresh: 'wait_for',
      });

      return result;
    },
    deleteSecurityRulesFromKibana: async () => {
      await client.deleteByQuery({
        index: '.kibana_*',
        body: {
          query: {
            bool: {
              filter: [
                {
                  match: {
                    type: 'security-rule',
                  },
                },
              ],
            },
          },
        },
        conflicts: 'proceed',
        refresh: true,
      });
      return null;
    },
  });

  return Promise.resolve();
};
