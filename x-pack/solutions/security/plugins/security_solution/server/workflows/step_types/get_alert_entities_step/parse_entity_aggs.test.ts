/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEntityAggs } from './parse_entity_aggs';

const aggregations = {
  host_count: { value: 3 },
  host_entities: {
    buckets: [
      {
        doc_count: 4,
        key: 'host:572750b8',
        latest: { hits: { hits: [{ fields: { 'host.name': ['SRVWIN01'] } }] } },
      },
      { doc_count: 1, key: 'host:unnamed', latest: { hits: { hits: [{ fields: {} }] } } },
      { doc_count: 1, key: 'host:nohits' },
    ],
  },
  user_count: { value: 1 },
  user_entities: {
    buckets: [
      {
        doc_count: 4,
        key: 'user:Administrator@572750b8@local',
        latest: {
          hits: {
            hits: [{ fields: { 'host.name': ['SRVWIN01'], 'user.name': ['Administrator'] } }],
          },
        },
      },
    ],
  },
};

describe('parseEntityAggs', () => {
  it('reads a type’s entities with their counts, names and distinct total', () => {
    expect(parseEntityAggs({ aggregations, entityType: 'host' })).toEqual({
      entities: [
        { count: 4, id: 'host:572750b8', name: 'SRVWIN01', type: 'host' },
        { count: 1, id: 'host:unnamed', name: undefined, type: 'host' },
        { count: 1, id: 'host:nohits', name: undefined, type: 'host' },
      ],
      total: 3,
    });
  });

  it('names a local user from the host of its most recent alert', () => {
    expect(parseEntityAggs({ aggregations, entityType: 'user' }).entities).toEqual([
      {
        count: 4,
        id: 'user:Administrator@572750b8@local',
        name: 'Administrator@SRVWIN01',
        type: 'user',
      },
    ]);
  });

  it.each([[undefined], [{}]])('reads nothing from %p', (empty) => {
    expect(parseEntityAggs({ aggregations: empty, entityType: 'host' })).toEqual({
      entities: [],
      total: 0,
    });
  });
});
