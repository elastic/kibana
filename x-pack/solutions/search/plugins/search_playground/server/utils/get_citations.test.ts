/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from '@langchain/core/documents';
import { getCitations } from './get_citations';

describe('getCitations', () => {
  test('should enrich citations', () => {
    const answer = [
      'NASA stands for North America South America region.',
      'It is a region within the sales organization that includes the United States, Canada, Mexico, as well as Central and South America.',
      'It is divided into two areas, North America and South America, each of which is led by an Area Vice-President. Laura Martinez is the',
      'Area Vice-President of North America, and Gary Johnson is the Area Vice-President of South America [1].',
    ].join(' ');

    const docs: Document[] = [
      {
        pageContent: 'snippet 1',
        metadata: {
          id: 'test-doc',
        },
      },
      {
        pageContent: 'snippet 2',
        metadata: {
          id: 'test2-doc',
        },
      },
    ];

    expect(getCitations(answer, 'inline', docs)).toEqual([
      {
        pageContent: 'snippet 1',
        metadata: {
          id: 'test-doc',
        },
      },
    ]);
  });
});
