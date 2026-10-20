/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLONotFound } from '../../errors';
import { createCompositeSlo } from '../fixtures/composite_slo';
import { createCompositeSLORepositoryMock } from '../mocks';
import type { CompositeSLORepository } from './composite_slo_repository';
import { GetCompositeSLODefinition } from './get_composite_slo_definition';

describe('GetCompositeSLODefinition', () => {
  let mockCompositeRepo: jest.Mocked<CompositeSLORepository>;
  let getCompositeSLODefinition: GetCompositeSLODefinition;

  beforeEach(() => {
    mockCompositeRepo = createCompositeSLORepositoryMock();
    getCompositeSLODefinition = new GetCompositeSLODefinition(mockCompositeRepo);
  });

  it('returns the definition read from the repository', async () => {
    const compositeSlo = createCompositeSlo({
      id: 'composite-id',
      name: 'My Composite',
      description: 'desc',
    });
    mockCompositeRepo.findById.mockResolvedValue(compositeSlo);

    const result = await getCompositeSLODefinition.execute('composite-id');

    expect(mockCompositeRepo.findById).toHaveBeenCalledWith('composite-id');
    expect(result).toMatchObject({
      id: 'composite-id',
      name: 'My Composite',
      description: 'desc',
      members: compositeSlo.members,
      timeWindow: compositeSlo.timeWindow,
      objective: compositeSlo.objective,
    });
    expect(result).not.toHaveProperty('summary');
  });

  it('propagates SLONotFound when the repository throws', async () => {
    mockCompositeRepo.findById.mockRejectedValue(new SLONotFound('Composite SLO [x] not found'));

    await expect(getCompositeSLODefinition.execute('x')).rejects.toBeInstanceOf(SLONotFound);
  });
});
