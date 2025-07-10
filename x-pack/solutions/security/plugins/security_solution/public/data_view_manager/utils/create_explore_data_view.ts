/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic, DataView } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { EXPLORE_DATA_VIEW_PREFIX } from '../../../common/constants';

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
    name: 'Explore Data View',
    title: exploreDataViewPattern,
  });
};
