/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFirstOrLastSeenQuery as buildQuery } from './query.first_or_last_seen.dsl';
import { mockOptions, expectedDsl } from './__mocks__';

describe('buildQuery', () => {
  test('build query from options correctly', () => {
    expect(buildQuery(mockOptions)).toEqual(expectedDsl);
  });

  test('includes host entity filter when hostEntityIdentifiers is provided', () => {
    const options = {
      ...mockOptions,
      hostEntityIdentifiers: { 'host.name': 'siem-kibana', 'host.domain': 'example.com' },
    };
    const dsl = buildQuery(options);
    const filter = dsl.query?.bool?.filter as Array<{
      bool?: unknown;
      term?: Record<string, string>;
    }>;
    expect(Array.isArray(filter)).toBe(true);
    expect(filter.length).toBeGreaterThanOrEqual(1);
    const hasEntityFilter = filter.some((clause) => clause?.bool != null);
    expect(hasEntityFilter).toBe(true);
    const boolClause = filter.find((clause) => clause?.bool != null);
    const hostNameTerm = (boolClause?.bool as { filter?: Array<{ term?: Record<string, string> }> })
      ?.filter?.find((c) => c?.term?.['host.name']);
    expect(hostNameTerm).toEqual({ term: { 'host.name': 'siem-kibana' } });
  });
});
