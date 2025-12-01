/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, type ScopedClusterClientMock } from '@kbn/core/server/mocks';
import * as computeHealth from '../domain/services/compute_health';
import { FindSLODefinitions } from './find_slo_definitions';
import { createSLO } from './fixtures/slo';
import { createSLORepositoryMock } from './mocks';
import type { SLORepository } from './slo_repository';

jest.spyOn(computeHealth, 'computeHealth');

describe('FindSLODefinitions with Health validation', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let findSLODefinitions: FindSLODefinitions;
  let mockScopedClusterClient: ScopedClusterClientMock;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    findSLODefinitions = new FindSLODefinitions(mockRepository, mockScopedClusterClient);
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

      expect(mockRepository.search).toHaveBeenCalledWith(
        'some search',
        { page: 2, perPage: 50 },
        { includeOutdatedOnly: false, tags: ['tag1', 'tag2'] }
      );
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
  });
});
