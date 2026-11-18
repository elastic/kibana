/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureWithFilter } from '@kbn/significant-events-schema';
import type { Condition } from '@kbn/streamlang';
import {
  MAX_ENTITY_FILTER_COMPARISONS,
  MAX_ENTITY_FILTER_VALUES,
  getEntityFilters,
} from './get_entity_filters';

const createFeature = (filter: Condition, day: number): FeatureWithFilter =>
  ({
    id: `feature-${day}`,
    updated_at: new Date(Date.UTC(2026, 0, day)).toISOString(),
    filter,
  } as FeatureWithFilter);

const service = (name: string): Condition => ({ field: 'service.name', eq: name });

describe('getEntityFilters', () => {
  it('merges equality filters per field and omits features past the cap', () => {
    const contains: Condition = { field: 'message', contains: 'timeout' };
    const features = [
      createFeature({ field: 'host.name', eq: 'host-a' }, 1),
      createFeature(service('cart'), 2),
      createFeature(contains, 3),
      createFeature(service('checkout'), 4),
    ];

    expect(getEntityFilters(features, 2)).toEqual({
      filters: [{ field: 'service.name', values: ['checkout', 'cart'] }, contains],
      omitted: 1,
    });
  });

  it('counts features sharing a filter as covered', () => {
    const features = [createFeature(service('cart'), 1), createFeature(service('cart'), 2)];

    expect(getEntityFilters(features, 10)).toEqual({
      filters: [{ field: 'service.name', values: ['cart'] }],
      omitted: 0,
    });
  });

  it('omits values past the values budget', () => {
    const features = Array.from({ length: MAX_ENTITY_FILTER_VALUES + 2 }, (_, i) =>
      createFeature(service(`service-${i}`), 1)
    );

    const { filters, omitted } = getEntityFilters(features, 10);

    expect(filters[0]).toHaveProperty('values.length', MAX_ENTITY_FILTER_VALUES);
    expect(omitted).toBe(2);
  });

  it('omits other filters past the comparisons budget', () => {
    const compound = (size: number): Condition => ({
      and: Array.from({ length: size }, (_, i) => ({ field: 'host.name', eq: `host-${i}` })),
    });
    const features = [
      createFeature(compound(MAX_ENTITY_FILTER_COMPARISONS), 2),
      createFeature({ field: 'message', contains: 'timeout' }, 1),
    ];

    const { filters, omitted } = getEntityFilters(features, 10);

    expect(filters).toHaveLength(1);
    expect(omitted).toBe(1);
  });
});
