/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import unified from 'unified';
import { CustomCitationParser } from './custom_citation_parser';
import markdown from 'remark-parse-no-trim';
import type { Parent } from 'mdast';

describe('CustomCitationParser', () => {
  it('handles single citation block', async () => {
    const file = unified()
      .use([[markdown, {}], CustomCitationParser])
      .parse('Hello world !{citation[foo](bar)} hello wolrd') as Parent;

    expect(file.children[0].children).toEqual([
      {
        position: {
          end: {
            column: 13,
            line: 1,
            offset: 12,
          },
          indent: [],
          start: {
            column: 1,
            line: 1,
            offset: 0,
          },
        },
        type: 'text',
        value: 'Hello world ',
      },
      {
        citationNumber: 1,
        citationLable: 'foo',
        citationLink: 'bar',
        position: {
          end: {
            column: 34,
            line: 1,
            offset: 33,
          },
          indent: [],
          start: {
            column: 13,
            line: 1,
            offset: 12,
          },
        },
        type: 'customCitation',
      },
      {
        position: {
          end: {
            column: 46,
            line: 1,
            offset: 45,
          },
          indent: [],
          start: {
            column: 34,
            line: 1,
            offset: 33,
          },
        },
        type: 'text',
        value: ' hello wolrd',
      },
    ]);
  });

  it('handles multiple citation blocks', async () => {
    const file = unified()
      .use([[markdown, {}], CustomCitationParser])
      .parse(
        'Hello world !{citation[foo](bar)} hello world !{citation[secondFoo](secondBar)}'
      ) as Parent;

    expect(file.children[0].children).toEqual([
      {
        position: {
          end: {
            column: 13,
            line: 1,
            offset: 12,
          },
          indent: [],
          start: {
            column: 1,
            line: 1,
            offset: 0,
          },
        },
        type: 'text',
        value: 'Hello world ',
      },
      {
        citationNumber: 1,
        citationLable: 'foo',
        citationLink: 'bar',
        position: {
          end: {
            column: 34,
            line: 1,
            offset: 33,
          },
          indent: [],
          start: {
            column: 13,
            line: 1,
            offset: 12,
          },
        },
        type: 'customCitation',
      },
      {
        position: {
          end: {
            column: 47,
            line: 1,
            offset: 46,
          },
          indent: [],
          start: {
            column: 34,
            line: 1,
            offset: 33,
          },
        },
        type: 'text',
        value: ' hello world ',
      },
      {
        citationNumber: 2,
        citationLable: 'secondFoo',
        citationLink: 'secondBar',
        position: {
          end: {
            column: 80,
            line: 1,
            offset: 79,
          },
          indent: [],
          start: {
            column: 47,
            line: 1,
            offset: 46,
          },
        },
        type: 'customCitation',
      },
    ]);
  });

  it('handles partial citation blocks', async () => {
    const file = unified()
      .use([[markdown, {}], CustomCitationParser])
      .parse('Hello world !{citation[foo](bar)} hello world !{citation[2323') as Parent;

    expect(file.children[0].children).toEqual([
      {
        "position": {
          "end": {
            "column": 13,
            "line": 1,
            "offset": 12
          },
          "indent": [],
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0
          }
        },
        "type": "text",
        "value": "Hello world "
      },
      {
        "citationLable": "foo",
        "citationLink": "bar",
        "citationNumber": 1,
        "position": {
          "end": {
            "column": 34,
            "line": 1,
            "offset": 33
          },
          "indent": [],
          "start": {
            "column": 13,
            "line": 1,
            "offset": 12
          }
        },
        "type": "customCitation"
      },
      {
        "position": {
          "end": {
            "column": 47,
            "line": 1,
            "offset": 46
          },
          "indent": [],
          "start": {
            "column": 34,
            "line": 1,
            "offset": 33
          }
        },
        "type": "text",
        "value": " hello world "
      },
      {
        "citationLable": "2323",
        "citationLink": "",
        "citationNumber": 2,
        "incomplete": true,
        "position": {
          "end": {
            "column": 62,
            "line": 1,
            "offset": 61
          },
          "indent": [],
          "start": {
            "column": 47,
            "line": 1,
            "offset": 46
          }
        },
        "type": "customCitation"
      }
    ]);
  });
});
