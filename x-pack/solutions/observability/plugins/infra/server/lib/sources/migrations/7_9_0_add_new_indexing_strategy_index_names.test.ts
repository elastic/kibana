/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrationMocks } from '@kbn/core/server/mocks';
import { addNewIndexingStrategyIndexNames } from './7_9_0_add_new_indexing_strategy_index_names';
import { infraSourceConfigurationSavedObjectName } from '../saved_object_type';

describe('infra source configuration migration function for 7.9.0', () => {
  test('adds "logs-*" when the logAlias contains "filebeat-*"', () => {
    const unmigratedConfiguration = createTestSourceConfiguration(
      'filebeat-*,custom-log-index-*',
      'custom-metric-index-*'
    );

    const migratedConfiguration = addNewIndexingStrategyIndexNames(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(
      createTestSourceConfiguration('filebeat-*,custom-log-index-*,logs-*', 'custom-metric-index-*')
    );
  });

  test('doesn\'t add "logs-*" when the logAlias doesn\'t contain "filebeat-*"', () => {
    const unmigratedConfiguration = createTestSourceConfiguration(
      'custom-log-index-*',
      'custom-metric-index-*'
    );

    const migratedConfiguration = addNewIndexingStrategyIndexNames(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(unmigratedConfiguration);
  });

  test('doesn\'t add "logs-*" when the logAlias already contains it', () => {
    const unmigratedConfiguration = createTestSourceConfiguration(
      'filebeat-*,logs-*,custom-log-index-*',
      'custom-metric-index-*'
    );

    const migratedConfiguration = addNewIndexingStrategyIndexNames(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(unmigratedConfiguration);
  });

  test('adds "metrics-*" when the logAlias contains "metricbeat-*"', () => {
    const unmigratedConfiguration = createTestSourceConfiguration(
      'custom-log-index-*',
      'metricbeat-*,custom-metric-index-*'
    );

    const migratedConfiguration = addNewIndexingStrategyIndexNames(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(
      createTestSourceConfiguration(
        'custom-log-index-*',
        'metricbeat-*,custom-metric-index-*,metrics-*'
      )
    );
  });

  test('doesn\'t add "metrics-*" when the logAlias doesn\'t contain "metricbeat-*"', () => {
    const unmigratedConfiguration = createTestSourceConfiguration(
      'custom-log-index-*',
      'custom-metric-index-*'
    );

    const migratedConfiguration = addNewIndexingStrategyIndexNames(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(unmigratedConfiguration);
  });

  test('doesn\'t add "metrics-*" when the metricAlias already contains it', () => {
    const unmigratedConfiguration = createTestSourceConfiguration(
      'custom-log-index-*',
      'metrics-*,metricbeat-*,custom-metric-index-*'
    );

    const migratedConfiguration = addNewIndexingStrategyIndexNames(
      unmigratedConfiguration,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(unmigratedConfiguration);
  });
});

const createTestSourceConfiguration = (logAlias: string, metricAlias: string) => ({
  attributes: {
    name: 'TEST CONFIGURATION',
    description: '',
    fields: {
      pod: 'TEST POD FIELD',
      host: 'TEST HOST FIELD',
      message: ['TEST MESSAGE FIELD'],
      container: 'TEST CONTAINER FIELD',
      timestamp: 'TEST TIMESTAMP FIELD',
      tiebreaker: 'TEST TIEBREAKER FIELD',
    },
    inventoryDefaultView: '0',
    metricsExplorerDefaultView: '0',
    logColumns: [
      {
        fieldColumn: {
          id: 'TEST FIELD COLUMN ID',
          field: 'TEST FIELD COLUMN FIELD',
        },
      },
    ],
    logAlias,
    metricAlias,
    anomalyThreshold: 20,
  },
  id: 'TEST_ID',
  type: infraSourceConfigurationSavedObjectName,
});
