/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, type ScopedClusterClientMock } from '@kbn/core/server/mocks';
import type { FindSLODefinitionsWithHealthResponse } from '@kbn/slo-schema';
import { createSLO } from './fixtures/slo';
import { createSLORepositoryMock } from './mocks';
import type { SLORepository } from './slo_repository';
import { FindSLODefinitions } from './find_slo_definitions';
import { GetSLOHealth } from './get_slo_health';

jest.mock('./get_slo_health');

const MockedGetSLOHealth = GetSLOHealth as jest.MockedClass<typeof GetSLOHealth>;

describe('FindSLODefinitions with Health validation', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let findSLODefinitions: FindSLODefinitions;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let mockGetSLOHealth: jest.Mocked<GetSLOHealth>;

  const slo = createSLO();
  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    findSLODefinitions = new FindSLODefinitions(mockRepository, mockScopedClusterClient);
    mockGetSLOHealth = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetSLOHealth>;

    MockedGetSLOHealth.mockImplementation(() => mockGetSLOHealth);
    mockGetSLOHealth.execute.mockResolvedValue([
      {
        sloId: slo.id,
        sloRevision: slo.revision,
        sloName: slo.name,
        health: {
          overall: 'healthy',
          rollup: { status: 'healthy' },
          summary: { status: 'healthy' },
        },
        state: 'running',
      },
    ]);
  });

  const results = {
    page: 1,
    perPage: 10,
    total: 1,
    results: [slo],
  };

  describe('validate health response', () => {
    it('calls the repository with includeHealth', async () => {
      mockRepository.search.mockResolvedValueOnce(results);

      const result: FindSLODefinitionsWithHealthResponse = await findSLODefinitions.execute({
        includeHealth: true,
      });

      expect(mockRepository.search).toHaveBeenCalledWith(
        '',
        { page: 1, perPage: 100 },
        {
          includeOutdatedOnly: false,
          tags: [],
        }
      );

      expect(mockGetSLOHealth.execute).toHaveBeenCalledWith({
        list: [
          {
            sloId: slo.id,
            sloInstanceId: '*',
            sloRevision: slo.revision,
            sloName: slo.name,
          },
        ],
      });

      expect(result.results[0].health).toEqual({
        overall: 'healthy',
        rollup: { status: 'healthy' },
        summary: { status: 'healthy' },
      });
    });

    it('does not call getSLOHealth without includeHealth', async () => {
      mockRepository.search.mockResolvedValueOnce(results);

      const result: FindSLODefinitionsWithHealthResponse = await findSLODefinitions.execute({
        includeHealth: false,
      });

      expect(mockGetSLOHealth.execute).not.toHaveBeenCalled();
      expect(mockRepository.search).toHaveBeenCalledWith(
        '',
        { page: 1, perPage: 100 },
        {
          includeOutdatedOnly: false,
          tags: [],
        }
      );

      expect(result.results[0].health).toEqual(undefined);
    });
  });
});
