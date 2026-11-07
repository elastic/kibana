/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../common/entity_analytics/types';
import type { RelationshipEntity } from './use_entity_relationships';
import { buildEventContextQuery, toEventContextByNeighbor } from './use_entity_relationships';

const focus: RelationshipEntity = {
  id: 'user:a.rodriguez',
  name: 'a.rodriguez',
  kind: EntityType.user,
  identifierValue: 'a.rodriguez',
};

const neighbors: RelationshipEntity[] = [
  {
    id: 'host:jump-box-01',
    name: 'jump-box-01',
    kind: EntityType.host,
    identifierValue: 'jump-box-01',
  },
  { id: 'ip:10.0.6.10', name: '10.0.6.10', kind: 'ip', identifierValue: '10.0.6.10' },
];

describe('buildEventContextQuery', () => {
  it('scopes to raw events for the focus entity within the time range', () => {
    const query = buildEventContextQuery(focus, neighbors, '30d') as {
      size: number;
      query: { bool: { filter: object[] } };
      aggs: { neighbors: { filters: { filters: Record<string, object> } } };
    };

    expect(query.size).toBe(0);
    expect(query.query.bool.filter).toContainEqual({ term: { 'event.kind': 'event' } });
    expect(query.query.bool.filter).toContainEqual({
      range: { '@timestamp': { gte: 'now-30d', lte: 'now' } },
    });
    // One named filter bucket per neighbor, keyed by neighbor id.
    expect(Object.keys(query.aggs.neighbors.filters.filters)).toEqual([
      'host:jump-box-01',
      'ip:10.0.6.10',
    ]);
  });

  it('aggregates each category on its aggregatable field (keyword/ip, no .keyword suffix)', () => {
    // The seed data stream maps these as keyword/ip directly, so a raw
    // `terms`/`ip` agg is correct — appending `.keyword` would break it.
    const query = buildEventContextQuery(focus, [neighbors[0]], '30d') as {
      aggs: {
        neighbors: {
          aggs: Record<
            string,
            {
              filter: { term: Record<string, string> };
              aggs: { targets: { terms: { field: string } } };
            }
          >;
        };
      };
    };
    const categoryAggs = query.aggs.neighbors.aggs;
    expect(categoryAggs.network_targets.filter).toEqual({ term: { 'event.category': 'network' } });
    expect(categoryAggs.network_targets.aggs.targets.terms.field).toBe('destination.ip');
    expect(categoryAggs.auth_targets.filter).toEqual({
      term: { 'event.category': 'authentication' },
    });
    expect(categoryAggs.auth_targets.aggs.targets.terms.field).toBe('host.name');
    expect(categoryAggs.process_targets.aggs.targets.terms.field).toBe('process.name');
    expect(categoryAggs.file_targets.aggs.targets.terms.field).toBe('file.path');
    // Guard against a regression that appends `.keyword` to any detail field.
    const detailFields = Object.values(categoryAggs).map((agg) => agg.aggs.targets.terms.field);
    expect(detailFields.every((field) => !field.endsWith('.keyword'))).toBe(true);
  });

  it('matches an IP neighbor on both source and destination', () => {
    const query = buildEventContextQuery(focus, [neighbors[1]], '7d') as {
      aggs: {
        neighbors: { filters: { filters: Record<string, { bool?: { should: object[] } }> } };
      };
    };
    const ipFilter = query.aggs.neighbors.filters.filters['ip:10.0.6.10'];
    expect(ipFilter.bool?.should).toEqual([
      { term: { 'source.ip': '10.0.6.10' } },
      { term: { 'destination.ip': '10.0.6.10' } },
    ]);
  });
});

describe('toEventContextByNeighbor', () => {
  it('returns an empty map when aggregations are missing', () => {
    expect(toEventContextByNeighbor(undefined).size).toBe(0);
  });

  it('maps neighbor buckets into edge contexts, dropping empty neighbors', () => {
    const contexts = toEventContextByNeighbor({
      neighbors: {
        buckets: {
          'host:jump-box-01': {
            auth_targets: { targets: { buckets: [{ key: 'jump-box-01', doc_count: 5 }] } },
            network_targets: { targets: { buckets: [] } },
          },
          'ip:10.0.6.10': {
            network_targets: {
              targets: { buckets: [{ key: '10.0.6.10:4444', doc_count: 8 }] },
            },
          },
          'user:noise': {
            network_targets: { targets: { buckets: [] } },
            process_targets: { targets: { buckets: [] } },
          },
        },
      },
    });

    expect([...contexts.keys()].sort()).toEqual(['host:jump-box-01', 'ip:10.0.6.10']);
    expect(contexts.get('host:jump-box-01')?.dominant).toMatchObject({
      kind: 'authentication',
      count: 5,
    });
    expect(contexts.get('ip:10.0.6.10')?.dominant).toMatchObject({
      kind: 'network',
      detail: '10.0.6.10:4444',
    });
  });
});
