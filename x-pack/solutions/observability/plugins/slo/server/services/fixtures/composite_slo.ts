/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storedCompositeSloDefinitionSchema } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';
import type { CompositeSLODefinition, StoredCompositeSLODefinition } from '../../domain/models';
import { thirtyDaysRolling } from './time_window';

export const createCompositeSlo = (
  overrides: Partial<CompositeSLODefinition> = {}
): CompositeSLODefinition => {
  const now = new Date('2024-01-01T00:00:00.000Z');
  return {
    id: uuidv4(),
    name: 'Test Composite SLO',
    description: 'A test composite SLO',
    members: [
      { sloId: uuidv4(), weight: 1 },
      { sloId: uuidv4(), weight: 2 },
    ],
    compositeMethod: 'weightedAverage',
    timeWindow: thirtyDaysRolling(),
    budgetingMethod: 'occurrences',
    objective: { target: 0.99 },
    tags: ['test'],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    createdBy: 'testuser',
    updatedBy: 'testuser',
    version: 1,
    ...overrides,
  };
};

export const toStoredCompositeSlo = (
  compositeSlo: CompositeSLODefinition
): StoredCompositeSLODefinition => storedCompositeSloDefinitionSchema.encode(compositeSlo);
