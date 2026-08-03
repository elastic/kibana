/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { DefaultSLODefinitionRepository } from './slo_definition_repository';

describe('DefaultSLODefinitionRepository', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let logger: jest.Mocked<MockedLogger>;
  let repository: DefaultSLODefinitionRepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggingSystemMock.createLogger();
    repository = new DefaultSLODefinitionRepository(soClient, logger);
  });

  describe('legacy backfill', () => {
    it('backfills preventCrossProjectSearch to false when absent from stored settings', async () => {
      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'so-id',
            type: 'slo',
            score: 0,
            references: [],
            attributes: {
              id: 'test-slo-12345678',
              name: 'my slo',
              description: '',
              indicator: {
                type: 'sli.kql.custom',
                params: {
                  index: 'my-index',
                  filter: '',
                  good: 'http.status_code: 200',
                  total: '*',
                  timestampField: '@timestamp',
                },
              },
              timeWindow: { duration: '7d', type: 'rolling' },
              budgetingMethod: 'occurrences',
              objective: { target: 0.99 },
              settings: {
                syncDelay: '1m',
                frequency: '1m',
                preventInitialBackfill: false,
                // preventCrossProjectSearch intentionally absent (old stored SLO)
              },
              enabled: true,
              tags: [],
              groupBy: '*',
              revision: 1,
              version: 2,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          },
        ],
        total: 1,
        per_page: 1,
        page: 1,
      });

      const slo = await repository.findById('test-slo-12345678');

      expect(slo.settings.preventCrossProjectSearch).toBe(false);
    });
  });
});
