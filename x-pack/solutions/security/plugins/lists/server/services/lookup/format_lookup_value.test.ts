/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformListItemToElasticQuery } from '../utils/transform_list_item_to_elastic_query';

import { formatLookupValue } from './format_lookup_value';

describe('formatLookupValue', () => {
  it('returns scalars as their string form', () => {
    expect(formatLookupValue('1.2.3.4')).toBe('1.2.3.4');
    expect(formatLookupValue(42)).toBe('42');
    expect(formatLookupValue(true)).toBe('true');
    expect(formatLookupValue('POINT (-71.34 41.12)')).toBe('POINT (-71.34 41.12)');
  });

  it('renders a stored geo_point object as `lat,lon`, as the shared stream does', () => {
    expect(formatLookupValue({ lat: '41.12', lon: '-71.34' })).toBe('41.12,-71.34');
    expect(formatLookupValue({ lat: 41.12, lon: -71.34 })).toBe('41.12,-71.34');
  });

  it('round trips what the shared serializer stores for every geo spelling', () => {
    const stored = (type: 'geo_point' | 'geo_shape' | 'shape', value: string): unknown =>
      Object.values(transformListItemToElasticQuery({ type, value }) ?? {})[0];
    expect(formatLookupValue(stored('geo_point', '41.12,-71.34'))).toBe('41.12,-71.34');
    expect(formatLookupValue(stored('geo_point', 'POINT (-71.34 41.12)'))).toBe(
      'POINT (-71.34 41.12)'
    );
    expect(formatLookupValue(stored('geo_shape', '41.12,-71.34'))).toBe('POINT (-71.34 41.12)');
    expect(formatLookupValue(stored('shape', 'POINT (-71.34 41.12)'))).toBe('POINT (-71.34 41.12)');
  });
});
