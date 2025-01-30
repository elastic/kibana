/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeQuery } from '.';
import { getDefaultQuery } from '../../helpers';

describe('deserializeQuery', () => {
  it('returns the parsed query when a valid JSON string is provided', () => {
    const jsonString = JSON.stringify({ query: 'host.name: *', language: 'kuery' });

    const result = deserializeQuery(jsonString);

    expect(result).toEqual({ query: 'host.name: *', language: 'kuery' });
  });

  it('returns the default query when an invalid JSON string is provided', () => {
    const jsonString = 'invalid json';

    const result = deserializeQuery(jsonString);

    expect(result).toEqual(getDefaultQuery());
  });

  it('returns the default query when a JSON string does not match the schema', () => {
    const jsonString = JSON.stringify({ invalid: 'this does not match the schema' });

    const result = deserializeQuery(jsonString);

    expect(result).toEqual(getDefaultQuery());
  });

  it('returns the parsed query when it is valid', () => {
    const jsonString = JSON.stringify({ query: { match_all: {} }, language: 'kuery' });

    const result = deserializeQuery(jsonString);

    expect(result).toEqual({ query: { match_all: {} }, language: 'kuery' });
  });

  it('returns the default query when query is missing', () => {
    const jsonString = JSON.stringify({ language: 'kuery' }); // <-- missing query

    const result = deserializeQuery(jsonString);

    expect(result).toEqual(getDefaultQuery());
  });

  it('returns the default query when language is missing', () => {
    const jsonString = JSON.stringify({ query: 'host.name: *' });

    const result = deserializeQuery(jsonString);

    expect(result).toEqual(getDefaultQuery());
  });
});
