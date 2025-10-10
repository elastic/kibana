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

const migrateOldDataViews = async (
  soClient: ISavedObjectsRepository,
  spacesService: SpacesServiceStart | undefined,
  request: KibanaRequest,
  oldDataViewIdPrefixes: string[],
  logger: Logger
): Promise<void> => {
  const currentSpaceId = getCurrentSpaceId(spacesService, request);

  // Iterate through all old data view versions
  for (const oldDataViewIdPrefix of oldDataViewIdPrefixes) {
    const oldDataViewId = `${oldDataViewIdPrefix}-${currentSpaceId}`;

    // Check if old data view exists in the current space before attempting deletion
    const oldDataView = await getDataViewSafe(soClient, currentSpaceId, oldDataViewId);

    if (oldDataView) {
      logger.info(`Migrating data view from ${oldDataViewId} to new version`);
      await deleteDataViewSafe(soClient, oldDataViewId, currentSpaceId, logger);
    }
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

export const setupCdrDataViews = async (
  esClient: ElasticsearchClient,
  soClient: ISavedObjectsRepository,
  spacesService: SpacesServiceStart | undefined,
  dataViewsService: DataViewsServerPluginStart,
  request: KibanaRequest,
  logger: Logger
) => {
  // Migrate all old misconfigurations data view versions
  // This ensures users upgrading from any old version get the latest data view
  await migrateOldDataViews(
    soClient,
    spacesService,
    request,
    CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
    logger
  );

  // Migrate all old vulnerabilities data view versions
  // This ensures users upgrading from any old version get the latest data view
  await migrateOldDataViews(
    soClient,
    spacesService,
    request,
    CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS,
    logger
  );

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
