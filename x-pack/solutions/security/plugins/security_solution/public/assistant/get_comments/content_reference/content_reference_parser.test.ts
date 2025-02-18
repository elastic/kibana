/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import unified from 'unified';
import markdown from 'remark-parse-no-trim';
import type { Parent } from 'mdast';
import { contentReferenceParser } from './content_reference_parser';

describe('ContentReferenceParser', () => {
  it('extracts references from poem', () => {
    const file = unified().use([
      [markdown, {}],
      contentReferenceParser({ contentReferences: null }),
    ]).parse(`With a wagging tail and a wet, cold nose,{reference(ccaSI)}
A furry friend, from head to toes.{reference(ccaSI)}
Loyal companion, always near,{reference(ccaSI)}
Chasing squirrels, full of cheer.{reference(ccaSI)}
A paw to hold, a gentle nudge,
{reference(ccaSI)}
A furry alarm, a playful judge.{reference(ccaSI)}
From golden retrievers to tiny Chihuahuas,{reference(ccaSI)}
Their love's a gift, that always conquers.{reference(ccaSI)}
So cherish your dog, with all your might,{reference(ccaSI)}
Their love's a beacon, shining bright.{reference(ccaSI)}`) as Parent;

    expect(
      (file.children[0] as Parent).children.filter(
        (child) => (child.type as string) === 'contentReference'
      )
    ).toHaveLength(10);
    expect(file.children[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', value: '\nA paw to hold, a gentle nudge,\n' }),
      ])
    );
  });

  it('extracts reference after linebreak', () => {
    const file = unified().use([
      [markdown, {}],
      contentReferenceParser({ contentReferences: null }),
    ]).parse(`First line
{reference(FTQJp)}
`) as Parent;

    expect(file.children[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', value: 'First line\n' }),
        expect.objectContaining({ type: 'contentReference' }),
      ])
    );
  });

  it('eats empty content reference', () => {
    const file = unified()
      .use([[markdown, {}], contentReferenceParser({ contentReferences: null })])
      .parse('There is an empty content reference.{reference()}') as Parent;

    expect(file.children[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', value: 'There is an empty content reference.' }),
        expect.objectContaining({
          type: 'contentReference',
          contentReferenceCount: 1,
        }),
      ])
    );
  });

  it('invalid content reference has correct contentReferenceCount', () => {
    const file = unified()
      .use([
        [markdown, {}],
        contentReferenceParser({
          contentReferences: {
            valid1: { id: 'valid1', type: 'SecurityAlertsPage' },
            valid2: { id: 'valid2', type: 'SecurityAlertsPage' },
          },
        }),
      ])
      .parse(
        'There {reference(valid1)} is one invalid content reference {reference(invalid)} and two valid ones. {reference(valid2)}'
      ) as Parent;

    expect(file.children[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'contentReference',
          contentReferenceCount: 1,
          contentReferenceId: 'valid1',
        }),
        expect.objectContaining({
          type: 'contentReference',
          contentReferenceCount: undefined,
          contentReferenceId: 'invalid',
        }),
        expect.objectContaining({
          type: 'contentReference',
          contentReferenceCount: 2,
          contentReferenceId: 'valid2',
        }),
      ])
    );
  });

  it('eats space preceding content reference', () => {
    const file = unified()
      .use([[markdown, {}], contentReferenceParser({ contentReferences: null })])
      .parse('Delete space after punctuation. {reference(example)}') as Parent;

    expect(file.children[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', value: 'Delete space after punctuation.' }),
        expect.objectContaining({ type: 'contentReference' }),
      ])
    );
  });

  it('parses when there is no space preceding the content reference', () => {
    const file = unified()
      .use([[markdown, {}], contentReferenceParser({ contentReferences: null })])
      .parse('No preceding space.{reference(example)}') as Parent;

    expect(file.children[0].children).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'contentReference' })])
    );
  });

  it('correct content reference count when contentReferences is null', () => {
    const file = unified()
      .use([[markdown, {}], contentReferenceParser({ contentReferences: null })])
      .parse('No preceding space.{reference(example)} {reference(example2)}') as Parent;

    expect(file.children[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'contentReference',
          contentReferenceId: 'example',
          contentReferenceCount: 1,
          contentReference: undefined,
        }),
        expect.objectContaining({
          type: 'contentReference',
          contentReferenceId: 'example2',
          contentReferenceCount: 2,
          contentReference: undefined,
        }),
      ])
    );
  });

  it('handles single citation block', () => {
    const file = unified()
      .use([[markdown, {}], contentReferenceParser({ contentReferences: null })])
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

  it('handles multiple citation blocks with different referenceIds', () => {
    const file = unified()
      .use([[markdown, {}], contentReferenceParser({ contentReferences: null })])
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

  it('handles multiple citation blocks with same referenceIds', () => {
    const file = unified()
      .use([[markdown, {}], contentReferenceParser({ contentReferences: null })])
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

  it('handles partial citation blocks', () => {
    const file = unified()
      .use([[markdown, {}], contentReferenceParser({ contentReferences: null })])
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
