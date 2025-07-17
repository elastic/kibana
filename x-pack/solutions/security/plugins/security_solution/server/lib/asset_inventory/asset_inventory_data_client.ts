/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';

import type { EntityAnalyticsPrivileges } from '../../../common/api/entity_analytics';
import { EntityType } from '../../../common/api/entity_analytics';
import type { GetEntityStoreStatusResponse } from '../../../common/api/entity_analytics/entity_store/status.gen';
import type { InitEntityStoreRequestBody } from '../../../common/api/entity_analytics/entity_store/enable.gen';
import type { SecuritySolutionApiRequestHandlerContext } from '../..';
import { installDataView } from './saved_objects/data_view';
import {
  ASSET_INVENTORY_DATA_VIEW_ID_PREFIX,
  ASSET_INVENTORY_DATA_VIEW_NAME,
  ASSET_INVENTORY_GENERIC_INDEX_PREFIX,
  ASSET_INVENTORY_GENERIC_LOOKBACK_PERIOD,
  ASSET_INVENTORY_INDEX_PATTERN,
} from './constants';

interface AssetInventoryClientOpts {
  logger: Logger;
  clusterClient: IScopedClusterClient;
  uiSettingsClient: IUiSettingsClient;
}

type EntityStoreEngineStatus = GetEntityStoreStatusResponse['engines'][number];

interface GenericEntityEngineStatus extends Omit<EntityStoreEngineStatus, 'type'> {
  type: 'generic';
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

  // Checks if the Asset Inventory DataView exists, if not, installs it
  public async installAssetInventoryDataView(
    secSolutionContext: SecuritySolutionApiRequestHandlerContext
  ) {
    const { logger } = this.options;

    const dataViewService = secSolutionContext.getDataViewsService();

    const currentSpaceId = secSolutionContext.getSpaceId();
    const currentSpaceDataViewId = `${ASSET_INVENTORY_DATA_VIEW_ID_PREFIX}-${currentSpaceId}`;
    let dataViewExists = false;

    try {
      logger.debug(`Checking if data view exists: ${currentSpaceDataViewId}`);
      await dataViewService.get(currentSpaceDataViewId, false);
      dataViewExists = true;
    } catch (error) {
      logger.error(`Error getting data view: ${error}`);
      if (
        error &&
        typeof error === 'object' &&
        'output' in error &&
        'statusCode' in error.output &&
        error.output.statusCode === 404
      ) {
        logger.info(
          `DataView with ID '${currentSpaceDataViewId}' not found. Proceeding with installation.`
        );
        dataViewExists = false; // Confirm it doesn't exist
      } else {
        logger.error('An unexpected error occurred while checking data view existence:', error);
      }
    }

    if (!dataViewExists) {
      logger.debug('Installing Asset Inventory DataView');

      return installDataView(
        currentSpaceId,
        dataViewService,
        ASSET_INVENTORY_DATA_VIEW_NAME,
        ASSET_INVENTORY_INDEX_PATTERN,
        ASSET_INVENTORY_DATA_VIEW_ID_PREFIX,
        logger
      );
    } else {
      logger.debug('DataView is already installed. Skipping installation.');
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

      // Retrieve entity store status
      const entityStoreStatus = await secSolutionContext.getEntityStoreDataClient().status({
        include_components: true,
      });

      const entityEngineStatus = entityStoreStatus.status;

      let entityStoreEnablementResponse;

      // For Asset Inventory onboarding, the Generic Entities should be initialized with a lookback period of 26 hours
      // to account for the fact that entity extraction integrations have a default ingest window time of 24 hours
      // and we want to cover the ingest window time with a buffer of 2 hours.
      const genericRequestBody: InitEntityStoreRequestBody = {
        ...requestBodyOverrides,
        lookbackPeriod: ASSET_INVENTORY_GENERIC_LOOKBACK_PERIOD,
      };

      // If the entity store is not installed, we need to install it.
      if (entityEngineStatus === 'not_installed') {
        const nonGenericEntityStoreRequestBody: InitEntityStoreRequestBody = {
          ...requestBodyOverrides,
          entityTypes: [EntityType.enum.host, EntityType.enum.user, EntityType.enum.service],
        };

        await secSolutionContext
          .getEntityStoreDataClient()
          .enable(nonGenericEntityStoreRequestBody);

        entityStoreEnablementResponse = await secSolutionContext
          .getEntityStoreDataClient()
          // @ts-ignore-next-line TS2345
          .init(EntityType.enum.generic, genericRequestBody);
      } else {
        // If the entity store is already installed, we need to check if the generic engine is installed.
        const genericEntityEngine = entityStoreStatus.engines.find(this.isGenericEntityEngine);

        // If the generic engine is not installed or is stopped, we need to start it.
        if (!genericEntityEngine) {
          entityStoreEnablementResponse = await secSolutionContext
            .getEntityStoreDataClient()
            // @ts-ignore-next-line TS2345
            .init(EntityType.enum.generic, genericRequestBody);
        }
      }

      try {
        await installDataView(
          secSolutionContext.getSpaceId(),
          secSolutionContext.getDataViewsService(),
          ASSET_INVENTORY_DATA_VIEW_NAME,
          ASSET_INVENTORY_INDEX_PATTERN,
          ASSET_INVENTORY_DATA_VIEW_ID_PREFIX,
          logger
        );
      } catch (error) {
        logger.error(`Error installing asset inventory data view: ${error.message}`);
      }

      logger.debug(`Enabled asset inventory`);

      return entityStoreEnablementResponse;
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
    const { logger } = this.options;

    if (!(await this.checkUISettingEnabled())) {
      return { status: ASSET_INVENTORY_STATUS.INACTIVE_FEATURE };
    }

    // Determine the ready status based on the presence of generic documents
    try {
      const hasGenericDocuments = await this.hasGenericDocuments(secSolutionContext);
      // check if users don't have entity store privileges but generic documents are present
      if (hasGenericDocuments) {
        try {
          await this.installAssetInventoryDataView(secSolutionContext);
        } catch (error) {
          logger.error(`Error installing asset inventory data view: ${error.message}`);
        }
        return { status: ASSET_INVENTORY_STATUS.READY };
      }
    } catch (error) {
      logger.error(`Error checking for generic documents: ${error.message}`);
    }

    // In case there are no generic documents, Entity Store will need to be enabled.
    // Check if the user has the required privileges to enable the entity store.
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

    // Check for the Generic entity engine
    const genericEntityEngine = entityStoreStatus.engines.find(this.isGenericEntityEngine);
    // If the generic engine is not installed, the asset inventory is disabled.
    if (!genericEntityEngine) {
      return { status: ASSET_INVENTORY_STATUS.DISABLED };
    }

    // If there are no generic documents and the transform has already been triggered,
    // we consider the asset inventory to be in the empty status.
    if (this.hasTransformTriggered(genericEntityEngine)) {
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

  // Type guard to check if an entity engine is a generic entity engine
  private isGenericEntityEngine(
    engine: EntityStoreEngineStatus
  ): engine is GenericEntityEngineStatus {
    return engine.type === 'generic';
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

  private hasTransformTriggered(engine: GenericEntityEngineStatus): boolean {
    return !!engine.components?.some((component) => {
      if (component.resource === 'transform' && this.isTransformMetadata(component.metadata)) {
        return component.metadata.trigger_count > 0;
      }
      return false;
    });
  }

  private async hasGenericDocuments(secSolutionContext: SecuritySolutionApiRequestHandlerContext) {
    const elasticsearchClient = secSolutionContext.core.elasticsearch.client;

    const spaceId = secSolutionContext.getSpaceId();

    const genericIndexCurrentSpace = `${ASSET_INVENTORY_GENERIC_INDEX_PREFIX}${spaceId}`;

    const response = await elasticsearchClient.asInternalUser.count({
      index: genericIndexCurrentSpace,
    });

    return response.count > 0;
  }
}
