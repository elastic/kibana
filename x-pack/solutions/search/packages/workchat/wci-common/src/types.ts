/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { IntegrationTypes } from "./constants";
import type { ElasticsearchClient, Logger } from "@kbn/core/server";

export interface InternalIntegrationServices {
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
}

export interface IntegrationPlugin {
  mcpServer: (configuration: Record<string, any>, services: InternalIntegrationServices) => McpServer; 
  name: IntegrationTypes;
}

export type IntegrationConfiguration = Record<string, any>;