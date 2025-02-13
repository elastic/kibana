/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsType } from '@kbn/core/server';

export const metricsDataSourceSavedObjectName = 'metrics-data-source';

export interface MetricsDataSavedObject {
  metricIndices: string;
}

export const metricsDataSourceSavedObjectType: SavedObjectsType = {
  name: metricsDataSourceSavedObjectName,
  hidden: false,
  namespaceType: 'single',
  management: {
    defaultSearchField: 'name',
    displayName: 'metrics data source',
    getTitle(savedObject: SavedObject<MetricsDataSavedObject>) {
      return `Metrics data source [id=${savedObject.id}]`;
    },
    icon: 'metricsApp',
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {},
  },
};
