/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';

import type { EntityAnalyticsPrivileges } from '../../../common/api/entity_analytics';
import type { GetEntityStoreStatusResponse } from '../../../common/api/entity_analytics/entity_store/status.gen';
import type { InitEntityStoreRequestBody } from '../../../common/api/entity_analytics/entity_store/enable.gen';
import type { ExperimentalFeatures } from '../../../common';
import type { SecuritySolutionApiRequestHandlerContext } from '../..';

interface AssetInventoryClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  experimentalFeatures: ExperimentalFeatures;
}

type EntityStoreEngineStatus = GetEntityStoreStatusResponse['engines'][number];

interface HostEntityEngineStatus extends Omit<EntityStoreEngineStatus, 'type'> {
  type: 'host';
}

interface TransformMetadata {
  documents_processed: number;
  trigger_count: number;
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
  constructor(private readonly options: AssetInventoryClientOpts) {}

  // Enables the asset inventory by deferring the initialization to avoid blocking the main thread.
  public async enable(
    secSolutionContext: SecuritySolutionApiRequestHandlerContext,
    requestBodyOverrides: InitEntityStoreRequestBody
  ) {
    const { logger } = this.options;

    try {
      logger.debug(`Enabling asset inventory`);

      const entityStoreEnableResponse = await secSolutionContext
        .getEntityStoreDataClient()
        .enable(requestBodyOverrides);

      logger.debug(`Enabled asset inventory`);

      return entityStoreEnableResponse;
    } catch (err) {
      logger.error(`Error enabling asset inventory: ${err.message}`);
      throw err;
    }
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
    entityStorePrivileges: EntityAnalyticsPrivileges
  ) {
    // Check if the user has the required privileges to access the entity store.
    if (!entityStorePrivileges.has_all_required) {
      return {
        status: ASSET_INVENTORY_STATUS.INSUFFICIENT_PRIVILEGES,
        privileges: entityStorePrivileges.privileges,
      };
    }

    // Retrieve entity store status
    const entityStoreStatus = await secSolutionContext.getEntityStoreDataClient().status({
      include_components: true,
    });

    const entityEngineStatus = entityStoreStatus.status;

    // Determine the asset inventory status based on the entity engine status
    if (entityEngineStatus === 'not_installed') {
      return { status: ASSET_INVENTORY_STATUS.DISABLED };
    }
    if (entityEngineStatus === 'installing') {
      return { status: ASSET_INVENTORY_STATUS.INITIALIZING };
    }

    // Check for host entity engine
    const hostEntityEngine = entityStoreStatus.engines.find(this.isHostEntityEngine);
    // If the host engine is not installed, the asset inventory is disabled.
    if (!hostEntityEngine) {
      return { status: ASSET_INVENTORY_STATUS.DISABLED };
    }

    // Determine final status based on transform metadata
    if (this.hasDocumentsProcessed(hostEntityEngine)) {
      return { status: ASSET_INVENTORY_STATUS.READY };
    }
    if (this.hasTransformTriggered(hostEntityEngine)) {
      return { status: ASSET_INVENTORY_STATUS.EMPTY };
    }

    // If the engine is still initializing, return the initializing status
    return { status: ASSET_INVENTORY_STATUS.INITIALIZING };
  }

  // Type guard to check if an entity engine is a host entity engine
  // Todo: Change to the new 'generic' entity engine once it's ready
  private isHostEntityEngine(engine: EntityStoreEngineStatus): engine is HostEntityEngineStatus {
    return engine.type === 'host';
  }

  // Type guard function to validate entity store component metadata
  private isTransformMetadata(metadata: unknown): metadata is TransformMetadata {
    return (
      typeof metadata === 'object' &&
      metadata !== null &&
      'documents_processed' in metadata &&
      'trigger_count' in metadata &&
      typeof (metadata as TransformMetadata).documents_processed === 'number' &&
      typeof (metadata as TransformMetadata).trigger_count === 'number'
    );
  }

  private hasDocumentsProcessed(engine: HostEntityEngineStatus): boolean {
    return !!engine.components?.some((component) => {
      if (component.resource === 'transform' && this.isTransformMetadata(component.metadata)) {
        return component.metadata.documents_processed > 0;
      }
      return false;
    });
  }

  private hasTransformTriggered(engine: HostEntityEngineStatus): boolean {
    return !!engine.components?.some((component) => {
      if (component.resource === 'transform' && this.isTransformMetadata(component.metadata)) {
        return component.metadata.trigger_count > 0;
      }
      return false;
    });
  }
}
