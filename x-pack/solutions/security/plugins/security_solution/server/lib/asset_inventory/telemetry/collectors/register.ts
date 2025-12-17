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
import type { CoreStart, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../../plugin_contract';
import { assetInventoryUsageSchema } from '../schema';
import { getEntityStats } from './entities_stats_collector';
import { getEntitiesTypeStats } from './entities_type_stats_collector';
import { getAssetCriticalityStats } from './asset_criticality_stats_collector';
import { getEntitySourceStats } from './entity_source_stats_collector';
import { getEntityStoreStats } from './entity_store_stats_collector';
import { getAssetInventoryCloudConnectorUsageStats } from './asset_inventory_cloud_connector_usage_stats_collector';
import { getAssetInventoryInstallationStats } from './asset_inventory_installation_stats_collector';
import type { AssetInventoryUsage, AssetInventoryUsageCollectorType } from '../type';
import { ENTITY_INDEX } from '../helper';

export function registerAssetInventoryUsageCollector(
  logger: Logger,
  coreServices: Promise<
    [CoreStart, SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart]
  >,
  usageCollection?: UsageCollectionSetup
): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered
  if (!usageCollection) {
    return;
  }

  // Create usage collector
  const assetInventoryUsageCollector = usageCollection.makeUsageCollector<AssetInventoryUsage>({
    type: 'asset_inventory',
    isReady: async () => {
      await coreServices;
      return true;
    },
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      const awaitPromiseSafe = async <T>(
        taskName: AssetInventoryUsageCollectorType,
        promise: Promise<T>
      ) => {
        try {
          const val = await promise;
          logger.info(`Asset Inventory telemetry: ${taskName} payload was sent successfully`);
          return val;
        } catch (error) {
          logger.error(`${taskName} task failed: ${error.message}`);
          logger.error(error.stack);
          return error;
        }
      };

      const esClient = collectorFetchContext.esClient;
      const soClient = collectorFetchContext.soClient;

      const [
        entitiesStats,
        entitiesTypeStats,
        entityStoreStats,
        entitySourceStats,
        assetCriticalityStats,
        assetInventoryCloudConnectorUsageStats,
        assetInventoryInstallationStats,
      ] = await Promise.all([
        awaitPromiseSafe('Entities', getEntityStats(esClient, ENTITY_INDEX, logger)),
        awaitPromiseSafe('Entities Type', getEntitiesTypeStats(esClient, logger)),
        awaitPromiseSafe('Entity Store', getEntityStoreStats(esClient, logger)),
        awaitPromiseSafe('Entity Source', getEntitySourceStats(esClient, logger)),
        awaitPromiseSafe('Asset Criticality', getAssetCriticalityStats(esClient, logger)),
        awaitPromiseSafe(
          'Asset Inventory Cloud Connector Usage',
          getAssetInventoryCloudConnectorUsageStats(soClient, coreServices, logger)
        ),
        awaitPromiseSafe(
          'Asset Inventory Installation',
          getAssetInventoryInstallationStats(esClient, soClient, coreServices, logger)
        ),
      ]);
      return {
        entities: entitiesStats,
        entities_type_stats: entitiesTypeStats,
        entity_store_stats: entityStoreStats,
        entity_source_stats: entitySourceStats,
        asset_criticality_stats: assetCriticalityStats,
        asset_inventory_cloud_connector_usage_stats: assetInventoryCloudConnectorUsageStats,
        asset_inventory_installation_stats: assetInventoryInstallationStats,
      };
    },
    schema: assetInventoryUsageSchema,
  });

  // Register usage collector
  usageCollection.registerCollector(assetInventoryUsageCollector);
}
