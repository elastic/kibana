/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nestDottedKeys } from './nest_document';

describe('nestDottedKeys', () => {
  it('nests dotted paths so the hunt reads them from _source', () => {
    expect(
      nestDottedKeys({
        'content.title': 'T',
        'content.body_text': 'B',
        'source.name': 'n',
        'extracted.iocs': [{ type: 'domain', value: 'a.example' }],
        'extracted.ttps.techniques': ['T1059.001'],
      })
    ).toEqual({
      content: { title: 'T', body_text: 'B' },
      source: { name: 'n' },
      extracted: {
        iocs: [{ type: 'domain', value: 'a.example' }],
        ttps: { techniques: ['T1059.001'] },
      },
    });
  });

  it('keeps arrays as values (an array is never a path container)', () => {
    const out = nestDottedKeys({ 'extracted.iocs': [1, 2] }) as { extracted: { iocs: number[] } };
    expect(out.extracted.iocs).toEqual([1, 2]);
  });

  it('leaves undotted keys alone', () => {
    expect(nestDottedKeys({ space_id: 'default' })).toEqual({ space_id: 'default' });
  });
});
