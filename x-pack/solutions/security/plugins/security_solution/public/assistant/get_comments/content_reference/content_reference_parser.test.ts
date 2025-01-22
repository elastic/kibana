/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import unified from 'unified';
import markdown from 'remark-parse-no-trim';
import type { Parent } from 'mdast';
import { ContentReferenceParser } from './content_reference_parser';

describe('ContentReferenceParser', () => {
  it('eats space preceding content reference', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse('Delete space after punctuation. {reference(example)}') as Parent;

    expect(file.children[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', value: 'Delete space after punctuation.' }),
        expect.objectContaining({ type: 'contentReference' }),
      ])
    );
  });

  it('parses when there is no space preceding the content reference', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse('No preceding space.{reference(example)}') as Parent;

    expect(file.children[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', value: 'No preceding space.' }),
        expect.objectContaining({ type: 'contentReference' }),
      ])
    );
  });

  it('handles single citation block', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse('Hello world {reference(example)} hello wolrd') as Parent;

    expect(file.children[0].children).toEqual([
      {
        position: {
          end: {
            column: 12,
            line: 1,
            offset: 11,
          },
          indent: [],
          start: {
            column: 1,
            line: 1,
            offset: 0,
          },
        },
        type: 'text',
        value: 'Hello world',
      },
      {
        contentReferenceBlock: '{reference(example)}',
        contentReferenceCount: 1,
        contentReferenceId: 'example',
        position: {
          end: {
            column: 33,
            line: 1,
            offset: 32,
          },
          indent: [],
          start: {
            column: 12,
            line: 1,
            offset: 11,
          },
        },
        type: 'contentReference',
      },
      {
        position: {
          end: {
            column: 45,
            line: 1,
            offset: 44,
          },
          indent: [],
          start: {
            column: 33,
            line: 1,
            offset: 32,
          },
        },
        type: 'text',
        value: ' hello wolrd',
      },
    ]);
  });

  it('handles multiple citation blocks with different referenceIds', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse('Hello world {reference(example)} hello world {reference(example2)}') as Parent;

    expect(file.children[0].children).toEqual([
      {
        position: {
          end: {
            column: 12,
            line: 1,
            offset: 11,
          },
          indent: [],
          start: {
            column: 1,
            line: 1,
            offset: 0,
          },
        },
        type: 'text',
        value: 'Hello world',
      },
      {
        contentReferenceBlock: '{reference(example)}',
        contentReferenceCount: 1,
        contentReferenceId: 'example',
        position: {
          end: {
            column: 33,
            line: 1,
            offset: 32,
          },
          indent: [],
          start: {
            column: 12,
            line: 1,
            offset: 11,
          },
        },
        type: 'contentReference',
      },
      {
        position: {
          end: {
            column: 45,
            line: 1,
            offset: 44,
          },
          indent: [],
          start: {
            column: 33,
            line: 1,
            offset: 32,
          },
        },
        type: 'text',
        value: ' hello world',
      },
      {
        contentReferenceBlock: '{reference(example2)}',
        contentReferenceCount: 2,
        contentReferenceId: 'example2',
        position: {
          end: {
            column: 67,
            line: 1,
            offset: 66,
          },
          indent: [],
          start: {
            column: 45,
            line: 1,
            offset: 44,
          },
        },
        type: 'contentReference',
      },
    ]);
  });

  it('handles multiple citation blocks with same referenceIds', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse('Hello world {reference(example)} hello world {reference(example)}') as Parent;

    expect(file.children[0].children).toEqual([
      {
        position: {
          end: {
            column: 12,
            line: 1,
            offset: 11,
          },
          indent: [],
          start: {
            column: 1,
            line: 1,
            offset: 0,
          },
        },
        type: 'text',
        value: 'Hello world',
      },
      {
        contentReferenceBlock: '{reference(example)}',
        contentReferenceCount: 1,
        contentReferenceId: 'example',
        position: {
          end: {
            column: 33,
            line: 1,
            offset: 32,
          },
          indent: [],
          start: {
            column: 12,
            line: 1,
            offset: 11,
          },
        },
        type: 'contentReference',
      },
      {
        position: {
          end: {
            column: 45,
            line: 1,
            offset: 44,
          },
          indent: [],
          start: {
            column: 33,
            line: 1,
            offset: 32,
          },
        },
        type: 'text',
        value: ' hello world',
      },
      {
        contentReferenceBlock: '{reference(example)}',
        contentReferenceCount: 1,
        contentReferenceId: 'example',
        position: {
          end: {
            column: 66,
            line: 1,
            offset: 65,
          },
          indent: [],
          start: {
            column: 45,
            line: 1,
            offset: 44,
          },
        },
        type: 'contentReference',
      },
    ]);
  });

  it('handles partial citation blocks', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse('Hello world {reference(example)} hello world {reference(') as Parent;

    expect(file.children[0].children).toEqual([
      {
        position: {
          end: {
            column: 12,
            line: 1,
            offset: 11,
          },
          indent: [],
          start: {
            column: 1,
            line: 1,
            offset: 0,
          },
        },
        type: 'text',
        value: 'Hello world',
      },
      {
        contentReferenceBlock: '{reference(example)}',
        contentReferenceCount: 1,
        contentReferenceId: 'example',
        position: {
          end: {
            column: 33,
            line: 1,
            offset: 32,
          },
          indent: [],
          start: {
            column: 12,
            line: 1,
            offset: 11,
          },
        },
        type: 'contentReference',
      },
      {
        position: {
          end: {
            column: 57,
            line: 1,
            offset: 56,
          },
          indent: [],
          start: {
            column: 33,
            line: 1,
            offset: 32,
          },
        },
        type: 'text',
        value: ' hello world {reference(',
      },
    ]);
  });
});
