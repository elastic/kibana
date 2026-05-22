/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { ENTITY_FIELDS, ENTITY_GROUPING_OPTIONS } from '../constants';
import { buildResolutionGroupingQuery, getAggregationsByGroupField } from './use_entity_grouping';

describe('buildResolutionGroupingQuery', () => {
  const defaultParams = {
    filters: [],
    pageIndex: 0,
    pageSize: 25,
  };

  it('produces a runtime field that emits resolved_to for aliases, entity.id for targets', () => {
    const result = buildResolutionGroupingQuery(defaultParams);

    const script = result.runtime_mappings?.groupByField?.script;
    const scriptSource = (
      typeof script === 'object' && script !== null && 'source' in script ? script.source : script
    ) as string;
    expect(scriptSource).toContain(ENTITY_FIELDS.RESOLVED_TO);
    expect(scriptSource).toContain(ENTITY_FIELDS.ENTITY_ID);
  });

  it('emits the bucket risk score runtime script with alias-skip and the resolution/individual COALESCE pair', () => {
    const result = buildResolutionGroupingQuery(defaultParams);

    const script = result.runtime_mappings?.bucketRiskScore?.script;
    const scriptSource = (
      typeof script === 'object' && script !== null && 'source' in script ? script.source : script
    ) as string;
    expect(scriptSource).toContain(ENTITY_FIELDS.RESOLVED_TO);
    expect(scriptSource).toContain(ENTITY_FIELDS.RESOLUTION_RISK_SCORE);
    expect(scriptSource).toContain(ENTITY_FIELDS.ENTITY_RISK);
  });

  it('includes resolutionRiskScore max aggregation', () => {
    const result = buildResolutionGroupingQuery(defaultParams);

    const aggs = result.aggs?.groupByFields?.aggs;
    expect(aggs?.resolutionRiskScore).toEqual({
      max: { field: ENTITY_FIELDS.RESOLUTION_RISK_SCORE },
    });
  });

  it('does not include entity name or type sub-aggs (fetched separately via useFetchTargetMetadata)', () => {
    const result = buildResolutionGroupingQuery(defaultParams);

    const aggs = result.aggs?.groupByFields?.aggs;
    expect(aggs).not.toHaveProperty('resolutionEntityName');
    expect(aggs).not.toHaveProperty('resolutionEntityType');
  });

  it('orders by bucketRiskScore desc then _count desc', () => {
    const result = buildResolutionGroupingQuery(defaultParams);

    const order = result.aggs?.groupByFields?.terms?.order;
    expect(order).toEqual([{ bucketRiskScore: 'desc' }, { _count: 'desc' }]);
  });

  it('applies pagination via bucket_sort', () => {
    const result = buildResolutionGroupingQuery({
      filters: [],
      pageIndex: 2,
      pageSize: 10,
    });

    const bucketSort = result.aggs?.groupByFields?.aggs?.bucket_truncate;
    expect(bucketSort).toEqual({
      bucket_sort: {
        from: 20,
        size: 10,
      },
    });
  });

  it('includes all provided filters in query.bool.filter', () => {
    const filters: ESBoolQuery[] = [
      { bool: { must: [], must_not: [], should: [], filter: [{ term: { field1: 'value1' } }] } },
      { bool: { must: [], must_not: [], should: [], filter: [{ term: { field2: 'value2' } }] } },
      { bool: { must: [], must_not: [], should: [], filter: [{ term: { field3: 'value3' } }] } },
    ];

    const result = buildResolutionGroupingQuery({
      ...defaultParams,
      filters,
    });

    expect(result.query?.bool?.filter).toHaveLength(3);
    expect(result.query?.bool?.filter).toEqual(filters);
  });

  it('sets size: 0 and _source: false', () => {
    const result = buildResolutionGroupingQuery(defaultParams);

    expect(result.size).toBe(0);
    expect(result._source).toBe(false);
  });
});

describe('getAggregationsByGroupField', () => {
  it('returns empty array for none group', () => {
    const result = getAggregationsByGroupField(ENTITY_GROUPING_OPTIONS.NONE);
    expect(result).toEqual([]);
  });

  it('returns cardinality + entityType agg for ENTITY_TYPE', () => {
    const result = getAggregationsByGroupField(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      groupByField: {
        cardinality: { field: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE },
      },
    });
    expect(result[1]).toEqual({
      entityType: {
        terms: { field: ENTITY_FIELDS.ENTITY_TYPE, size: 1 },
      },
    });
  });

  it('returns only cardinality for unknown fields', () => {
    const result = getAggregationsByGroupField('some.unknown.field');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      groupByField: {
        cardinality: { field: 'some.unknown.field' },
      },
    });
  });
});
