/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory';
import { Client } from '@modelcontextprotocol/sdk/client/index';
import type { IntegrationClient } from '../types';

/**
 * Returns a {@link IntegrationClient} that will run the provided server in memory
 * and connect to it.
 */
export const getClientForInternalServer = async ({
  server,
  clientName = 'unknown',
}: {
  server: McpServer;
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

      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({
        name: clientName,
        version: '1.0.0',
      });

      await server.connect(clientTransport);
      await client.connect(serverTransport);

      _disconnect = async () => {
        await client.close();
        await server.close();
      };

      return client;
    },
    disconnect: async () => {
      await _disconnect?.();
      connected = false;
    },
  };
};
