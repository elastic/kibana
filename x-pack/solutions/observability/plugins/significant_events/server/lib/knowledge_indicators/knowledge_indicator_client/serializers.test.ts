/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQuery } from '@kbn/significant-events-schema';
import { toStoredQuery } from './serializers';

function makeQuery(overrides: Partial<StreamQuery> = {}): StreamQuery {
  return {
    id: 'q-1',
    title: 'Test query',
    description: 'desc',
    type: 'match',
    esql: { query: 'FROM logs-* | WHERE x == 1' },
    ...overrides,
  };
}

describe('toStoredQuery', () => {
  it('normalizes feature ids so they match the stored feature slug', () => {
    const stored = toStoredQuery('logs.test', makeQuery({ features: [{ id: ' Svc-F ' }] }), false);

    expect(stored.query.features).toEqual([{ id: 'svc-f' }]);
  });

  it('leaves an already-normalized feature id unchanged', () => {
    const stored = toStoredQuery('logs.test', makeQuery({ features: [{ id: 'svc-a' }] }), false);

    expect(stored.query.features).toEqual([{ id: 'svc-a' }]);
  });

  it('leaves a query with no features as undefined', () => {
    const stored = toStoredQuery('logs.test', makeQuery(), false);

    expect(stored.query.features).toBeUndefined();
  });
});
