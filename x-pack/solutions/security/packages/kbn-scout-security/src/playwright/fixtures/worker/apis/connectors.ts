/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { retryApiCall, pollUntilDocumentIndexed, pollUntilAvailable } from './utils';

// API endpoint constants
const CONNECTORS_API = '/api/actions/connector';
const CONNECTORS_LIST_API = '/api/actions/connectors';

// Connector payload types
export interface ConnectorConfig {
  connector_type_id: string;
  name: string;
  secrets: Record<string, string>;
  config?: Record<string, string>;
}

// Predefined connector configurations
export const AZURE_OPENAI_CONNECTOR_CONFIG: ConnectorConfig = {
  connector_type_id: '.gen-ai',
  name: 'Azure OpenAI Scout test connector',
  secrets: {
    apiKey: '123',
  },
  config: {
    apiUrl:
      'https://goodurl.com/openai/deployments/good-gpt4o/chat/completions?api-version=2024-02-15-preview',
    apiProvider: 'Azure OpenAI',
  },
};

export const BEDROCK_CONNECTOR_CONFIG: ConnectorConfig = {
  connector_type_id: '.bedrock',
  name: 'Bedrock Scout test connector',
  secrets: {
    accessKey: '123',
    secret: '123',
  },
  config: {
    apiUrl: 'https://bedrock.com',
  },
};

export const OPENAI_CONNECTOR_CONFIG: ConnectorConfig = {
  connector_type_id: '.gen-ai',
  name: 'OpenAI Scout test connector',
  secrets: {
    apiKey: '123',
  },
  config: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiProvider: 'OpenAI',
  },
};

export const SLACK_CONNECTOR_CONFIG: ConnectorConfig = {
  connector_type_id: '.slack',
  name: 'Slack Scout test connector',
  secrets: {
    webhookUrl: 'http://localhost:123',
  },
};

export interface ConnectorsApiService {
  create: (config: ConnectorConfig) => Promise<Connector>;
  createAzureOpenAI: (name?: string) => Promise<Connector>;
  createBedrock: (name?: string) => Promise<Connector>;
  createOpenAI: (name?: string) => Promise<Connector>;
  createSlack: (name?: string) => Promise<Connector>;
  deleteAll: () => Promise<void>;
}

export const getConnectorsApiService = ({
  kbnClient,
  log,
  scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): ConnectorsApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace?.id}` : '';

  return {
    create: async (config: ConnectorConfig) => {
      return measurePerformanceAsync(log, 'security.connectors.create', async () => {
        // Step 1: Create connector with retry logic
        const createdConnector = await retryApiCall(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'POST',
              path: `${basePath}${CONNECTORS_API}`,
              body: config,
            });

            return response.data;
          },
          { maxAttempts: 3, delayMs: 2000 },
          log
        );

        // Step 2: Poll to verify connector is retrievable
        const pollResult = await pollUntilDocumentIndexed(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'GET',
              path: `${basePath}${CONNECTORS_API}/${createdConnector.id}`,
            });
            return response.data;
          },
          {},
          log
        );

        return pollResult.data;
      });
    },

    createAzureOpenAI: async (name?: string) => {
      return measurePerformanceAsync(log, 'security.connectors.createAzureOpenAI', async () => {
        const config = {
          ...AZURE_OPENAI_CONNECTOR_CONFIG,
          ...(name && { name }),
        };

        log.debug(`[CONNECTORS API] Creating Azure OpenAI connector`);
        log.debug(`[CONNECTORS API] Request path: ${basePath}${CONNECTORS_API}`);
        log.debug(`[CONNECTORS API] Request body: ${JSON.stringify(config, null, 2)}`);

        // Step 1: Create connector with retry
        const createdConnector = await retryApiCall(
          async () => {
            try {
              const response = await kbnClient.request<Connector>({
                method: 'POST',
                path: `${basePath}${CONNECTORS_API}`,
                body: config,
              });

              log.debug(`[CONNECTORS API] Azure OpenAI connector created successfully`);
              log.debug(`[CONNECTORS API] Response status: ${response.status}`);
              log.debug(
                `[CONNECTORS API] Response data: ${JSON.stringify(response.data, null, 2)}`
              );

              return response.data;
            } catch (error) {
              log.error(`[CONNECTORS API] Failed to create Azure OpenAI connector: ${error}`);
              log.error(`[CONNECTORS API] Error details: ${JSON.stringify(error, null, 2)}`);
              throw error;
            }
          },
          { maxAttempts: 3, delayMs: 2000 },
          log
        );

        // Step 2: Poll to verify connector is retrievable
        log.debug(
          `[CONNECTORS API] Polling to verify Azure OpenAI connector ${createdConnector.id} is indexed`
        );
        const pollResult = await pollUntilDocumentIndexed(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'GET',
              path: `${basePath}${CONNECTORS_API}/${createdConnector.id}`,
            });
            return response.data;
          },
          {},
          log
        );

        log.debug(
          `[CONNECTORS API] Azure OpenAI connector verified as indexed after ${pollResult.attempts} attempts (${pollResult.totalWaitMs}ms)`
        );

        return pollResult.data;
      });
    },

    createBedrock: async (name?: string) => {
      return measurePerformanceAsync(log, 'security.connectors.createBedrock', async () => {
        const config = {
          ...BEDROCK_CONNECTOR_CONFIG,
          ...(name && { name }),
        };

        log.debug(`[CONNECTORS API] Creating Bedrock connector`);

        // Step 1: Create connector with retry
        const createdConnector = await retryApiCall(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'POST',
              path: `${basePath}${CONNECTORS_API}`,
              body: config,
            });
            log.debug(`[CONNECTORS API] Bedrock connector created: ${response.data.id}`);
            return response.data;
          },
          { maxAttempts: 3, delayMs: 2000 },
          log
        );

        // Step 2: Poll to verify connector is retrievable
        const pollResult = await pollUntilDocumentIndexed(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'GET',
              path: `${basePath}${CONNECTORS_API}/${createdConnector.id}`,
            });
            return response.data;
          },
          {},
          log
        );

        log.debug(
          `[CONNECTORS API] Bedrock connector verified after ${pollResult.attempts} attempts`
        );
        return pollResult.data;
      });
    },

    createOpenAI: async (name?: string) => {
      return measurePerformanceAsync(log, 'security.connectors.createOpenAI', async () => {
        const config = {
          ...OPENAI_CONNECTOR_CONFIG,
          ...(name && { name }),
        };

        log.debug(`[CONNECTORS API] Creating OpenAI connector`);

        // Step 1: Create connector with retry
        const createdConnector = await retryApiCall(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'POST',
              path: `${basePath}${CONNECTORS_API}`,
              body: config,
            });
            log.debug(`[CONNECTORS API] OpenAI connector created: ${response.data.id}`);
            return response.data;
          },
          { maxAttempts: 3, delayMs: 2000 },
          log
        );

        // Step 2: Poll to verify connector is retrievable
        const pollResult = await pollUntilDocumentIndexed(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'GET',
              path: `${basePath}${CONNECTORS_API}/${createdConnector.id}`,
            });
            return response.data;
          },
          {},
          log
        );

        log.debug(
          `[CONNECTORS API] OpenAI connector verified after ${pollResult.attempts} attempts`
        );
        return pollResult.data;
      });
    },

    createSlack: async (name?: string) => {
      return measurePerformanceAsync(log, 'security.connectors.createSlack', async () => {
        const config = {
          ...SLACK_CONNECTOR_CONFIG,
          ...(name && { name }),
        };

        log.debug(`[CONNECTORS API] Creating Slack connector`);

        // Step 1: Create connector with retry
        const createdConnector = await retryApiCall(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'POST',
              path: `${basePath}${CONNECTORS_API}`,
              body: config,
            });
            log.debug(`[CONNECTORS API] Slack connector created: ${response.data.id}`);
            return response.data;
          },
          { maxAttempts: 3, delayMs: 2000 },
          log
        );

        // Step 2: Poll to verify connector is retrievable
        const pollResult = await pollUntilDocumentIndexed(
          async () => {
            const response = await kbnClient.request<Connector>({
              method: 'GET',
              path: `${basePath}${CONNECTORS_API}/${createdConnector.id}`,
            });
            return response.data;
          },
          {},
          log
        );

        log.debug(
          `[CONNECTORS API] Slack connector verified after ${pollResult.attempts} attempts`
        );
        return pollResult.data;
      });
    },

    deleteAll: async () => {
      await measurePerformanceAsync(log, 'security.connectors.deleteAll', async () => {
        try {
          log.debug(`[CONNECTORS API] Fetching all connectors to delete`);
          log.debug(`[CONNECTORS API] Request path: ${basePath}${CONNECTORS_LIST_API}`);

          // Step 1: Get all connectors
          const response = await kbnClient.request<Connector[]>({
            method: 'GET',
            path: `${basePath}${CONNECTORS_LIST_API}`,
          });

          const connectors = response.data || [];
          log.debug(`[CONNECTORS API] Found ${connectors.length} connectors to delete`);

          if (connectors.length === 0) {
            log.debug(`[CONNECTORS API] No connectors to delete`);
            return;
          }

          // Step 2: Delete each connector
          await Promise.all(
            connectors.map((connector) => {
              log.debug(`[CONNECTORS API] Deleting connector: ${connector.id} (${connector.name})`);
              return kbnClient.request({
                method: 'DELETE',
                path: `${basePath}${CONNECTORS_API}/${connector.id}`,
              });
            })
          );

          log.debug(`[CONNECTORS API] Connectors deleted, polling to verify...`);

          // Step 3: Poll to verify all connectors are deleted
          await pollUntilAvailable(
            async () => {
              const checkResponse = await kbnClient.request<Connector[]>({
                method: 'GET',
                path: `${basePath}${CONNECTORS_LIST_API}`,
              });

              const remainingConnectors = checkResponse.data || [];
              const count = remainingConnectors.length;

              log.debug(`[CONNECTORS API] Found ${count} connectors after deletion`);

              // Filter out preconfigured connectors (they can't be deleted)
              const nonPreconfigured = remainingConnectors.filter((c) => !c.isPreconfigured);
              const nonPreconfiguredCount = nonPreconfigured.length;

              if (nonPreconfiguredCount > 0) {
                log.debug(
                  `[CONNECTORS API] Still found ${nonPreconfiguredCount} non-preconfigured connectors`
                );
                throw new Error(`Still found ${nonPreconfiguredCount} connectors after deletion`);
              }

              return { deleted: true };
            },
            {},
            log
          );

          log.debug(`[CONNECTORS API] All connectors verified as deleted`);
        } catch (error: unknown) {
          // Ignore 404 errors - it means the connectors API is not available or no connectors exist
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((error as any)?.response?.status !== 404) {
            log.error(`[CONNECTORS API] Failed to delete connectors: ${error}`);
            log.error(`[CONNECTORS API] Error details: ${JSON.stringify(error, null, 2)}`);
            throw error;
          } else {
            log.debug(`[CONNECTORS API] No connectors found to delete (404)`);
          }
        }
      });
    },
  };
};
