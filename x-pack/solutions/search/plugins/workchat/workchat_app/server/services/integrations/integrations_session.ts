/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { JsonSchemaObject } from '@n8n/json-schema-to-zod';
import type { Logger } from '@kbn/core/server';
import { IntegrationToolInputSchema, IntegrationTool } from './types';
import type { IntegrationWithMeta } from './types';

const TOOL_NAME_SEPARATOR = '___';

/**
 * This class is used to manage the integrations session.
 * It is responsible for connecting to the integrations (internal & external) and executing tools.
 * It also provides a way to get all the tools from all the integrations.
 *
 * ## Internal-based Integrations:
 *
 * - **At plugin start:**
 *   - Integrations are initialized.
 *   - MCP server is not created.
 *
 * - **At Chat session start:**
 *   - MCP server is created, with internal services (actions, Elasticsearch) passed to it.
 *
 * - **At Chat session end:**
 *   - MCP server is stopped.
 *
 * ## External (SSE)-based Integrations:
 *
 * - **At plugin start:**
 *   - Integrations are initialized.
 *   - MCP isn't connected.
 *
 * - **At Chat session start:**
 *   - MCP server is connected, passing in an authentication token for the user.
 *   - MCP server manages its own internal services and API keys
 *     (e.g., API key to access Elasticsearch).
 */
export class IntegrationsSession {
  private readonly integrations: IntegrationWithMeta[];
  private readonly logger: Logger;

  private sessionState: Record<string, IntegrationState> = {};
  private connected = false;

  constructor({ integrations, logger }: { integrations: IntegrationWithMeta[]; logger: Logger }) {
    this.integrations = integrations;
    this.logger = logger;
  }

  private async ensureConnected() {
    if (this.connected) {
      return;
    }

    this.sessionState = await this.integrations.reduce(async (accPromise, integration) => {
      const acc = await accPromise;
      try {
        const integClient = integration.client;
        acc[integration.id] = {
          client: await integClient.connect(),
          disconnect: integClient.disconnect,
        };
      } catch (e) {
        this.logger.warn(`Error connecting integration: ${integration.id}`);
      }
      return acc;
    }, Promise.resolve<Record<string, IntegrationState>>({}));

    this.connected = true;
  }

  async getAllTools(): Promise<IntegrationTool[]> {
    await this.ensureConnected();

    const toolCalls = await Promise.all(
      Object.keys(this.sessionState).map(async (clientId) => {
        try {
          const client = this.sessionState[clientId].client;
          const toolsResponse = await client.listTools();
          if (toolsResponse && toolsResponse.tools && Array.isArray(toolsResponse.tools)) {
            return toolsResponse.tools.map((tool) => ({
              name: `${clientId}${TOOL_NAME_SEPARATOR}${tool.name}`,
              description: tool.description || '',
              inputSchema: (tool.inputSchema || {}) as JsonSchemaObject,
            }));
          }
          return [];
        } catch (err) {
          this.logger.warn(`Error fetching tools for client: ${clientId}`);
          return [];
        }
      })
    );

    return toolCalls.flat();
  }

  async executeTool(serverToolName: string, params: IntegrationToolInputSchema) {
    await this.ensureConnected();

    const [clientKey, toolName] = serverToolName.split(TOOL_NAME_SEPARATOR);
    const integration = this.sessionState[clientKey];
    if (!integration) {
      throw new Error(`Client not found: ${clientKey}`);
    }
    return integration.client.callTool({
      name: toolName,
      arguments: params,
    });
  }

  async disconnect() {
    if (!this.connected) {
      return;
    }

    await Promise.all(Object.values(this.sessionState).map((session) => session.disconnect()));
    this.sessionState = {};
    this.connected = false;
  }
}

interface IntegrationState {
  client: Client;
  disconnect: () => Promise<void>;
}
