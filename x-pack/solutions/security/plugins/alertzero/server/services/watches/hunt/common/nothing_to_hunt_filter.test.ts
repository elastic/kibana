/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICATOR_ELIGIBLE_FILTER } from '@kbn/alertzero-common';
import { MIN_HUNT_RELEVANCE, NOTHING_TO_HUNT_FILTER } from './nothing_to_hunt_filter';

describe('NOTHING_TO_HUNT_FILTER', () => {
  it('cuts strictly below the 0.5 baseline so KEV and enrich fallback reports pass', () => {
    expect(MIN_HUNT_RELEVANCE).toBe(0.5);
    expect(NOTHING_TO_HUNT_FILTER).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: [{ range: { 'extracted.relevance': { lt: 0.5 } } }],
        }),
      })
    );
  });

  it('requires no indicator record, no technique, no technique-mapped behavior, and a full read by enrich', () => {
    expect(NOTHING_TO_HUNT_FILTER).toEqual({
      bool: {
        filter: expect.any(Array),
        must_not: [
          INDICATOR_ELIGIBLE_FILTER,
          { exists: { field: 'extracted.ttps.techniques' } },
          {
            nested: {
              path: 'extracted.behaviors',
              query: { prefix: { 'extracted.behaviors.technique_id': 'T' } },
            },
          },
          { term: { 'extracted.core.context_mode': 'degraded_context' } },
        ],
      },
    });
  });

  it('tests the behavior technique id by prefix, because exists matches the empty string', () => {
    expect(JSON.stringify(NOTHING_TO_HUNT_FILTER)).not.toContain(
      '"exists":{"field":"extracted.behaviors'
    );
  });
});
