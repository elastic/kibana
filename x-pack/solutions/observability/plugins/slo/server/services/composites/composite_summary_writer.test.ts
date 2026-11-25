/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCompositeSlo } from '../fixtures/composite_slo';
import { buildCompositeSummaryDoc } from './composite_summary_writer';

describe('buildCompositeSummaryDoc', () => {
  it('encodes the composite definition into its wire form', () => {
    const compositeSlo = createCompositeSlo();

    const doc = buildCompositeSummaryDoc(
      compositeSlo,
      {
        sliValue: 0.995,
        errorBudget: { initial: 0.01, consumed: 0.5, remaining: 0.5, isEstimated: false },
        status: 'HEALTHY',
        fiveMinuteBurnRate: 0,
        oneHourBurnRate: 0,
        oneDayBurnRate: 0,
      },
      [],
      'default',
      []
    );

    expect(doc.compositeSlo).toEqual({
      id: compositeSlo.id,
      name: compositeSlo.name,
      description: compositeSlo.description,
      tags: compositeSlo.tags,
      objective: { target: 0.99 },
      timeWindow: { duration: '30d', type: 'rolling' },
      budgetingMethod: 'occurrences',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(JSON.parse(JSON.stringify(doc)).compositeSlo.timeWindow.duration).toBe('30d');
  });
});
