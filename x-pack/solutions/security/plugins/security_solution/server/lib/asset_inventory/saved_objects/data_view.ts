/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';

const DATA_VIEW_TIME_FIELD = '@timestamp';

export const installDataView = async (
  currentSpaceId: string,
  dataViewsService: DataViewsService,
  dataViewName: string,
  indexPattern: string,
  dataViewId: string,
  logger: Logger
) => {
  try {
    const currentSpaceDataViewId = `${dataViewId}-${currentSpaceId}`;

    logger.info(`Creating and saving data view with ID: ${currentSpaceDataViewId}`);

    return await dataViewsService.createAndSave(
      {
        id: currentSpaceDataViewId,
        title: `${indexPattern}${currentSpaceId}`,
        name: `${dataViewName} - ${currentSpaceId}`,
        namespaces: [currentSpaceId],
        allowNoIndex: true,
        timeFieldName: DATA_VIEW_TIME_FIELD,
        allowHidden: true,
      },
      false,
      true
    );
  } catch (error) {
    logger.error(`Failed to setup data view`, error);
    throw error;
  }
};
