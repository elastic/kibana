/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GROUP_VALUE_FIELDS,
  buildGroupValueBucketExpression,
  buildGroupValueBucketQuery,
} from './entity_filters';

describe('buildGroupValueBucketExpression', () => {
  it.each([
    ['asset.criticality', 'high_impact', 'asset.criticality IN ("high_impact")'],
    // Unassigned is never stored, and the "no value" bucket is the same.
    ['asset.criticality', 'unassigned', 'asset.criticality IS NULL'],
    ['asset.criticality', null, 'asset.criticality IS NULL'],
    ['entity.source', 'aws', 'MV_CONTAINS(entity.source, "aws")'],
    ['entity.source', null, 'entity.source IS NULL'],
    ['entity.attributes.watchlists', 'wl-1', 'MV_CONTAINS(entity.attributes.watchlists, "wl-1")'],
    ['entity.attributes.watchlists', null, 'entity.attributes.watchlists IS NULL'],
    [
      'entity.risk.calculated_level',
      'High',
      '(entity.relationships.resolution.risk.calculated_level IN ("High") OR (entity.relationships.resolution.risk.calculated_level IS NULL AND entity.risk.calculated_level IN ("High")))',
    ],
    [
      'entity.risk.calculated_level',
      null,
      '(entity.relationships.resolution.risk.calculated_level IS NULL AND entity.risk.calculated_level IS NULL)',
    ],
    [
      'entity.risk.calculated_level',
      'Unknown',
      '(entity.relationships.resolution.risk.calculated_level IN ("Unknown") OR (entity.relationships.resolution.risk.calculated_level IS NULL AND entity.risk.calculated_level IN ("Unknown")))',
    ],
  ])('matches %s %s on the group value', (field, value, expected) => {
    expect(buildGroupValueBucketExpression(field, value)).toBe(expected);
  });

  it('covers the four group-valued fields', () => {
    expect(GROUP_VALUE_FIELDS).toEqual([
      'asset.criticality',
      'entity.source',
      'entity.attributes.watchlists',
      'entity.risk.calculated_level',
    ]);
  });
});

describe('buildGroupValueBucketQuery', () => {
  it('matches a value of a multi-value field as a term', () => {
    expect(buildGroupValueBucketQuery('entity.source', 'aws')).toEqual({
      term: { 'entity.source': 'aws' },
    });
  });

  it('matches the "no value" bucket as a missing field', () => {
    expect(buildGroupValueBucketQuery('entity.attributes.watchlists', null)).toEqual({
      bool: { must_not: { exists: { field: 'entity.attributes.watchlists' } } },
    });
  });

  it('matches unassigned criticality as a missing criticality', () => {
    expect(buildGroupValueBucketQuery('asset.criticality', 'unassigned')).toEqual({
      bool: {
        should: [{ bool: { must_not: { exists: { field: 'asset.criticality' } } } }],
        minimum_should_match: 1,
      },
    });
  });

  it('matches the Unknown bucket as the stored value, not as a missing level', () => {
    const query = JSON.stringify(
      buildGroupValueBucketQuery('entity.risk.calculated_level', 'Unknown')
    );

    expect(query).toContain('"Unknown"');
    expect(query).not.toContain('{"exists":{"field":"entity.risk.calculated_level"}}');
  });

  it('matches a risk level on the group level first', () => {
    expect(
      JSON.stringify(buildGroupValueBucketQuery('entity.risk.calculated_level', 'High'))
    ).toContain('entity.relationships.resolution.risk.calculated_level');
  });
});
