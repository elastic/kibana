/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fillPlaceholders,
  getIngestSnippet,
  getSearchSnippet,
  getPrompt,
  HAVE_VECTORS_INGEST,
  HAVE_VECTORS_SEARCH,
  HAVE_VECTORS_PROMPT,
  GENERATE_VECTORS_INGEST,
  GENERATE_VECTORS_SEARCH,
  GENERATE_VECTORS_PROMPT,
  URL_PLACEHOLDER,
  API_KEY_PLACEHOLDER,
} from './snippets';

describe('fillPlaceholders', () => {
  it('returns the snippet unchanged when url and apiKey are omitted', () => {
    const snippet = `connect to ${URL_PLACEHOLDER} with key ${API_KEY_PLACEHOLDER}`;
    expect(fillPlaceholders(snippet)).toBe(snippet);
  });

  it('replaces the URL placeholder', () => {
    const snippet = `connect to ${URL_PLACEHOLDER}`;
    expect(fillPlaceholders(snippet, 'https://my-cluster.es.io')).toBe(
      'connect to https://my-cluster.es.io'
    );
  });

  it('replaces the API key placeholder', () => {
    const snippet = `api_key="${API_KEY_PLACEHOLDER}"`;
    expect(fillPlaceholders(snippet, undefined, 'abc123')).toBe('api_key="abc123"');
  });

  it('replaces both placeholders', () => {
    const snippet = `url=${URL_PLACEHOLDER} key=${API_KEY_PLACEHOLDER}`;
    expect(fillPlaceholders(snippet, 'https://host', 'secret')).toBe('url=https://host key=secret');
  });

  it('replaces all occurrences when placeholder appears more than once', () => {
    const snippet = `${URL_PLACEHOLDER} and again ${URL_PLACEHOLDER}`;
    expect(fillPlaceholders(snippet, 'https://host')).toBe('https://host and again https://host');
  });

  it('leaves the snippet unchanged when url is an empty string', () => {
    const snippet = `connect to ${URL_PLACEHOLDER}`;
    expect(fillPlaceholders(snippet, '')).toBe(snippet);
  });
});

describe('getIngestSnippet', () => {
  it('returns the have-vectors ingest snippet', () => {
    expect(getIngestSnippet('have-vectors')).toBe(HAVE_VECTORS_INGEST);
  });

  it('returns the generate-vectors ingest snippet', () => {
    expect(getIngestSnippet('generate-vectors')).toBe(GENERATE_VECTORS_INGEST);
  });
});

describe('getSearchSnippet', () => {
  it('returns the have-vectors search snippet', () => {
    expect(getSearchSnippet('have-vectors')).toBe(HAVE_VECTORS_SEARCH);
  });

  it('returns the generate-vectors search snippet', () => {
    expect(getSearchSnippet('generate-vectors')).toBe(GENERATE_VECTORS_SEARCH);
  });
});

describe('getPrompt', () => {
  it('returns the have-vectors prompt', () => {
    expect(getPrompt('have-vectors')).toBe(HAVE_VECTORS_PROMPT);
  });

  it('returns the generate-vectors prompt', () => {
    expect(getPrompt('generate-vectors')).toBe(GENERATE_VECTORS_PROMPT);
  });
});
