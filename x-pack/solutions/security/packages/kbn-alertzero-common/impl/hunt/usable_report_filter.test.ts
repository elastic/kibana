/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HUNT_USABLE_FILTER,
  INDICATOR_ELIGIBLE_FILTER,
  isRejectedExtractionMethod,
} from './usable_report_filter';

describe('HUNT_USABLE_FILTER', () => {
  it.each([
    ['lineage.extraction_method', 'pending'],
    ['extracted.gate.is_intelligence', false],
  ])('returns a must_not term excluding %s %s', (field, value) => {
    expect(HUNT_USABLE_FILTER).toMatchObject({
      bool: { must_not: expect.arrayContaining([{ term: { [field]: value } }]) },
    });
  });

  it('returns a must_not terms clause excluding the current and legacy rejected methods', () => {
    expect(HUNT_USABLE_FILTER).toMatchObject({
      bool: {
        must_not: expect.arrayContaining([
          {
            terms: {
              'lineage.extraction_method': ['enrich_workflow_rejected', 'workflow_v4_rejected'],
            },
          },
        ]),
      },
    });
  });

  it('uses no expensive query types', () => {
    expect(JSON.stringify(HUNT_USABLE_FILTER)).not.toMatch(/"(wildcard|regexp|prefix)"/);
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

describe('isRejectedExtractionMethod', () => {
  it.each(['enrich_workflow_rejected', 'workflow_v4_rejected'])('returns true for %p', (method) => {
    expect(isRejectedExtractionMethod(method)).toBe(true);
  });

  it.each(['enrich_workflow', 'workflow_v4', 'workflow_v5_rejected', 'pending', '', undefined])(
    'returns false for %p',
    (method) => {
      expect(isRejectedExtractionMethod(method)).toBe(false);
    }
  );
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
