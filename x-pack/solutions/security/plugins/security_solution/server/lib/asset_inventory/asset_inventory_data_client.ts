/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, IScopedClusterClient } from '@kbn/core/server';

import type { GetEntityStoreStatusResponse } from '../../../common/api/entity_analytics/entity_store/status.gen';
import type { ExperimentalFeatures } from '../../../common';
import type { SecuritySolutionApiRequestHandlerContext } from '../..';
import type { getEntityStorePrivileges } from '../entity_analytics/entity_store/utils/get_entity_store_privileges';

interface AssetInventoryClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  experimentalFeatures: ExperimentalFeatures;
}

interface TransformMetadata {
  documents_processed?: number;
  trigger_count?: number;
}

const ASSET_INVENTORY_STATUS: Record<string, string> = {
  DISABLED: 'disabled',
  INITIALIZING: 'initializing',
  INSUFFICIENT_PRIVILEGES: 'insufficient_privileges',
  EMPTY: 'empty',
  READY: 'ready',
};

// AssetInventoryDataClient is responsible for managing the asset inventory,
// including initializing and cleaning up resources such as Elasticsearch ingest pipelines.
export class AssetInventoryDataClient {
  private esClient: ElasticsearchClient;

  constructor(private readonly options: AssetInventoryClientOpts) {
    const { clusterClient } = this.options;
    this.esClient = clusterClient.asCurrentUser;
  }

  // Enables the asset inventory by deferring the initialization to avoid blocking the main thread.
  public async enable() {
    // Utility function to defer execution to the next tick using setTimeout.
    const run = <T>(fn: () => Promise<T>) =>
      new Promise<T>((resolve) => setTimeout(() => fn().then(resolve), 0));

    // Defer and execute the initialization process.
    await run(() => this.init());

    return { succeeded: true };
  }

  // Initializes the asset inventory by validating experimental feature flags and triggering asynchronous setup.
  public async init() {
    const { logger } = this.options;

    logger.debug(`Initializing asset inventory`);

    this.asyncSetup().catch((e) =>
      logger.error(`Error during async setup of asset inventory: ${e.message}`)
    );
  }

  // Sets up the necessary resources for asset inventory.
  private async asyncSetup() {
    const { logger } = this.options;
    try {
      logger.debug('Initializing asset inventory');
    } catch (err) {
      logger.error(`Error initializing asset inventory: ${err.message}`);
      await this.delete();
    }
  }

  // Cleans up the resources associated with the asset inventory, such as removing the ingest pipeline.
  public async delete() {
    const { logger } = this.options;

    logger.debug(`Deleting asset inventory`);

    try {
      logger.debug(`Deleted asset inventory`);
      return { deleted: true };
    } catch (err) {
      logger.error(`Error deleting asset inventory: ${err.message}`);
      throw err;
    }
  }

  public async status(
    secSolutionContext: SecuritySolutionApiRequestHandlerContext,
    entityStorePrivileges: Awaited<ReturnType<typeof getEntityStorePrivileges>>
  ) {
    const hasEntityStorePrivileges = entityStorePrivileges.has_all_required;

    let status = ASSET_INVENTORY_STATUS.DISABLED;

    if (!hasEntityStorePrivileges) {
      status = ASSET_INVENTORY_STATUS.INSUFFICIENT_PRIVILEGES;
      return { status, privileges: entityStorePrivileges.privileges };
    }

    const entityStoreStatus = await secSolutionContext.getEntityStoreDataClient().status({
      include_components: true,
    });

    const entityEngineStatus = entityStoreStatus.status;

    console.log(JSON.stringify(entityStoreStatus, null, 2));

    if (entityEngineStatus === 'not_installed') {
      status = ASSET_INVENTORY_STATUS.DISABLED;
    } else if (entityEngineStatus === 'error') {
      if (entityEngineStatus === 'installing') {
        status = ASSET_INVENTORY_STATUS.INITIALIZING;
      } else {
        const universalEntityEngineStatus = entityStoreStatus.engines.find(
          (engine) => engine.type === 'universal'
        );
        // If the universal engine is not installed, the asset inventory is disabled.
        if (!universalEntityEngineStatus) {
          status = ASSET_INVENTORY_STATUS.DISABLED;
        } else {
          status = ASSET_INVENTORY_STATUS.INITIALIZING;
          let hasDocumentsProcessedInTransforms = false;
          let hasTransformTriggered = false;
          for (const engine of entityStoreStatus.engines) {
            if (engine.components) {
              for (const component of engine.components) {
                if (component.resource === 'transform') {
                  if (component?.metadata?.trigger_count > 1) {
                    hasTransformTriggered = true;
                  }
                  if (component?.metadata?.documents_processed > 0) {
                    hasDocumentsProcessedInTransforms = true;
                    break;
                  }
                }
              }
            }
          }

          if (hasDocumentsProcessedInTransforms) {
            status = ASSET_INVENTORY_STATUS.READY;
          } else if (hasTransformTriggered === true) {
            status = ASSET_INVENTORY_STATUS.EMPTY;
          }
        }
      }
    }
    return { status };
  }
}
