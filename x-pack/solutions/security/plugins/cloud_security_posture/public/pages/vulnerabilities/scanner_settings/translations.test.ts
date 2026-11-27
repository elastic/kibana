/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPackDifferenceText } from './translations';

describe('getPackDifferenceText', () => {
  it('names the query when the difference carries its id', () => {
    expect(getPackDifferenceText({ code: 'query_missing', queryId: 'q1' })).toBe(
      'The query "q1" is missing from the pack.'
    );
  });

  it('does not render empty quotes when a query difference has no query id', () => {
    const text = getPackDifferenceText({ code: 'query_sql_differs' });

    expect(text).not.toContain('""');
    expect(text).toBe('A query in the pack differs from the expected definition.');
  });

  it('keeps pack-level differences unchanged without a query id', () => {
    expect(getPackDifferenceText({ code: 'pack_disabled' })).toBe('The pack is disabled.');
  });
});
