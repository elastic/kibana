/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../../common/entity_analytics/types';
import { parseTargetMetadataHits } from './use_fetch_grouped_data';

describe('parseTargetMetadataHits', () => {
  it('extracts name, type, and riskScore from well-formed hits', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:alice@okta',
            name: 'alice',
            EngineMetadata: { Type: EntityType.user },
            relationships: {
              resolution: { risk: { calculated_score_norm: 85.5 } },
            },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(1);
    expect(result.get('user:alice@okta')).toEqual({
      name: 'alice',
      type: EntityType.user,
      riskScore: 85.5,
    });
  });

  it('parses multiple hits into a map keyed by entity.id', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:alice@okta',
            name: 'alice',
            EngineMetadata: { Type: EntityType.user },
          },
        },
      },
      {
        _source: {
          entity: {
            id: 'host:srv-01',
            name: 'srv-01',
            EngineMetadata: { Type: EntityType.host },
            relationships: {
              resolution: { risk: { calculated_score_norm: 42.0 } },
            },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(2);
    expect(result.get('user:alice@okta')).toEqual({
      name: 'alice',
      type: EntityType.user,
      riskScore: null,
    });
    expect(result.get('host:srv-01')).toEqual({
      name: 'srv-01',
      type: EntityType.host,
      riskScore: 42.0,
    });
  });

  it('sets riskScore to null when resolution risk fields are absent', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:bob@ad',
            name: 'bob',
            EngineMetadata: { Type: EntityType.user },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.get('user:bob@ad')?.riskScore).toBeNull();
  });

  it('skips hits with missing entity.id', () => {
    const hits = [
      {
        _source: {
          entity: {
            name: 'no-id-entity',
            EngineMetadata: { Type: EntityType.user },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(0);
  });

  it('skips hits with missing entity.name', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:nameless',
            EngineMetadata: { Type: EntityType.user },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(0);
  });

  it('skips hits with missing EngineMetadata.Type', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:typeless',
            name: 'typeless-user',
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(0);
  });

  it('skips hits with null _source', () => {
    const hits = [{ _source: null }, { _source: undefined }];

    const result = parseTargetMetadataHits(hits as Array<{ _source?: unknown }>);

    expect(result.size).toBe(0);
  });

  it('skips hits with _source that has no entity field', () => {
    const hits = [
      {
        _source: { someOtherField: 'value' },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(0);
  });

  it('returns an empty map for empty hits array', () => {
    const result = parseTargetMetadataHits([]);

    expect(result.size).toBe(0);
  });
});
