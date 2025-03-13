/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IntegrationType,
  WorkchatIntegrationDefinition,
  WorkChatIntegration,
  IntegrationContext,
  getClientForExternalServer,
} from '@kbn/wci-common';

export const getCustomIntegrationDefinition = (): WorkchatIntegrationDefinition => {
  return {
    getType: () => IntegrationType.custom,
    createIntegration: async ({
      request,
      configuration,
    }: IntegrationContext): Promise<WorkChatIntegration> => {
      const client = await getClientForExternalServer({ serverUrl: configuration.url });
      return {
        type: IntegrationType.salesforce,
        client,
      };
    },
  };
};
