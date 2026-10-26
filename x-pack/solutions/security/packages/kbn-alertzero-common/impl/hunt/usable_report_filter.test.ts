/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_USABLE_FILTER, INDICATOR_ELIGIBLE_FILTER } from './usable_report_filter';

describe('HUNT_USABLE_FILTER', () => {
  it.each([
    ['lineage.extraction_method', 'pending'],
    ['lineage.extraction_method', 'workflow_v4_rejected'],
    ['extracted.gate.is_intelligence', false],
  ])('returns a must_not term excluding %s %s', (field, value) => {
    expect(HUNT_USABLE_FILTER).toMatchObject({
      bool: { must_not: expect.arrayContaining([{ term: { [field]: value } }]) },
    });
  });

  it('returns an exists clause on lineage.extraction_method in filter', () => {
    expect(HUNT_USABLE_FILTER).toMatchObject({
      bool: {
        filter: expect.arrayContaining([{ exists: { field: 'lineage.extraction_method' } }]),
      },
    });
  });

  it('returns no nested clause', () => {
    expect(JSON.stringify(HUNT_USABLE_FILTER)).not.toContain('"nested"');
  });
});

describe('INDICATOR_ELIGIBLE_FILTER', () => {
  it('returns the nested extracted.iocs.value exists clause', () => {
    expect(INDICATOR_ELIGIBLE_FILTER).toEqual({
      nested: {
        path: 'extracted.iocs',
        query: { exists: { field: 'extracted.iocs.value' } },
      },
    });
  });
});
