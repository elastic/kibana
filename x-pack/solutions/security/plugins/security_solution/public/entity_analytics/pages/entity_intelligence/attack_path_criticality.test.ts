/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { buildHostCriticalitySearch, readHostCriticality } from './attack_path_criticality';

describe('attack path asset criticality', () => {
  it('queries only the current-space alias and host identities', () => {
    const query = buildHostCriticalitySearch('finance', ['same-name']);
    expect(query.index).toBe(getEntitiesAlias(ENTITY_LATEST, 'finance'));
    expect(query.index).not.toContain('*');
    expect(query.query.bool.filter).toContainEqual({
      term: { 'entity.EngineMetadata.Type': 'host' },
    });
    expect(query.aggs.hosts.filters.filters['same-name']).toEqual({
      term: { 'host.name': 'same-name' },
    });
  });
  it('does not borrow criticality from ambiguous same-name hosts', () => {
    const result = readHostCriticality({
      aggregations: {
        hosts: {
          buckets: {
            ambiguous: {
              entity_ids: { buckets: [{ key: 'host:a' }, { key: 'host:b' }] },
              criticalities: { buckets: [{ key: 'extreme_impact' }] },
            },
            resolved: {
              entity_ids: { buckets: [{ key: 'host:c' }] },
              criticalities: { buckets: [{ key: 'high_impact' }] },
            },
          },
        },
      },
    });
    expect(result.has('ambiguous')).toBe(false);
    expect(result.get('resolved')).toBe('high_impact');
  });
  it('does not resolve truncated IDs or conflicting criticality values', () => {
    const result = readHostCriticality({
      aggregations: {
        hosts: {
          buckets: {
            truncated: {
              entity_ids: { buckets: [{ key: 'host:a' }], sum_other_doc_count: 1 },
              criticalities: { buckets: [{ key: 'high_impact' }] },
            },
            conflicting: {
              entity_ids: { buckets: [{ key: 'host:c' }] },
              criticalities: { buckets: [{ key: 'high_impact' }, { key: 'low_impact' }] },
            },
          },
        },
      },
    });
    expect(result.size).toBe(0);
  });
  it('does not trust incomplete shard responses', () => {
    expect(readHostCriticality({ timed_out: true }).size).toBe(0);
    expect(readHostCriticality({ _shards: { failed: 1 } }).size).toBe(0);
  });
});
