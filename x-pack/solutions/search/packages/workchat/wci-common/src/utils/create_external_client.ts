/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';
import type { IntegrationClient } from '../types';

export const getClientForExternalServer = async ({
  serverUrl,
  clientName = 'unknown',
}: {
  serverUrl: string;
  clientName?: string;
}): Promise<IntegrationClient> => {
  let _disconnect: () => Promise<void> | undefined;
  let connected = false;

  return {
    connect: async () => {
      if (connected) {
        throw new Error('Client already connected');
      }
      connected = true;

      const transport = new SSEClientTransport(new URL(serverUrl));

      const client = new Client(
        {
          name: clientName,
          version: '1.0.0',
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {},
          },
        }
      );

      await client.connect(transport);

      _disconnect = async () => {
        await client.close();
      };

      return client;
    },
    disconnect: async () => {
      await _disconnect?.();
      connected = false;
    },
  };
};
