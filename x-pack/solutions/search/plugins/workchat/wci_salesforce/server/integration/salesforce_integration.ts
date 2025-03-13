/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import {
  IntegrationType,
  WorkchatIntegrationDefinition,
  WorkChatIntegration,
  IntegrationContext,
  getClientForInternalServer,
} from '@kbn/wci-common';
import { createMcpServer } from './mcp_server';

export const getSalesforceIntegrationDefinition = ({
  core,
  logger,
}: {
  core: CoreSetup;
  logger: Logger;
}): WorkchatIntegrationDefinition => {
  return {
    getType: () => IntegrationType.salesforce,
    createIntegration: async ({
      request,
      configuration,
    }: IntegrationContext): Promise<WorkChatIntegration> => {
      const [coreStart] = await core.getStartServices();
      const elasticsearchClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

      const mcpServer = createMcpServer({ configuration, elasticsearchClient, logger });
      const client = await getClientForInternalServer({ server: mcpServer });

      return {
        type: IntegrationType.salesforce,
        client,
      };
    },
  };
};
