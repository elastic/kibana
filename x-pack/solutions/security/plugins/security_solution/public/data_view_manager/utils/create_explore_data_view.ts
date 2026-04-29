/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic, DataView } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { DEFAULT_TIME_FIELD, EXPLORE_DATA_VIEW_PREFIX } from '../../../common/constants';
import { SECURITY_SOLUTION_EXPLORE_DATA_VIEW } from '../components/data_view_picker/translations';

export const createExploreDataView = async (
  dependencies: {
    dataViews: DataViewsServicePublic;
    spaces: SpacesPluginStart;
  },
  defaultDataViewPatterns: string[],
  alertsDataViewPattern: string
): Promise<DataView> => {
  const exploreDataViewPattern = defaultDataViewPatterns
    .filter((pattern) => pattern !== alertsDataViewPattern)
    .join();

  return dependencies.dataViews.create({
    id: `${EXPLORE_DATA_VIEW_PREFIX}-${(await dependencies.spaces.getActiveSpace()).id}`,
    name: SECURITY_SOLUTION_EXPLORE_DATA_VIEW,
    timeFieldName: DEFAULT_TIME_FIELD,
    title: exploreDataViewPattern,
    managed: true,
  });
};
