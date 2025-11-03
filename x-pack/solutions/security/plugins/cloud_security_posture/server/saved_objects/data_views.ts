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
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS,
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS,
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
    if (namespace === '*') {
      await soClient.delete('index-pattern', dataViewId, { force: true });
    } else {
      await soClient.delete('index-pattern', dataViewId, { namespace });
    }
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

export const deleteOldAndLegacyCdrDataViewsForAllSpaces = async (
  soClient: ISavedObjectsRepository,
  logger: Logger
) => {
  try {
    logger.info('Starting deletion of old and legacy CDR data views across all spaces');

    // Get all data views matching old prefixes
    const oldMisconfigurationsPrefixes = CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_OLD_VERSIONS;
    const oldVulnerabilitiesPrefixes = CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_OLD_VERSIONS;
    const legacyMisconfigurationsPrefixes =
      CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS;
    const legacyVulnerabilitiesPrefixes = CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX_LEGACY_VERSIONS;
    // Search for all data views across all namespaces and filter by old prefixes
    // We can't use wildcard on _id field, so we fetch all index-patterns and filter in memory
    const allDataViewsResult = await soClient.find({
      type: 'index-pattern',
      namespaces: ['*'], // Search across all spaces
      perPage: 1000,
    });

    logger.info(`Found ${allDataViewsResult.saved_objects.length} total data views to check`);

    if (allDataViewsResult.total > 1000) {
      logger.warn(
        `Total data views (${allDataViewsResult.total}) exceeds page limit (1000). Some old data views may not be deleted.`
      );
    }

    // Filter data views that match old prefixes and legacy ids
    // Include the dash (-) in the check to avoid matching current data views
    const oldMisconfigurationsDataViews = allDataViewsResult.saved_objects.filter((obj) =>
      oldMisconfigurationsPrefixes.some((prefix) => obj.id.startsWith(`${prefix}-`))
    );

    const legacyMisconfigurationsDataViews = allDataViewsResult.saved_objects.filter((obj) =>
      legacyMisconfigurationsPrefixes.some((prefix) => obj.id === prefix)
    );

    const oldVulnerabilitiesDataViews = allDataViewsResult.saved_objects.filter((obj) =>
      oldVulnerabilitiesPrefixes.some((prefix) => obj.id.startsWith(`${prefix}-`))
    );

    const legacyVulnerabilitiesDataViews = allDataViewsResult.saved_objects.filter((obj) =>
      legacyVulnerabilitiesPrefixes.some((prefix) => obj.id === prefix)
    );

    // Delete legacy misconfigurations data views
    for (const dataView of legacyMisconfigurationsDataViews) {
      const namespace = dataView.namespaces?.[0] || DEFAULT_SPACE_ID;
      logger.info(
        `Found legacy misconfigurations data view: ${dataView.id} in namespace: ${dataView.namespaces}, deleting...`
      );
      await deleteDataViewSafe(soClient, dataView.id, namespace, logger);
    }

    // Delete legacy vulnerabilities data views
    for (const dataView of legacyVulnerabilitiesDataViews) {
      logger.info(`Found legacy vulnerabilities data view: ${dataView.id}, deleting...`);
      const namespace = dataView.namespaces?.[0] || DEFAULT_SPACE_ID;
      await deleteDataViewSafe(soClient, dataView.id, namespace, logger);
    }

    // Delete old misconfigurations data views
    for (const dataView of oldMisconfigurationsDataViews) {
      logger.info(`Found old misconfigurations data view: ${dataView.id}, deleting...`);
      const namespace = dataView.namespaces?.[0] || DEFAULT_SPACE_ID;
      await deleteDataViewSafe(soClient, dataView.id, namespace, logger);
    }

    // Delete old vulnerabilities data views
    for (const dataView of oldVulnerabilitiesDataViews) {
      logger.info(`Found old vulnerabilities data view: ${dataView.id}, deleting...`);
      const namespace = dataView.namespaces?.[0] || DEFAULT_SPACE_ID;
      await deleteDataViewSafe(soClient, dataView.id, namespace, logger);
    }

    logger.info('Deletion of old and legacy CDR data views completed successfully');
  } catch (error) {
    logger.error('Failed to delete old and legacy CDR data views', error);
    // Don't throw - deletion failure shouldn't block plugin initialization
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
