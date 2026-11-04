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
import type { SavedObjectReference } from '@kbn/core/server';
import type { SLODefinition, StoredSLODefinition } from '../domain/models';
import { SO_SLO_TYPE } from '../saved_objects';
import { createKQLCustomIndicator, createSLO } from './fixtures/slo';
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
    it('preserves absence of preventCrossProjectSearch and projectRoutings', async () => {
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

      expect(slo.settings.preventCrossProjectSearch).toBeUndefined();
      expect(slo.settings.projectRoutings).toBeUndefined();
      expect(slo.settings.preventInitialBackfill).toBe(false);
    });
  });

  describe('persistence round trip', () => {
    const createAndCapture = async (
      slo: SLODefinition
    ): Promise<{ attributes: StoredSLODefinition; references: SavedObjectReference[] }> => {
      await repository.create(slo);

      expect(soClient.create).toHaveBeenCalledTimes(1);
      const [type, attributes, options] = soClient.create.mock.calls[0];
      expect(type).toBe(SO_SLO_TYPE);
      return {
        attributes: attributes as StoredSLODefinition,
        references: options?.references ?? [],
      };
    };

    const mockFindResponse = (
      attributes: StoredSLODefinition,
      references: SavedObjectReference[]
    ) => {
      soClient.find.mockResolvedValueOnce({
        saved_objects: [{ id: 'so-id', type: SO_SLO_TYPE, score: 0, references, attributes }],
        total: 1,
        per_page: 1,
        page: 1,
      });
    };

    it('stores dashboards as references and rehydrates them on read', async () => {
      const slo = createSLO({
        indicator: createKQLCustomIndicator(),
        artifacts: { dashboards: [{ id: 'dashboard-a' }, { id: 'dashboard-b' }] },
      });

      const { attributes, references } = await createAndCapture(slo);

      expect(attributes.artifacts).toEqual({
        dashboards: [{ refId: 'dashboard-0' }, { refId: 'dashboard-1' }],
      });
      expect(references).toEqual([
        { id: 'dashboard-a', type: 'dashboard', name: 'dashboard-0' },
        { id: 'dashboard-b', type: 'dashboard', name: 'dashboard-1' },
      ]);
      expect(attributes.createdAt).toBe(slo.createdAt.toISOString());
      expect(attributes.settings.syncDelay).toBe('1m');
      expect(attributes.indicator).toEqual(slo.indicator);

      mockFindResponse(attributes, references);
      await expect(repository.findById(slo.id)).resolves.toEqual(slo);
    });

    it('drops dashboards whose reference is missing', async () => {
      const slo = createSLO({ artifacts: { dashboards: [{ id: 'dashboard-a' }] } });
      const { attributes } = await createAndCapture(slo);

      mockFindResponse(attributes, []);
      const found = await repository.findById(slo.id);

      expect(found.artifacts).toEqual({ dashboards: [] });
    });

    it('reads and writes SLOs holding values beyond the request limits', async () => {
      const slo = createSLO({
        indicator: createKQLCustomIndicator({
          index: `${'remote-cluster:logs-*,'.repeat(100)}logs-*`,
          filter: `service.name: (${Array.from({ length: 1000 }, (_, i) => `svc-${i}`).join(
            ' or '
          )})`,
        }),
        tags: Array.from({ length: 1001 }, (_, i) => `tag-${i}`),
        groupBy: ['field.'.repeat(200).concat('name')],
      });
      expect(JSON.stringify(slo.indicator.params).length).toBeGreaterThan(8192);

      const { attributes, references } = await createAndCapture(slo);

      mockFindResponse(attributes, references);
      const found = await repository.findById(slo.id);
      expect(found).toEqual({ ...slo, artifacts: { dashboards: [] } });

      soClient.find.mockResolvedValueOnce({ saved_objects: [], total: 0, per_page: 1, page: 1 });
      await expect(repository.update(found)).resolves.toEqual(found);
    });
  });
});
