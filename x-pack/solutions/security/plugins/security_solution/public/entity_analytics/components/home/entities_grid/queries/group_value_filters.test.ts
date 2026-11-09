/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { convertFiltersToESQLExpression } from '@kbn/esql-utils';
import { createGroupFilter, getNullGroupFilter } from '@kbn/grouping/src/containers/query/helpers';
import { buildGroupValueBucketsExpression, splitGroupValueFilters } from './group_value_filters';

describe('splitGroupValueFilters', () => {
  const entityTypeFilters = createGroupFilter('entity.EngineMetadata.Type', ['host']) as Filter[];

  it('takes a value bucket of a group-valued field out of the filters', () => {
    const { groupValueBuckets, otherFilters } = splitGroupValueFilters(
      [...createGroupFilter('entity.source', ['aws']), ...entityTypeFilters] as Filter[],
      'resolved'
    );

    expect(groupValueBuckets).toEqual([{ field: 'entity.source', value: 'aws' }]);
    expect(otherFilters).toEqual(entityTypeFilters);
    expect(buildGroupValueBucketsExpression(groupValueBuckets)).toBe(
      'MV_CONTAINS(entity.source, "aws")'
    );
  });

  it('reads the "no value" bucket as a null value', () => {
    const { groupValueBuckets, otherFilters } = splitGroupValueFilters(
      getNullGroupFilter('asset.criticality') as Filter[],
      'resolved'
    );

    expect(groupValueBuckets).toEqual([{ field: 'asset.criticality', value: null }]);
    expect(otherFilters).toEqual([]);
    expect(buildGroupValueBucketsExpression(groupValueBuckets)).toBe('asset.criticality IS NULL');
  });

  it('leaves the filters of individual rows as they are', () => {
    const filters = createGroupFilter('entity.source', ['aws']) as Filter[];

    expect(splitGroupValueFilters(filters, 'individual')).toEqual({
      groupValueBuckets: [],
      otherFilters: filters,
    });
  });

  it('has no condition without group-valued buckets', () => {
    expect(buildGroupValueBucketsExpression([])).toBeUndefined();
  });
});

describe('the "no value" bucket filter of @kbn/grouping', () => {
  // The leaf rows of other fields' "no value" bucket are not filtered by the bucket at all.
  it('has no ES|QL form, so the search drops it', () => {
    const { esqlExpression, untranslatableFilters } = convertFiltersToESQLExpression(
      getNullGroupFilter('entity.EngineMetadata.Type') as Filter[]
    );

    expect(esqlExpression).toBe('');
    expect(untranslatableFilters).toHaveLength(1);
  });
});
