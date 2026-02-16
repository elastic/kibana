/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntityShouldClauses } from './query_utils';

describe('query_utils', () => {
  it('chunks terms per field', () => {
    const entitiesByField = new Map<string, Set<string>>([
      ['host.name', new Set(['a', 'b', 'c'])],
      ['user.name', new Set(['u1'])],
    ]);

    const clauses = buildEntityShouldClauses({ entitiesByField, maxTermsPerQuery: 2 });
    // host.name -> 2 chunks, user.name -> 1 chunk
    expect(clauses).toHaveLength(3);
  });

  // NOTE: ignore_entities are applied during entity extraction/scoring, not as ES query must_not filters.
});
