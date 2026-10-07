/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { buildEntityAggs } from './build_entity_aggs';

describe('buildEntityAggs', () => {
  const { aggs, runtime_mappings: runtimeMappings } = buildEntityAggs({
    alertCount: 20,
    entityTypes: ['host', 'user'],
  });

  it('derives one id per requested type with the Entity Store generator, as the Attack Discovery badges do', () => {
    expect(runtimeMappings).toEqual({
      entity_host: euid.painless.getEuidRuntimeMapping('host'),
      entity_user: euid.painless.getEuidRuntimeMapping('user'),
    });
  });

  it('derives nothing for a type that was not requested', () => {
    expect(Object.keys(runtimeMappings)).not.toContain('entity_service');
    expect(Object.keys(aggs).filter((name) => name.startsWith('service'))).toEqual([]);
  });

  it('ranks every entity of each type by alert count, ties broken by id', () => {
    expect(aggs.host_entities).toEqual(
      expect.objectContaining({
        terms: {
          field: 'entity_host',
          order: [{ _count: 'desc' }, { _key: 'asc' }],
          size: 20,
        },
      })
    );
  });

  it('reads the most recent alert of each entity for its name', () => {
    expect(aggs.user_entities).toEqual(
      expect.objectContaining({
        aggs: {
          latest: {
            top_hits: {
              _source: false,
              fields: ['host.name', 'user.name', 'service.name'],
              size: 1,
              sort: [{ '@timestamp': { order: 'desc' } }],
            },
          },
        },
      })
    );
  });

  it('counts the distinct entities of each type', () => {
    expect(aggs.host_count).toEqual({ cardinality: { field: 'entity_host' } });
    expect(aggs.user_count).toEqual({ cardinality: { field: 'entity_user' } });
  });
});
