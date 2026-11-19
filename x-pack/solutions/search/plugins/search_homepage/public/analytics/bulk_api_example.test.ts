/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BULK_API_EXAMPLE_DOCUMENTS_INDEX,
  BULK_API_EXAMPLE_INDEX,
  buildBulkApiExample,
} from './bulk_api_example';

const NOW = Date.UTC(2026, 5, 1, 12);
const HOUR_MS = 3_600_000;

interface ExampleDocument {
  '@timestamp': string;
  event: { action: string };
  user: { id: string };
  session: { id: string };
}

const parseExample = (
  example: string
): { request: string; actions: string[]; documents: ExampleDocument[] } => {
  const [request, ...body] = example.split('\n\n')[0].split('\n');
  return {
    request,
    actions: body.filter((_, index) => index % 2 === 0),
    documents: body.filter((_, index) => index % 2 === 1).map((line) => JSON.parse(line)),
  };
};

describe('buildBulkApiExample', () => {
  it('starts on the request line of a bulk request to the events example index', () => {
    const { request, actions, documents } = parseExample(buildBulkApiExample(NOW));

    expect(request).toBe(`POST ${BULK_API_EXAMPLE_INDEX}/_bulk`);
    expect(documents.length).toBeGreaterThanOrEqual(5);
    expect(actions).toEqual(documents.map(() => '{ "index": {} }'));
    expect(buildBulkApiExample(NOW).endsWith('\n')).toBe(true);
  });

  it('dates every event within the hour before now, oldest first', () => {
    const timestamps = parseExample(buildBulkApiExample(NOW)).documents.map((document) =>
      Date.parse(document['@timestamp'])
    );

    expect(timestamps.every((timestamp) => timestamp < NOW && timestamp >= NOW - HOUR_MS)).toBe(
      true
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(new Set(timestamps).size).toBe(timestamps.length);
  });

  it('moves the events with the clock', () => {
    const later = parseExample(buildBulkApiExample(NOW + HOUR_MS)).documents;
    const earlier = parseExample(buildBulkApiExample(NOW)).documents;

    expect(Date.parse(later[0]['@timestamp']) - Date.parse(earlier[0]['@timestamp'])).toBe(HOUR_MS);
  });

  it('gives every event an action, a user and a session', () => {
    const { documents } = parseExample(buildBulkApiExample(NOW));

    for (const { event, user, session } of documents) {
      expect(event.action).not.toBe('');
      expect(user.id).not.toBe('');
      expect(session.id).not.toBe('');
    }
    expect(new Set(documents.map(({ event }) => event.action)).size).toBeGreaterThan(1);
    expect(new Set(documents.map(({ user }) => user.id)).size).toBeGreaterThan(1);
  });

  it('follows the events with a request that indexes documents to search', () => {
    const [, documentsBlock] = buildBulkApiExample(NOW).split('\n\n');
    const [comment, request, ...body] = documentsBlock.trimEnd().split('\n');
    const documents: Array<Record<string, string>> = body
      .filter((_, index) => index % 2 === 1)
      .map((line) => JSON.parse(line));

    expect(comment.startsWith('#')).toBe(true);
    expect(request).toBe(`POST ${BULK_API_EXAMPLE_DOCUMENTS_INDEX}/_bulk`);
    expect(documents.length).toBeGreaterThanOrEqual(3);
    for (const document of documents) {
      expect(Object.keys(document)).toEqual(['title', 'description']);
    }
  });
});
