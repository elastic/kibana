/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraSource } from '../lib/sources';
import { getAttributesFromSourceConfiguration } from './map_source_to_log_view';

describe('getAttributesFromSourceConfiguration function', () => {
  it('converts the index_pattern log indices type to data_view', () => {
    const logViewAttributes = getAttributesFromSourceConfiguration(basicTestSourceConfiguration);

    expect(logViewAttributes.logIndices).toEqual({
      type: 'data_view',
      dataViewId: 'INDEX_PATTERN_ID',
    });
  });

  it('preserves the index_name log indices type', () => {
    const logViewAttributes = getAttributesFromSourceConfiguration({
      ...basicTestSourceConfiguration,
      configuration: {
        ...basicTestSourceConfiguration.configuration,
        logIndices: {
          type: 'index_name',
          indexName: 'INDEX_NAME',
        },
      },
    });

    expect(logViewAttributes.logIndices).toEqual({
      type: 'index_name',
      indexName: 'INDEX_NAME',
    });
  });
});

const basicTestSourceConfiguration: InfraSource = {
  id: 'ID',
  origin: 'stored',
  configuration: {
    name: 'NAME',
    description: 'DESCRIPTION',
    logIndices: {
      type: 'index_pattern',
      indexPatternId: 'INDEX_PATTERN_ID',
    },
    logColumns: [],
    metricAlias: 'METRIC_ALIAS',
    inventoryDefaultView: 'INVENTORY_DEFAULT_VIEW',
    metricsExplorerDefaultView: 'METRICS_EXPLORER_DEFAULT_VIEW',
    anomalyThreshold: 0,
  },
};
