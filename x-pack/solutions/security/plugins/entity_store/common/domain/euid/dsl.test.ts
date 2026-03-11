/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidDslFilterBasedOnDocument, getEuidDslDocumentsContainsIdFilter } from './dsl';

describe('getEuidDslFilterBasedOnDocument', () => {
  it('returns undefined when doc is falsy', () => {
    expect(getEuidDslFilterBasedOnDocument('host', null)).toBeUndefined();
    expect(getEuidDslFilterBasedOnDocument('generic', undefined)).toBeUndefined();
    expect(getEuidDslFilterBasedOnDocument('user', {})).toBeUndefined();
  });

  describe('generic', () => {
    it('returns bool filter with term on entity.id when present', () => {
      const result = getEuidDslFilterBasedOnDocument('generic', { entity: { id: 'e-123' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'entity.id': 'e-123' } }],
        },
      });
    });

    it('unwraps _source when doc is an Elasticsearch hit', () => {
      const result = getEuidDslFilterBasedOnDocument('generic', {
        _source: { entity: { id: 'e-123' } },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'entity.id': 'e-123' } }],
        },
      });
    });
  });

  describe('host', () => {
    it('returns filter with term on host.id when present', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        host: { name: 'to-be-ignored', id: 'host-id-1' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'host-id-1' } }],
        },
      });
    });

    it('returns filter with term on host.id when present (with flattened source)', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        _source: {
          'host.name': 'to-be-ignored',
          'host.id': 'host-id-1',
        },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'host-id-1' } }],
        },
      });
    });

    it('returns filter with term on host.name when host.id is missing', () => {
      const result = getEuidDslFilterBasedOnDocument('host', { host: { name: 'server1' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.name': 'server1' } }],
          must_not: [{ exists: { field: 'host.id' } }],
        },
      });
    });

    it('returns filter with term on host.hostname when host.id and host.name are missing', () => {
      const result = getEuidDslFilterBasedOnDocument('host', { host: { hostname: 'node-1' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.hostname': 'node-1' } }],
          must_not: [{ exists: { field: 'host.id' } }, { exists: { field: 'host.name' } }],
        },
      });
    });

    it('precedence: uses host.id when both host.id and host.name are present', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        host: { id: 'e1', name: 'myserver' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'e1' } }],
        },
      });
    });
  });

  describe('user', () => {
    it('returns filter with term on user.email and source clause (event.module whenClause expands to sourceMatchesAny)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
        event: { module: 'okta' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'okta' } },
                  { prefix: { 'data_stream.dataset': 'okta' } },
                  { term: { 'event.module': 'entityanalytics_okta' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_okta' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });

    it('returns filter with term on user.email and unknown source clause when no event.module or data_stream.dataset', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            {
              bool: {
                must: [
                  {
                    bool: {
                      should: [
                        { bool: { must_not: [{ exists: { field: 'event.module' } }] } },
                        { term: { 'event.module': '' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [
                        { bool: { must_not: [{ exists: { field: 'data_stream.dataset' } }] } },
                        { term: { 'data_stream.dataset': '' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it('returns filter with term on user.name and source clause and must_not on higher-ranked identity fields', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        event: { module: 'azure' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.name': 'alice' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'azure' } },
                  { prefix: { 'data_stream.dataset': 'azure' } },
                  { term: { 'event.module': 'entityanalytics_entra_id' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_entra_id' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must_not: [
            { exists: { field: 'user.email' } },
            { exists: { field: 'user.id' } },
            { exists: { field: 'user.domain' } },
          ],
        },
      });
    });

    it('returns filter with term on user.id and source clause and must_not on user.email', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { id: 'user-id-42' },
        event: { module: 'o365' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.id': 'user-id-42' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'o365' } },
                  { prefix: { 'data_stream.dataset': 'o365' } },
                  { term: { 'event.module': 'o365_metrics' } },
                  { prefix: { 'data_stream.dataset': 'o365_metrics' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must_not: [{ exists: { field: 'user.email' } }],
        },
      });
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidDslFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.email and source clause when both user.email and user.id are present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com', id: 'user-42' },
        event: { module: 'entityanalytics_okta' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'okta' } },
                  { prefix: { 'data_stream.dataset': 'okta' } },
                  { term: { 'event.module': 'entityanalytics_okta' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_okta' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });

    it('returns filter for user.name and user.domain with source clause and must_not on higher-ranked identity fields', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'jane', domain: 'corp.com' },
        event: { module: 'entityanalytics_ad' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.name': 'jane' } },
            { term: { 'user.domain': 'corp.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'entityanalytics_ad' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_ad' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must_not: [{ exists: { field: 'user.email' } }, { exists: { field: 'user.id' } }],
        },
      });
    });

    it('excludes all fieldEvaluation destinations (e.g. entity.namespace) from filter and must_not so the query can match stored documents', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'bob@example.com' },
        event: { module: 'okta' },
      });
      const filter = result?.bool?.filter as Array<{ term?: Record<string, string> }> | undefined;
      const filterFields = Array.isArray(filter)
        ? filter.map((clause) => Object.keys(clause.term ?? {})[0])
        : [];
      const mustNot = (result?.bool?.must_not ?? []) as Array<{ exists?: { field: string } }>;
      const mustNotFields = Array.isArray(mustNot)
        ? mustNot.map((clause) => clause.exists?.field).filter(Boolean)
        : [];
      expect(filterFields).not.toContain('entity.namespace');
      expect(mustNotFields).not.toContain('entity.namespace');
    });
  });

  describe('service', () => {
    it('returns undefined when service.name is missing (single-field identity)', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-entity-1' } },
      });

      expect(result).toBeUndefined();
    });

    it('returns filter with term on service.name (single-field identity)', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { name: 'api-gateway' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'service.name': 'api-gateway' } }],
        },
      });
    });

    it('uses service.name when both service.entity.id and service.name are present (single-field identity)', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-e1' }, name: 'api-gateway' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'service.name': 'api-gateway' } }],
        },
      });
    });
  });
});

const isNotEmptyClause = (field: string) => ({
  bool: {
    must: [{ exists: { field } }, { bool: { must_not: { match: { [field]: '' } } } }],
  },
});

describe('getEuidDslDocumentsContainsIdFilter', () => {
  it('user: returns documentsFilter DSL (exclusions and at least one id field)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('user');

    expect(result).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must_not: {
                      exists: {
                        field: 'event.outcome',
                      },
                    },
                  },
                },
                {
                  bool: {
                    must_not: {
                      match: {
                        'event.outcome': 'failure',
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    must_not: {
                      exists: {
                        field: 'event.kind',
                      },
                    },
                  },
                },
                {
                  bool: {
                    must_not: {
                      match: {
                        'event.kind': 'enrichment',
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            bool: {
              should: [
                isNotEmptyClause('user.email'),
                isNotEmptyClause('user.id'),
                isNotEmptyClause('user.name'),
              ],
            },
          },
        ],
      },
    });
  });

  it('host: returns documentsFilter DSL (or of isNotEmpty for each identity field)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('host');

    expect(result).toEqual({
      bool: {
        should: [
          isNotEmptyClause('host.id'),
          isNotEmptyClause('host.name'),
          isNotEmptyClause('host.hostname'),
        ],
      },
    });
  });

  it('service: returns documentsFilter DSL (service.name not empty)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('service');

    expect(result).toEqual({
      bool: {
        must: [
          { exists: { field: 'service.name' } },
          { bool: { must_not: { match: { 'service.name': '' } } } },
        ],
      },
    });
  });

  it('generic: returns documentsFilter DSL (entity.id not empty)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('generic');

    expect(result).toEqual({
      bool: {
        must: [
          { exists: { field: 'entity.id' } },
          { bool: { must_not: { match: { 'entity.id': '' } } } },
        ],
      },
    });
  });
});
