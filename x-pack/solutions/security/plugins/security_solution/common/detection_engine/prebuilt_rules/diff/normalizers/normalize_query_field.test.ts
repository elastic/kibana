/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeQueryField } from './normalize_query_field';

describe('normalizeQueryField', () => {
  it('trims new lines from the query field', () => {
    const normalizedQueryField = normalizeQueryField('\nquery where true\n\n');

    expect(normalizedQueryField).toEqual('query where true');
  });

  it('trims tabs from the query field', () => {
    const normalizedQueryField = normalizeQueryField('\tquery where true\t');

    expect(normalizedQueryField).toEqual('query where true');
  });

  it('trims whitespace from the query field', () => {
    const normalizedQueryField = normalizeQueryField('  query where true   ');

    expect(normalizedQueryField).toEqual('query where true');
  });

  it('defaults to empty string when query is undefined', () => {
    const normalizedQueryField = normalizeQueryField(undefined);

    expect(normalizedQueryField).toEqual('');
  });
});
