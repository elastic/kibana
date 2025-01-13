/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrationMocks } from '@kbn/core/server/mocks';
import { convertLogAliasToLogIndices } from './7_13_0_convert_log_alias_to_log_indices';
import { infraSourceConfigurationSavedObjectName } from '../saved_object_type';

describe('infra source configuration migration function for 7.13.0', () => {
  test('migrates the logAlias property to logIndices', () => {
    const unmigratedConfiguration = createTestSourceConfiguration({
      logAlias: 'filebeat-*',
    });

    const migratedConfiguration = convertLogAliasToLogIndices(
      unmigratedConfiguration as any,
      migrationMocks.createContext()
    );

    expect(migratedConfiguration).toStrictEqual(
      createTestSourceConfiguration({
        logIndices: {
          type: 'index_name',
          indexName: 'filebeat-*',
        },
      })
    );
  });
});

const createTestSourceConfiguration = (additionalProperties = {}) => ({
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
    metricAlias: 'metricbeat-*,metrics-*',
    anomalyThreshold: 20,
    ...additionalProperties,
  },
  id: 'TEST_ID',
  type: infraSourceConfigurationSavedObjectName,
});
