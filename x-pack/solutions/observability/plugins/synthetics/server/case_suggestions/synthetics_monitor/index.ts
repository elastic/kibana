/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SuggestionDefinitionServer } from '@kbn/observability-case-suggestion-registry-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import { getSyntheticsMonitorByServiceName } from './tool_handlers';

export const getSyntheticsMonitorSuggestionType = (dependencies: {
  savedObjectClient: SavedObjectsClientContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  share: SharePluginStart;
}): SuggestionDefinitionServer => {
  return {
    suggestionId: 'synthetic_monitor',
    displayName: 'Synthetic Monitor',
    description: 'Suggests synthetic monitors based on the provided query',
    availableTools: {
      getSyntheticsMonitorByServiceName: {
        description: 'Suggest synthetics monitor matching the same service.',
        schema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Name of the service being investigated',
            },
          },
        },
      },
    },
    toolHandlers: {
      getSyntheticsMonitorByServiceName: async ({ serviceName }: { serviceName: string }) => {
        return getSyntheticsMonitorByServiceName({
          savedObjectsClient: dependencies.savedObjectClient,
          encryptedSavedObjectsClient: dependencies.encryptedSavedObjectsClient,
          share: dependencies.share,
          serviceName,
        });
      },
    },
  } as const;
};
