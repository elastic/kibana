/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTimelineDetailsQuery } from './query.events_details.dsl';

describe('buildTimelineDetailsQuery', () => {
  it('returns the expected query', () => {
    const indexName = '.siem-signals-default';
    const eventId = 'f0a936d50b5b3a5a193d415459c14587fe633f7e519df7b5dc151d56142680e3';

    const query = buildTimelineDetailsQuery({
      indexName,
      id: eventId,
      runtimeMappings: {},
    });

    expect(query).toMatchInlineSnapshot(`
      Object {
        "_source": true,
        "allow_no_indices": true,
        "fields": Array [
          Object {
            "field": "*",
            "include_unmapped": true,
          },
          Object {
            "field": "@timestamp",
            "format": "strict_date_optional_time",
          },
          Object {
            "field": "code_signature.timestamp",
            "format": "strict_date_optional_time",
          },
          Object {
            "field": "dll.code_signature.timestamp",
            "format": "strict_date_optional_time",
          },
        ],
        "ignore_unavailable": true,
        "index": ".siem-signals-default",
        "query": Object {
          "terms": Object {
            "_id": Array [
              "f0a936d50b5b3a5a193d415459c14587fe633f7e519df7b5dc151d56142680e3",
            ],
          },
        },
        "runtime_mappings": Object {},
        "size": 1,
        "stored_fields": Array [
          "*",
        ],
      }
    `);
  });

  it('does not set expand_wildcards when includeHiddenIndices is omitted (primary lookup)', () => {
    const query = buildTimelineDetailsQuery({
      indexName: '.ds-logs-endpoint.events-default-2026.05.17-000001',
      id: 'some-id',
      runtimeMappings: {},
    });

    expect(query).not.toHaveProperty('expand_wildcards');
  });

  it('includes hidden indices in wildcard expansion when includeHiddenIndices is true (fallback)', () => {
    const query = buildTimelineDetailsQuery({
      indexName: '*.ds-logs-endpoint.events-default-2026.05.17-000001',
      id: 'some-id',
      runtimeMappings: {},
      includeHiddenIndices: true,
    });

    expect(query).toEqual(
      expect.objectContaining({
        expand_wildcards: ['open', 'hidden'],
      })
    );
  });
});
