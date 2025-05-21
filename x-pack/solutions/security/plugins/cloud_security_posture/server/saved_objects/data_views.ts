/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ElasticsearchClient,
  ISavedObjectsRepository,
  SavedObject,
  type KibanaRequest,
  type Logger,
} from '@kbn/core/server';
import { DataViewAttributes } from '@kbn/data-views-plugin/common';
import { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  CDR_MISCONFIGURATIONS_DATA_VIEW_NAME,
  CDR_VULNERABILITIES_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-common';
import {
  CDR_VULNERABILITIES_DATA_VIEW_ID_PREFIX,
  CDR_VULNERABILITIES_DATA_VIEW_NAME,
} from '../../common/constants';

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
