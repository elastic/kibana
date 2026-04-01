/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { providedContextToDocuments } from '.';

describe('providedContextToDocuments', () => {
  it('converts a single context string to a document', () => {
    const result = providedContextToDocuments(['alert context 1']);

    expect(result).toEqual([
      {
        metadata: {},
        pageContent: 'alert context 1',
      },
    ]);
  });

  it('converts multiple context strings to documents', () => {
    const result = providedContextToDocuments([
      'alert context 1',
      'alert context 2',
      'alert context 3',
    ]);

    expect(result).toEqual([
      { metadata: {}, pageContent: 'alert context 1' },
      { metadata: {}, pageContent: 'alert context 2' },
      { metadata: {}, pageContent: 'alert context 3' },
    ]);
  });

  it('returns an empty array when given an empty array', () => {
    const result = providedContextToDocuments([]);

    expect(result).toEqual([]);
  });

  it('preserves whitespace in context strings', () => {
    const result = providedContextToDocuments(['  leading and trailing spaces  ']);

    expect(result).toEqual([
      {
        metadata: {},
        pageContent: '  leading and trailing spaces  ',
      },
    ]);
  });
});
