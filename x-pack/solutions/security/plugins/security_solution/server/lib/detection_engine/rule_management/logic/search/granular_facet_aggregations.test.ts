/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GranularRulesFacetCategory } from '../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import { buildAggregations, expandRawAggregationResult } from './granular_facet_aggregations';

describe('buildAggregations', () => {
  it('maps friendly facet names to ES fields', () => {
    const aggs = buildAggregations({ categories: ['tags', 'enabled'] });

    expect(aggs).toEqual({
      facet_tags: { terms: expect.objectContaining({ field: 'alert.attributes.tags' }) },
      facet_enabled: { terms: expect.objectContaining({ field: 'alert.attributes.enabled' }) },
    });
  });

  it('uses the category string as the terms field when it already starts with alert.attributes.', () => {
    const rawPath = 'alert.attributes.name' as unknown as GranularRulesFacetCategory;
    const aggs = buildAggregations({ categories: [rawPath] });

    expect(aggs).toEqual({
      [`facet_${rawPath}`]: { terms: expect.objectContaining({ field: rawPath }) },
    });
  });

  it('includes the default size on every terms aggregation', () => {
    const aggs = buildAggregations({ categories: ['tags'] }) as Record<string, unknown>;

    expect((aggs.facet_tags as { terms: { size: number } }).terms.size).toBe(200);
  });
});

describe('expandRawAggregationResult', () => {
  it('flattens buckets into count maps keyed by category', () => {
    const raw = {
      facet_tags: { buckets: [{ key: 'tag1', doc_count: 3 }] },
      facet_enabled: {
        buckets: [
          { key: true, doc_count: 1 },
          { key: false, doc_count: 0 },
        ],
      },
    };

    const counts = expandRawAggregationResult(raw, ['tags', 'enabled']);

    expect(counts).toEqual({
      tags: { tag1: 3 },
      enabled: { true: 1, false: 0 },
    });
  });

  it('uses the category string as the result key when it already starts with alert.attributes.', () => {
    const rawPath = 'alert.attributes.name' as unknown as GranularRulesFacetCategory;
    const raw = {
      [`facet_${rawPath}`]: { buckets: [{ key: 'Rule A', doc_count: 5 }] },
    };

    const counts = expandRawAggregationResult(raw, [rawPath]);

    expect(counts).toEqual({ [rawPath]: { 'Rule A': 5 } });
  });
});
