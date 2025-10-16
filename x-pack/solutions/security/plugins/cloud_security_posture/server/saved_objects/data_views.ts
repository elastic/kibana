/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, ISavedObjectsRepository, SavedObject } from '@kbn/core/server';
import { type KibanaRequest, type Logger } from '@kbn/core/server';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
  CDR_VULNERABILITIES_INDEX_PATTERN,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
  CDR_VULNERABILITIES_DATA_VIEW_NAME,
} from '@kbn/cloud-security-posture-common';

const DATA_VIEW_TIME_FIELD = '@timestamp';

const getDataViewSafe = async (
  soClient: ISavedObjectsRepository,
  currentSpaceId: string,
  currentSpaceDataViewId: string
): Promise<SavedObject<DataViewAttributes> | undefined> => {
  try {
    const dataView = await soClient.get<DataViewAttributes>(
      'index-pattern',
      currentSpaceDataViewId,
      {
        namespace: currentSpaceId,
      }
    );

    return dataView;
  } catch (e) {
    return;
  }
};

const getCurrentSpaceId = (
  spacesService: SpacesServiceStart | undefined,
  request: KibanaRequest
): string => {
  return spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID;
};

const deleteDataViewSafe = async (
  soClient: ISavedObjectsRepository,
  dataViewId: string,
  namespace: string,
  logger: Logger
): Promise<void> => {
  try {
    await soClient.delete('index-pattern', dataViewId, { namespace });
    logger.info(`Deleted old data view: ${dataViewId}`);
  } catch (e) {
    // Ignore if doesn't exist - expected behavior for new installations
    return;
  }
};

export const installDataView = async (
  esClient: ElasticsearchClient,
  soClient: ISavedObjectsRepository,
  spacesService: SpacesServiceStart | undefined,
  dataViewsService: DataViewsServerPluginStart,
  request: KibanaRequest,
  dataViewName: string,
  indexPattern: string,
  dataViewId: string,
  logger: Logger
) => {
  try {
    const currentSpaceId = await getCurrentSpaceId(spacesService, request);
    const currentSpaceDataViewId = `${dataViewId}-${currentSpaceId}`;

    const doesDataViewExist = await getDataViewSafe(
      soClient,
      currentSpaceId,
      currentSpaceDataViewId
    );

    if (doesDataViewExist) return;

    logger.info(`Creating and saving data view with ID: ${currentSpaceDataViewId}`);

    const dataViewsClient = await dataViewsService.dataViewsServiceFactory(
      soClient,
      esClient,
      request,
      true
    );
    await dataViewsClient.createAndSave(
      {
        id: currentSpaceDataViewId,
        title: indexPattern,
        name: `${dataViewName} - ${currentSpaceId} `,
        namespaces: [currentSpaceId],
        allowNoIndex: true,
        timeFieldName: DATA_VIEW_TIME_FIELD,
      },
      true
    );
  } catch (error) {
    logger.error(`Failed to setup data view`, error);
  }
};

export const migrateCdrDataViewsForAllSpaces = async (
  soClient: ISavedObjectsRepository,
  spacesService: SpacesServiceStart | undefined,
  logger: Logger
) => {
  try {
    logger.info('Starting CDR data views migration across all spaces');

    // Get all spaces from saved objects
    let spaceIds: string[] = [DEFAULT_SPACE_ID];
    
    if (spacesService) {
      try {
        // Find all space saved objects
        const spacesResult = await soClient.find({
          type: 'space',
          perPage: 1000,
          namespaces: ['*'], // Search across all namespaces
        });
        
        spaceIds = spacesResult.saved_objects.map((space) => space.id);
        logger.info(`Found ${spaceIds.length} space(s) to migrate: ${spaceIds.join(', ')}`);
      } catch (error) {
        logger.warn('Failed to retrieve spaces, using default space only', error);
        spaceIds = [DEFAULT_SPACE_ID];
      }
    } else {
      logger.info('Spaces service not available, using default space only');
    }

    // Get all data views matching old prefixes
    const oldMisconfigurationsPrefixes = CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS;
    const oldVulnerabilitiesPrefixes = CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS;

    // Find and delete old misconfigurations data views
    for (const oldPrefix of oldMisconfigurationsPrefixes) {
      for (const spaceId of spaceIds) {
        try {
          const oldDataViewId = `${oldPrefix}-${spaceId}`;
          logger.debug(`Checking for old misconfigurations data view: ${oldDataViewId} in space: ${spaceId}`);

          const findResult = await getDataViewSafe(soClient, spaceId, oldDataViewId);

          if (findResult) {
            logger.info(`Found old misconfigurations data view: ${oldDataViewId}, migrating...`);
            const namespace = findResult.namespaces?.[0] || spaceId;
            await deleteDataViewSafe(soClient, findResult.id, namespace, logger);
          }
        } catch (error) {
          logger.warn(
            `Failed to migrate old misconfigurations data view for prefix ${oldPrefix} in space ${spaceId}`,
            error
          );
        }
      }
    }

    // Find and delete old vulnerabilities data views
    for (const oldPrefix of oldVulnerabilitiesPrefixes) {
      for (const spaceId of spaceIds) {
        try {
          const oldDataViewId = `${oldPrefix}-${spaceId}`;
          logger.debug(`Checking for old vulnerabilities data view: ${oldDataViewId} in space: ${spaceId}`);

          const findResult = await getDataViewSafe(soClient, spaceId, oldDataViewId);

          if (findResult) {
            logger.info(`Found old vulnerabilities data view: ${oldDataViewId}, migrating...`);
            const namespace = findResult.namespaces?.[0] || spaceId;
            await deleteDataViewSafe(soClient, findResult.id, namespace, logger);
          }
        } catch (error) {
          logger.warn(
            `Failed to migrate old vulnerabilities data view for prefix ${oldPrefix} in space ${spaceId}`,
            error
          );
        }
      }
    }

    logger.info('CDR data views migration completed successfully');
  } catch (error) {
    logger.error('Failed to migrate CDR data views', error);
    // Don't throw - migration failure shouldn't block initialization
  }
};

export const setupCdrDataViews = async (
  esClient: ElasticsearchClient,
  soClient: ISavedObjectsRepository,
  spacesService: SpacesServiceStart | undefined,
  dataViewsService: DataViewsServerPluginStart,
  request: KibanaRequest,
  logger: Logger
) => {
  await installDataView(
    esClient,
    soClient,
    spacesService,
    dataViewsService,
    request,
    CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
    CDR_MISCONFIGURATIONS_INDEX_PATTERN,
    CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
    logger
  );

  await installDataView(
    esClient,
    soClient,
    spacesService,
    dataViewsService,
    request,
    CDR_VULNERABILITIES_DATA_VIEW_NAME,
    CDR_VULNERABILITIES_INDEX_PATTERN,
    CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
    logger
  );
};
