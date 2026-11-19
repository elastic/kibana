/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { INDICATOR_ELIGIBLE_FILTER } from '@kbn/alertzero-common';

/**
 * Enrich scores relevance 0 for commentary, 0.5 for indicators only, 0.75 for described
 * techniques and 1 for a concrete detection behavior. 0.5 is also the neutral baseline other
 * writers stamp (the KEV adapter, the enrich failure fallback), so the cut is strict `lt`.
 */
export const MIN_HUNT_RELEVANCE = 0.5;

/**
 * Reports a scheduled sweep has nothing to hunt for: scored below the baseline by enrich and
 * carrying no indicator record, no technique, and no behavior mapped to a technique.
 *
 * A report with no `extracted.relevance` does not match (a range on a missing field matches
 * nothing), so it stays selectable.
 *
 * `ttps.techniques` is read for completeness: today only seeded documents carry it, since enrich
 * writes `extracted.behaviors[].technique_id` instead. The behavior test is `prefix`, not
 * `exists`, because enrich stores an empty string for a behavior it could not map.
 */
export const NOTHING_TO_HUNT_FILTER: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [{ range: { 'extracted.relevance': { lt: MIN_HUNT_RELEVANCE } } }],
    must_not: [
      INDICATOR_ELIGIBLE_FILTER,
      { exists: { field: 'extracted.ttps.techniques' } },
      {
        nested: {
          path: 'extracted.behaviors',
          query: { prefix: { 'extracted.behaviors.technique_id': 'T' } },
        },
      },
    ],
  },
};
