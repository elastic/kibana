/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_BOOL_FILTER_QUERY, isEmptyBoolFilterQuery, parseFilterQuery } from '.';

const validQuery = {
  bool: { must: [{ match: { field: 'value' } }], filter: [], should: [], must_not: [] },
};

describe('parseFilterQuery', () => {
  describe('isEmptyBoolFilterQuery', () => {
    it('returns true if filterQuery is undefined', () => {
      const result = isEmptyBoolFilterQuery(undefined);

      expect(result).toBe(true);
    });

    it('returns true if filterQuery is an empty bool filter query', () => {
      const result = isEmptyBoolFilterQuery(EMPTY_BOOL_FILTER_QUERY);

      expect(result).toBe(true);
    });

    it('returns false if filterQuery is NOT an empty bool filter query', () => {
      const result = isEmptyBoolFilterQuery(validQuery);

      expect(result).toBe(false);
    });

    it('returns false if filterQuery does NOT have a bool property', () => {
      const hasNoBool = { must: [] };

      const result = isEmptyBoolFilterQuery(hasNoBool);

      expect(result).toBe(false);
    });
  });

  it('returns undefined if kqlError is NOT null', () => {
    const result = parseFilterQuery({
      filterQuery: JSON.stringify(validQuery),
      kqlError: new Error('Test error'), // <-- an error occurred
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined if filterQuery is undefined', () => {
    const result = parseFilterQuery({
      filterQuery: undefined, // <-- undefined
      kqlError: undefined,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined if filterQuery is NOT valid JSON', () => {
    const result = parseFilterQuery({
      filterQuery: 'this is NOT valid JSON', // <-- invalid JSON
      kqlError: undefined,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined if the parsed filterQuery does NOT have a bool property', () => {
    const result = parseFilterQuery({
      filterQuery: '{"must": []}', // <-- missing bool property
      kqlError: undefined,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined if parsed filterQuery is an empty bool filter query', () => {
    const result = parseFilterQuery({
      filterQuery: JSON.stringify(EMPTY_BOOL_FILTER_QUERY), // <-- empty bool filter query
      kqlError: undefined,
    });

    expect(result).toBeUndefined();
  });

  it('returns the parsed filterQuery if it is a valid bool filter query', () => {
    const result = parseFilterQuery({
      filterQuery: JSON.stringify(validQuery), // <-- valid bool filter query
      kqlError: undefined,
    });

    expect(result).toEqual(validQuery);
  });
});
