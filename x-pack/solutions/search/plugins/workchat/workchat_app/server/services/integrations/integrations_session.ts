/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationToolInputSchema } from '../../types';
import { IntegrationTool } from '../../types';
import { InternalIntegrationServices } from '@kbn/wci-common';
import { JsonSchemaObject } from '@n8n/json-schema-to-zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Integration } from './integration';

/*
    This class is used to manage the integrations session.
    It is responsible for connecting to the integrations (internal & external) and executing tools.
    It also provides a way to get all the tools from all the integrations.

For internal based integrations:

    At plugin start:
        - Integrations are initialized
        - MCP server is not created

    At Chat session start:
        - MCP server is created, with internal services (actions, elasticsearch) passed to it

    At Chat session end:
        - MCP server is stopped

For external (SSE) based integrations:

    At plugin start:
        - Integrations are initialized
        - MCP isn't connected

    At Chat session start:
        - MCP server is connected, passing in authentication token for the user
        - MCP server deals with own internal services and manages own API Keys (Example: API key to access elasticsearch)

*/
export class IntegrationsSession {
  static TOOL_NAME_SEPARATOR = '___';
  private clients: Record<string, Client>;
  private connected = false;

  constructor(public services: InternalIntegrationServices, public integrations: Integration[]) {}

  private async ensureConnected() {
    if (this.connected) {
      return;
    }

    this.clients = await this.integrations.reduce(async (accPromise, integration) => {
      const acc = await accPromise;
      try {
        acc[integration.id] = await integration.connect(this.services);
      } catch (e) {
        this.services.logger.warn(`Error connecting integration: ${integration.id}`);
      }
      return acc;
    }, Promise.resolve<Record<string, Client>>({}));

    this.connected = true;
  }

  async getAllTools(): Promise<IntegrationTool[]> {
    await this.ensureConnected();

    const toolCalls = await Promise.all(
      Object.keys(this.clients).map(async (clientId) => {
        try {
          const client = this.clients[clientId];
          const toolsResponse = await client.listTools();
          if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
            return toolsResponse.tools.map((tool) => ({
              name: `${clientId}${IntegrationsSession.TOOL_NAME_SEPARATOR}${tool.name}`,
              description: tool.description || '',
              inputSchema: (tool.inputSchema || {}) as JsonSchemaObject,
            }));
          }
          return [];
        } catch (err) {
          this.services.logger.warn(`Error fetching tools for client: ${clientId}`);
          return [];
        }
      })
    );

    return toolCalls.flat();
  }

  async executeTool(serverToolName: string, params: IntegrationToolInputSchema) {
    await this.ensureConnected();

    const [clientKey, toolName] = serverToolName.split(IntegrationsSession.TOOL_NAME_SEPARATOR);
    const client = this.clients[clientKey];
    if (!client) {
      throw new Error(`Client not found: ${clientKey}`);
    }
    return client.callTool({
      name: toolName,
      arguments: params,
    });
  }

  async disconnect() {
    if (!this.connected) {
      return;
    }

    await Promise.all(Object.values(this.clients).map((client) => client.close()));
    this.clients = {};
    this.connected = false;
  }
}
