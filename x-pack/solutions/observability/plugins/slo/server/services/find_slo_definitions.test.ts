/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  type ScopedClusterClientMock,
} from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';
import * as computeHealth from '../domain/services/compute_health';
import { FindSLODefinitions } from './find_slo_definitions';
import { createSLO } from './fixtures/slo';
import { createSLORepositoryMock } from './mocks';
import type { SLODefinitionRepository } from './slo_definition_repository';

jest.spyOn(computeHealth, 'computeHealth');

describe('FindSLODefinitions with Health validation', () => {
  let mockRepository: jest.Mocked<SLODefinitionRepository>;
  let findSLODefinitions: FindSLODefinitions;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockLogger = loggingSystemMock.createLogger();
    findSLODefinitions = new FindSLODefinitions(
      mockRepository,
      mockScopedClusterClient,
      mockLogger
    );
  });

  describe('default behavior', () => {
    it('calls the repository with the correct parameters', async () => {
      const slo = createSLO();
      mockRepository.search.mockResolvedValueOnce({
        results: [slo],
        total: 1,
        page: 1,
        perPage: 100,
      });

      await findSLODefinitions.execute({
        search: 'some search',
        page: '2',
        perPage: '50',
        includeOutdatedOnly: false,
        tags: 'tag1,tag2',
      });

      expect(mockRepository.search).toHaveBeenCalledWith({
        search: 'some search',
        pagination: { page: 2, perPage: 50 },
        filters: { includeOutdatedOnly: false, tags: ['tag1', 'tag2'] },
      });

      expect(computeHealth.computeHealth).not.toHaveBeenCalled();
    });
  });

  describe('with includeHealth', () => {
    it('calls computeHealth with the correct parameters', async () => {
      const slo = createSLO();
      mockRepository.search.mockResolvedValueOnce({
        results: [slo],
        total: 1,
        page: 1,
        perPage: 100,
      });
      mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
        transforms: [],
        count: 0,
      });

      await findSLODefinitions.execute({
        includeHealth: true,
      });

      expect(computeHealth.computeHealth).toHaveBeenCalledWith([slo], {
        scopedClusterClient: mockScopedClusterClient,
      });
    });

    it('returns definitions without health when computeHealth fails', async () => {
      const slo = createSLO();
      mockRepository.search.mockResolvedValueOnce({
        results: [slo],
        total: 1,
        page: 1,
        perPage: 100,
      });
      jest
        .spyOn(computeHealth, 'computeHealth')
        .mockRejectedValueOnce(new Error('Failed to compute health'));

      const result = await findSLODefinitions.execute({
        includeHealth: true,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to compute SLO health: Error: Failed to compute health'
      );
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).not.toHaveProperty('health');
    });
  });
});
