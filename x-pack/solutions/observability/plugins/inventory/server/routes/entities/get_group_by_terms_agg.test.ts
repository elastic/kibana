/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupByTermsAgg } from './get_group_by_terms_agg';

type Fields = Record<string, string[]>;

describe('getGroupByTermsAgg', () => {
  it('should return an empty object when fields is empty', () => {
    const fields: Fields = {};
    const result = getGroupByTermsAgg(fields);
    expect(result).toEqual({});
  });

  it('should correctly generate aggregation structure for service, host, and container entity types', () => {
    const fields: Fields = {
      service: ['service.name', 'service.environment'],
      host: ['host.name'],
      container: ['container.id', 'foo.bar'],
    };

    const result = getGroupByTermsAgg(fields);

    expect(result).toEqual({
      service: {
        composite: {
          size: 500,
          sources: [
            { 'service.name': { terms: { field: 'service.name' } } },
            { 'service.environment': { terms: { field: 'service.environment' } } },
          ],
        },
      },
      host: {
        composite: {
          size: 500,
          sources: [{ 'host.name': { terms: { field: 'host.name' } } }],
        },
      },
      container: {
        composite: {
          size: 500,
          sources: [
            {
              'container.id': {
                terms: { field: 'container.id' },
              },
            },
            {
              'foo.bar': { terms: { field: 'foo.bar' } },
            },
          ],
        },
      },
    });
  });
  it('should override maxSize when provided', () => {
    const fields: Fields = {
      host: ['host.name'],
    };

    const result = getGroupByTermsAgg(fields, 10);
    expect(result.host.composite.size).toBe(10);
  });
});
