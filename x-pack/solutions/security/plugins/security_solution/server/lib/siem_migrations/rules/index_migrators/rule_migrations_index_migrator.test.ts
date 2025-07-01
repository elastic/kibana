/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RuleMigrationIndexMigrator } from '.';
import * as RuleMigrationSpaceIndexMigratorModule from './rule_migrations_per_space_index_migrator';
import type { Adapters } from '../types';
import { IndexPatternAdapter } from '@kbn/index-adapter';
import { loggerMock } from '@kbn/logging-mocks';

const rulesIndexName = '.kibana-siem-rule-migrations-rules';
const esClientMock = {
  indices: {
    get: jest.fn().mockResolvedValue({
      '.kibana-siem-rule-migrations-rules-space1': {},
      '.kibana-siem-rule-migrations-rules-space2': {},
      '.kibana-siem-rule-migrations-rules-space3': {},
    }),
  },
} as unknown as ElasticsearchClient;

const ruleMigrationIndexAdapters = {
  rules: new IndexPatternAdapter(rulesIndexName, {
    kibanaVersion: '9.0.0',
  }),
} as unknown as Adapters;

const mockLogger = loggerMock.create();

const mockPerSpaceIndexMigrator = jest.spyOn(
  RuleMigrationSpaceIndexMigratorModule,
  'RuleMigrationSpaceIndexMigrator'
);

describe('Index migrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerSpaceIndexMigrator.mockImplementation(
      () =>
        ({
          run: jest.fn(),
        } as unknown as RuleMigrationSpaceIndexMigratorModule.RuleMigrationSpaceIndexMigrator)
    );
  });

  describe('getSpaceListForMigrations', () => {
    it('should return a list of spaces with indices', async () => {
      const migrator = new RuleMigrationIndexMigrator(
        ruleMigrationIndexAdapters,
        esClientMock,
        mockLogger
      );
      await migrator.run();
      expect(mockPerSpaceIndexMigrator).toHaveBeenNthCalledWith(
        1,
        'space1',
        esClientMock,
        mockLogger,
        ruleMigrationIndexAdapters
      );
      expect(mockPerSpaceIndexMigrator).toHaveBeenNthCalledWith(
        2,
        'space2',
        esClientMock,
        mockLogger,
        ruleMigrationIndexAdapters
      );

      expect(mockPerSpaceIndexMigrator).toHaveBeenNthCalledWith(
        3,
        'space3',
        esClientMock,
        mockLogger,
        ruleMigrationIndexAdapters
      );
    });
    it('should return an empty list if no indices are found', async () => {
      (esClientMock.indices.get as jest.Mock).mockResolvedValueOnce({});
      const migrator = new RuleMigrationIndexMigrator(
        ruleMigrationIndexAdapters,
        esClientMock,
        mockLogger
      );
      await migrator.run();
      expect(mockLogger.debug).toHaveBeenCalledWith('No spaces or index found for index migration');
      expect(mockPerSpaceIndexMigrator).not.toHaveBeenCalled();
    });
  });
});
