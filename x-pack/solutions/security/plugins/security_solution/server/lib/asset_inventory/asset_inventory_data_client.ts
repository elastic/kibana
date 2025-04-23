/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';

import type { EntityAnalyticsPrivileges } from '../../../common/api/entity_analytics';
import type { GetEntityStoreStatusResponse } from '../../../common/api/entity_analytics/entity_store/status.gen';
import type { InitEntityStoreRequestBody } from '../../../common/api/entity_analytics/entity_store/enable.gen';
import type { SecuritySolutionApiRequestHandlerContext } from '../..';

interface AssetInventoryClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  uiSettingsClient: IUiSettingsClient;
}

type EntityStoreEngineStatus = GetEntityStoreStatusResponse['engines'][number];

interface HostEntityEngineStatus extends Omit<EntityStoreEngineStatus, 'type'> {
  type: 'host';
}

interface TransformMetadata {
  documents_processed: number;
  trigger_count: number;
}

export const ASSET_INVENTORY_STATUS: Record<string, string> = {
  INACTIVE_FEATURE: 'inactive_feature',
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

  // Enables the asset inventory by deferring the initialization to avoid blocking the main thread.
  public async enable(
    secSolutionContext: SecuritySolutionApiRequestHandlerContext,
    requestBodyOverrides: InitEntityStoreRequestBody
  ) {
    const { logger } = this.options;

    logger.debug(`Enabling asset inventory`);

    try {
      if (!(await this.checkUISettingEnabled())) {
        throw new Error('uiSetting');
      }

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

  // Cleans up the resources associated with the asset inventory, such as removing the ingest pipeline.
  public async delete() {
    const { logger } = this.options;

    logger.debug(`Deleting asset inventory`);

    try {
      if (!(await this.checkUISettingEnabled())) {
        throw new Error('uiSetting');
      }

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
    if (!(await this.checkUISettingEnabled())) {
      return { status: ASSET_INVENTORY_STATUS.INACTIVE_FEATURE };
    }

    // Check if the user has the required privileges to access the entity store.
    if (!entityStorePrivileges.has_all_required) {
      return {
        status: ASSET_INVENTORY_STATUS.INSUFFICIENT_PRIVILEGES,
        privileges: entityStorePrivileges,
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

  private async checkUISettingEnabled() {
    const { uiSettingsClient, logger } = this.options;

    const isAssetInventoryEnabled = await uiSettingsClient.get<boolean>(
      SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING
    );

    if (!isAssetInventoryEnabled) {
      logger.debug(
        `${SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING} advanced setting is disabled`
      );
    }

    return isAssetInventoryEnabled;
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
