/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A Console request that searches the given index, or every index without one. It matches
 * everything as written, so the first run returns documents whatever the index holds.
 */
export const buildSearchRequestExample = (indexName?: string): string =>
  // The request line comes first: Console puts the cursor, and with it the send button, there.
  [
    `GET ${indexName === undefined ? '' : `${encodeURIComponent(indexName)}/`}_search`,
    '{',
    '  "query": {',
    '    "query_string": { "query": "*" }',
    '  },',
    '  "size": 3',
    '}',
    '',
    '# Replace * with the words you are looking for, then send the request again.',
    '',
  ].join('\n');
