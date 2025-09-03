/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeQueryField } from './normalize_query_field';

describe('normalizeQueryField', () => {
  it('trims the query field', () => {
    const normalizedQueryField = normalizeQueryField('\n\tquery where true\n\n');

    expect(normalizedQueryField).toEqual('query where true');
  });
});
