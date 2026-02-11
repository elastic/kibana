/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { createSLO } from './fixtures/slo';
import { GetSLOHealth } from './get_slo_health';
import { createSLORepositoryMock } from './mocks';
import type { SLODefinitionRepository } from './slo_definition_repository';
import * as compute_health from '../domain/services/compute_health';

jest.spyOn(compute_health, 'computeHealth');

describe('GetSLOHealth', () => {
  let mockRepository: jest.Mocked<SLODefinitionRepository>;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let getSLOHealth: GetSLOHealth;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    getSLOHealth = new GetSLOHealth(mockScopedClusterClient, mockRepository);
  });

  it('returns an empty result when no SLOs are provided', async () => {
    const result = await getSLOHealth.execute({ list: [] });
    expect(result).toEqual([]);
  });

  it('filters out items without definition', async () => {
    const slo = createSLO();
    mockRepository.findAllByIds.mockResolvedValueOnce([slo]);
    mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
      transforms: [],
      count: 0,
    });

    const result = await getSLOHealth.execute({
      list: [
        { id: slo.id, instanceId: ALL_VALUE },
        { id: 'inexistant', instanceId: ALL_VALUE },
      ],
    });

    expect(result).toEqual([
      {
        id: slo.id,
        instanceId: ALL_VALUE,
        revision: slo.revision,
        name: slo.name,
        health: {
          isProblematic: true,
          rollup: {
            isProblematic: true,
            missing: true,
            status: 'unavailable',
            state: 'unavailable',
          },
          summary: {
            isProblematic: true,
            missing: true,
            status: 'unavailable',
            state: 'unavailable',
          },
        },
      },
    ]);
  });

  it('delegates to computeHealth with the correct parameters', async () => {
    const slo1 = createSLO({ id: 'slo_1' });
    const slo2 = createSLO({ id: 'slo_2', enabled: false });
    mockRepository.findAllByIds.mockResolvedValueOnce([slo1, slo2]);
    mockScopedClusterClient.asSecondaryAuthUser.transform.getTransformStats.mockResolvedValue({
      transforms: [],
      count: 0,
    });

    await getSLOHealth.execute({
      list: [
        { id: 'slo_1', instanceId: ALL_VALUE },
        { id: 'slo_2', instanceId: 'instance_1' },
      ],
    });
    expect(compute_health.computeHealth).toHaveBeenCalledWith(
      [
        {
          id: 'slo_1',
          instanceId: ALL_VALUE,
          revision: slo1.revision,
          name: slo1.name,
          enabled: slo1.enabled,
        },
        {
          id: 'slo_2',
          instanceId: 'instance_1',
          revision: slo2.revision,
          name: slo2.name,
          enabled: slo2.enabled,
        },
      ],
      { scopedClusterClient: mockScopedClusterClient }
    );
  });
});
