/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidDslFilterBasedOnDocument, getEuidDslDocumentsContainsIdFilter } from './dsl';

const fieldMissingOrEmpty = (field: string) => ({
  bool: {
    should: [{ bool: { must_not: [{ exists: { field } }] } }, { term: { [field]: '' } }],
    minimum_should_match: 1,
  },
});

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
          must: [fieldMissingOrEmpty('host.id')],
        },
      });
    });

    it('returns filter with term on host.hostname when host.id and host.name are missing', () => {
      const result = getEuidDslFilterBasedOnDocument('host', { host: { hostname: 'node-1' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.hostname': 'node-1' } }],
          must: [fieldMissingOrEmpty('host.id'), fieldMissingOrEmpty('host.name')],
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
        event: { kind: 'asset', module: 'okta' },
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
        event: { kind: 'asset' },
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

    it('returns filter with term on user.name and source clause and must on higher-ranked fields missing-or-empty', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        event: { kind: 'asset', module: 'azure' },
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
          must: [
            fieldMissingOrEmpty('user.email'),
            fieldMissingOrEmpty('user.id'),
            fieldMissingOrEmpty('user.domain'),
          ],
        },
      });
    });

    it('returns undefined when doc passes documentsFilter but fails postAggFilter (no asset/iam/entity.id)', () => {
      expect(
        getEuidDslFilterBasedOnDocument('user', {
          user: { id: 'user-id-42' },
          event: { module: 'o365' },
        })
      ).toBeUndefined();
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidDslFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.email and source clause when both user.email and user.id are present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com', id: 'user-42' },
        event: { kind: 'asset', module: 'entityanalytics_okta' },
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

    it('returns filter for user.name and user.domain with source clause and must on higher-ranked fields missing-or-empty', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'jane', domain: 'corp.com' },
        event: { kind: 'asset', module: 'entityanalytics_ad' },
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
          must: [fieldMissingOrEmpty('user.email'), fieldMissingOrEmpty('user.id')],
        },
      });
    });

    it('excludes all fieldEvaluation destinations (e.g. entity.namespace) from filter and must so the query can match stored documents', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'bob@example.com' },
        event: { kind: 'asset', module: 'okta' },
      });
      const filter = result?.bool?.filter as Array<{ term?: Record<string, string> }> | undefined;
      const filterFields = Array.isArray(filter)
        ? filter.map((clause) => Object.keys(clause.term ?? {})[0])
        : [];
      const must = (result?.bool?.must ?? []) as unknown[];
      expect(filterFields).not.toContain('entity.namespace');
      expect(JSON.stringify(must)).not.toContain('entity.namespace');
      expect(result?.bool?.must_not).toBeUndefined();
    });

    it('returns filter for user.name and host.id when fieldEvaluations set entity.namespace to local (non-IDP)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        host: { id: 'host-1' },
        event: { kind: 'event', category: 'authentication' },
      });

      expect(result).toBeDefined();
      expect(result?.bool?.filter).toEqual(
        expect.arrayContaining([
          { term: { 'user.name': 'alice' } },
          { term: { 'host.id': 'host-1' } },
        ])
      );
      const filter = result?.bool?.filter as Array<{ term?: Record<string, string> }> | undefined;
      const filterFields = Array.isArray(filter)
        ? filter.map((clause) => Object.keys(clause.term ?? {})[0]).filter(Boolean)
        : [];
      expect(filterFields).not.toContain('entity.namespace');
    });

    it('evaluates correctly for real non-IDP document', () => {
      expect(
        getEuidDslFilterBasedOnDocument('user', {
          '@timestamp': '2026-04-22T12:55:59.638Z',
          data_stream: {
            dataset: ['endpoint.events.file', 'endpoint.events.process'],
          },
          host: {
            name: 'tyrese.goldner-mac',
            id: '4a7a8b68-1814-487f-9e56-5e7bed425edc',
          },
          event: {
            kind: 'event',
            module: 'endpoint',
            category: ['file', 'process'],
            type: ['creation', 'info'],
            dataset: ['endpoint.events.file', 'endpoint.events.process'],
          },
          user: {
            name: 'tyrese.goldner',
            id: '1025',
          },
          entity: {
            lifecycle: {
              first_seen: '2026-04-22T10:14:02.635Z',
              last_seen: '2026-04-22T12:55:59.638Z',
            },
            EngineMetadata: {
              Type: 'user',
              UntypedId: 'tyrese.goldner@4a7a8b68-1814-487f-9e56-5e7bed425edc@local',
            },
            confidence: 'medium',
            namespace: 'local',
            name: 'tyrese.goldner@tyrese.goldner-mac',
            source: 'endpoint',
            id: 'user:tyrese.goldner@4a7a8b68-1814-487f-9e56-5e7bed425edc@local',
            type: 'Identity',
          },
        })
      ).toMatchSnapshot();
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
  it('user: returns documentsFilter AND postAggFilter DSL (IDP or non-IDP only)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('user');

    expect(result).toMatchSnapshot();
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
