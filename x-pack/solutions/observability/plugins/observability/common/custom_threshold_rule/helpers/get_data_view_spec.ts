/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { SearchConfigurationWithExtractedReferenceType } from '../types';

export const getDataViewSpecFromSearchConfig = (
  searchConfiguration?: SearchConfigurationWithExtractedReferenceType
) => {
  if (!searchConfiguration) {
    return;
  }
  const dataViewId =
    typeof searchConfiguration?.index === 'string'
      ? searchConfiguration.index
      : searchConfiguration?.index?.title;

  if (!dataViewId) {
    return;
  }
  // If the rule uses adhoc data view, it has the data view spec in the index property
  // If it uses a persistent data views, we can use the id only in the data view spec or undefined
  const isAdhocDataView =
    typeof searchConfiguration?.index === 'object' && 'id' in searchConfiguration.index;
  const dataViewSpec = isAdhocDataView
    ? (searchConfiguration.index as DataViewSpec)
    : { id: dataViewId };
  return dataViewSpec;
};
