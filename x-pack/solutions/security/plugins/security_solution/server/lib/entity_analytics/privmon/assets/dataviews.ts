/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DataViewSpec, DataViewsService } from '@kbn/data-views-plugin/common';
import {
  PRIVMON_ALL_DATA_VIEW_ID,
  PRIVMON_INDEX_PATTERN,
  PRIVMON_LOGINS_DATA_VIEW_ID,
  PRIVMON_LOGINS_INDEX_PATTERN,
  PRIVMON_PRIVILEGES_DATA_VIEW_ID,
  PRIVMON_PRIVILEGES_INDEX_PATTERN,
  PRIVMON_USERS_DATA_VIEW_ID,
  PRIVMON_USERS_INDEX_PATTERN,
} from '../../../../../common/entity_analytics/privmon';

export const createPrivmonDataViews = async (
  dataViewsService: DataViewsService,
  namespace: string,
  logger: Logger
) => {
  const create = (dataView: DataViewSpec) => maybeCreateDataView(dataViewsService, dataView);
  await create({
    id: PRIVMON_LOGINS_DATA_VIEW_ID,
    name: 'Security Privileged User Monitoring Logins',
    title: PRIVMON_LOGINS_INDEX_PATTERN,
    namespaces: [namespace],
    timeFieldName: '@timestamp',
  });

  await create({
    id: PRIVMON_PRIVILEGES_DATA_VIEW_ID,
    name: 'Security Privileged User Monitoring Privileges',
    title: PRIVMON_PRIVILEGES_INDEX_PATTERN,
    namespaces: [namespace],
    timeFieldName: '@timestamp',
  });

  await create({
    id: PRIVMON_USERS_DATA_VIEW_ID,
    name: 'Security Privileged User Monitoring Users',
    title: PRIVMON_USERS_INDEX_PATTERN,
    namespaces: [namespace],
    timeFieldName: '@timestamp',
  });

  await create({
    id: PRIVMON_ALL_DATA_VIEW_ID,
    name: 'Security Privileged User Monitoring All',
    title: PRIVMON_INDEX_PATTERN,
    namespaces: [namespace],
    timeFieldName: '@timestamp',
  });
};

const maybeCreateDataView = async (dataViewsService: DataViewsService, dataView: DataViewSpec) => {
  if (dataView.id === undefined) {
    throw new Error('Data view must have an id');
  }
  let existingDataView;
  try {
    existingDataView = await dataViewsService.get(dataView.id);
  } catch (error) {
    if (error.output?.statusCode !== 404) {
      throw error;
    }
  }

  if (existingDataView) {
    return;
  }

  await dataViewsService.createAndSave(dataView);
};
