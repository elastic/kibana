/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CollectorFetchContext,
  UsageCollectionSetup,
} from '@kbn/usage-collection-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { EngineDescriptor } from '../../domain/definitions/saved_objects/engine_descriptor/constants';
import { EngineDescriptorTypeName } from '../../domain/definitions/saved_objects/engine_descriptor/types';
import { getEntityStoreStatus } from '../../domain/asset_manager';
import { ENTITY_STORE_STATUS } from '../../domain/constants';
import { entityStoreStatusSchema, type EntityStoreStatusUsage } from './schema';

export const registerEntityStoreStatusCollector = (
  logger: Logger,
  usageCollection?: UsageCollectionSetup
): void => {
  if (!usageCollection) {
    return;
  }

  const collector = usageCollection.makeUsageCollector<EntityStoreStatusUsage>({
    type: 'entity_store_status',
    isReady: () => true,
    schema: entityStoreStatusSchema,
    fetch: async ({ soClient }: CollectorFetchContext) => {
      try {
        const { saved_objects: engines } = await soClient.find<EngineDescriptor>({
          type: EngineDescriptorTypeName,
          perPage: 1000,
          namespaces: ['*'],
        });

        const engineAttributes = engines.map((v) => v.attributes);

        return {
          status: getEntityStoreStatus(engineAttributes),
          engines: engineAttributes.map(getEntityStoreStatusUsage),
        };
      } catch (error) {
        logger.error(`Failed to fetch entity store status telemetry: ${error.message}`);
        return { status: ENTITY_STORE_STATUS.NOT_INSTALLED, engines: [] };
      }
    },
  });

  usageCollection.registerCollector(collector);
};

const getEntityStoreStatusUsage = ({
  type,
  status,
  error,
  versionState,
  logExtractionState: {
    paginationTimestamp,
    paginationId,
    lastExecutionTimestamp,
    ...logExtractionState
  },
}: EngineDescriptor) => ({
  type,
  status,
  error,
  versionState,
  logExtractionState,
});
