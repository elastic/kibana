/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore } from '@kbn/es-query';

import { deserializeFilters } from '.';

describe('deserializeFilters', () => {
  it('returns an empty array if the input is NOT valid JSON', () => {
    const result = deserializeFilters('invalid JSON');

    expect(result).toEqual([]);
  });

  it('returns an empty array if the input does not match the schema', () => {
    const result = deserializeFilters(JSON.stringify({ invalid: 'does not match schema' }));

    expect(result).toEqual([]);
  });

  it('returns an array of filters if the input matches the schema', () => {
    const validFilters = [
      {
        $state: { store: FilterStateStore.APP_STATE },
        meta: { key: 'value' },
        query: { match: { field: 'value' } },
      },
    ];

    const result = deserializeFilters(JSON.stringify(validFilters));

    expect(result).toEqual(validFilters);
  });

  it('returns an empty array if the input is an empty string', () => {
    const result = deserializeFilters('');

    expect(result).toEqual([]);
  });

  it('returns an empty array if the input is null', () => {
    const result = deserializeFilters(null as unknown as string);

    expect(result).toEqual([]);
  });

  it('returns an empty array if the input is undefined', () => {
    const result = deserializeFilters(undefined as unknown as string);

    expect(result).toEqual([]);
  });
});
