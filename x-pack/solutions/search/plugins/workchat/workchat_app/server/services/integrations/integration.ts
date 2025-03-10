/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IntegrationPlugin } from '@kbn/wci-common';

export class Integration {
  mcpServer: McpServer;

  constructor(
    public id: string,
    public typeInstance: IntegrationPlugin,
    public configuration: Record<string, any>
  ) {
    this.mcpServer = typeInstance.mcpServer(configuration);
  }
}
