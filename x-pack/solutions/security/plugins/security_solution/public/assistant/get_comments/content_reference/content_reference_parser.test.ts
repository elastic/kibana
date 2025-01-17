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
  it('handles single citation block', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse('Hello world {reference(example)} hello wolrd') as Parent;

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
            "contentReferenceBlock": "{reference(example)}",
            "contentReferenceCount": 1,
            "contentReferenceId": "example",
            "position": {
                "end": {
                    "column": 33,
                    "line": 1,
                    "offset": 32
                },
                "indent": [],
                "start": {
                    "column": 13,
                    "line": 1,
                    "offset": 12
                }
            },
            "type": "contentReference"
        },
        {
            "position": {
                "end": {
                    "column": 45,
                    "line": 1,
                    "offset": 44
                },
                "indent": [],
                "start": {
                    "column": 33,
                    "line": 1,
                    "offset": 32
                }
            },
            "type": "text",
            "value": " hello wolrd"
        }
    ]);
  });

  it('handles multiple citation blocks', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse(
        'Hello world {reference(example)} hello world {reference(example)}'
      ) as Parent;

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
            "contentReferenceBlock": "{reference(example)}",
            "contentReferenceCount": 1,
            "contentReferenceId": "example",
            "position": {
                "end": {
                    "column": 33,
                    "line": 1,
                    "offset": 32
                },
                "indent": [],
                "start": {
                    "column": 13,
                    "line": 1,
                    "offset": 12
                }
            },
            "type": "contentReference"
        },
        {
            "position": {
                "end": {
                    "column": 46,
                    "line": 1,
                    "offset": 45
                },
                "indent": [],
                "start": {
                    "column": 33,
                    "line": 1,
                    "offset": 32
                }
            },
            "type": "text",
            "value": " hello world "
        },
        {
            "contentReferenceBlock": "{reference(example)}",
            "contentReferenceCount": 1,
            "contentReferenceId": "example",
            "position": {
                "end": {
                    "column": 66,
                    "line": 1,
                    "offset": 65
                },
                "indent": [],
                "start": {
                    "column": 46,
                    "line": 1,
                    "offset": 45
                }
            },
            "type": "contentReference"
        }
    ]);
  });

  it('handles partial citation blocks', async () => {
    const file = unified()
      .use([[markdown, {}], ContentReferenceParser])
      .parse('Hello world {reference(example)} hello world {reference(') as Parent;

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
            "contentReferenceBlock": "{reference(example)}",
            "contentReferenceCount": 1,
            "contentReferenceId": "example",
            "position": {
                "end": {
                    "column": 33,
                    "line": 1,
                    "offset": 32
                },
                "indent": [],
                "start": {
                    "column": 13,
                    "line": 1,
                    "offset": 12
                }
            },
            "type": "contentReference"
        },
        {
            "position": {
                "end": {
                    "column": 57,
                    "line": 1,
                    "offset": 56
                },
                "indent": [],
                "start": {
                    "column": 33,
                    "line": 1,
                    "offset": 32
                }
            },
            "type": "text",
            "value": " hello world {reference("
        }
    ]);
  });
});