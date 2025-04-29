/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { wildcardQuery } from './queries'; // Replace 'your-module' with the actual module path

describe('wildcardQuery', () => {
  it('generates wildcard query with leading wildcard by default', () => {
    const result = wildcardQuery('fieldName', 'value');
    expect(result).toEqual([
      {
        wildcard: {
          fieldName: {
            value: '*value*',
            case_insensitive: true,
          },
        },
      },
    ]);
  });

  it('generates wildcard query without leading wildcard if specified in options', () => {
    const result = wildcardQuery('fieldName', 'value', { leadingWildcard: false });
    expect(result).toEqual([
      {
        wildcard: {
          fieldName: {
            value: 'value*',
            case_insensitive: true,
          },
        },
      },
    ]);
  });

  it('returns an empty array if value is undefined', () => {
    const result = wildcardQuery('fieldName', undefined);
    expect(result).toEqual([]);
  });
});
