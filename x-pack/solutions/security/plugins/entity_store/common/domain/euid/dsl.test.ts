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
    it('returns filter with term on host.entity.id when present', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        host: { name: 'to-be-ignored', entity: { id: 'host-entity-1' } },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.entity.id': 'host-entity-1' } }],
        },
      });
    });

    it('returns filter with term on host.entity.id when present (with flattened source)', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        _source: {
          'host.name': 'to-be-ignored',
          'host.entity.id': 'host-entity-1',
        },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.entity.id': 'host-entity-1' } }],
        },
      });
    });

    it('returns filter with term on host.id when host.entity.id is missing', () => {
      const result = getEuidDslFilterBasedOnDocument('host', { host: { id: 'host-id-1' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.id': 'host-id-1' } }],
          must_not: [{ exists: { field: 'host.entity.id' } }],
        },
      });
    });

    it('returns filter with terms on host.name and host.domain when composed id is used', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        host: { name: 'myserver', domain: 'example.com' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'host.name': 'myserver' } },
            { term: { 'host.domain': 'example.com' } },
          ],
          must_not: [{ exists: { field: 'host.entity.id' } }, { exists: { field: 'host.id' } }],
        },
      });
    });

    it('returns filter with term on host.name when only host.name is present', () => {
      const result = getEuidDslFilterBasedOnDocument('host', { host: { name: 'server1' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.name': 'server1' } }],
          must_not: [
            { exists: { field: 'host.entity.id' } },
            { exists: { field: 'host.id' } },
            { exists: { field: 'host.domain' } },
            { exists: { field: 'host.hostname' } },
          ],
        },
      });
    });

    it('precedence: uses host.entity.id when both host.entity.id and host.name are present', () => {
      const result = getEuidDslFilterBasedOnDocument('host', {
        host: { entity: { id: 'e1' }, name: 'myserver', domain: 'example.com' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'host.entity.id': 'e1' } }],
        },
      });
    });
  });

  describe('user', () => {
    it('returns filter with term on user.email only (entity.namespace is evaluated, not stored, so excluded from query)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
        event: { module: 'okta' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.email': 'alice@example.com' } }],
        },
      });
    });

    it('returns undefined when user.email is present but event.module is missing (entity.namespace not set)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
      });

      expect(result).toBeUndefined();
    });

    it('returns filter with term on user.name only and must_not on higher-ranked identity fields (entity.namespace excluded)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        event: { module: 'azure' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.name': 'alice' } }],
          must_not: [
            { exists: { field: 'user.email' } },
            { exists: { field: 'user.id' } },
            { exists: { field: 'user.domain' } },
          ],
        },
      });
    });

    it('returns filter with term on user.id only and must_not on user.email (entity.namespace excluded)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { id: 'user-id-42' },
        event: { module: 'o365' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.id': 'user-id-42' } }],
          must_not: [{ exists: { field: 'user.email' } }],
        },
      });
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidDslFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.email only when both user.email and user.id are present (entity.namespace excluded)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com', id: 'user-42' },
        event: { module: 'entityanalytics_okta' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.email': 'alice@example.com' } }],
        },
      });
    });

    it('returns filter for Active Directory conditional: user.name and user.domain only (entity.namespace excluded)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'jane', domain: 'corp.com' },
        event: { module: 'entityanalytics_ad' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.name': 'jane' } }, { term: { 'user.domain': 'corp.com' } }],
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
    it('returns filter with term on service.entity.id when present', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-entity-1' } },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'service.entity.id': 'svc-entity-1' } }],
        },
      });
    });

    it('returns filter with term on service.name when service.entity.id is missing', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { name: 'api-gateway' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'service.name': 'api-gateway' } }],
          must_not: [{ exists: { field: 'service.entity.id' } }],
        },
      });
    });

    it('precedence: uses service.entity.id when both service.entity.id and service.name are present', () => {
      const result = getEuidDslFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-e1' }, name: 'api-gateway' },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'service.entity.id': 'svc-e1' } }],
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
  it('user: returns documentsFilter DSL (identity AND (asset OR iam branch))', () => {
    const result = getEuidDslDocumentsContainsIdFilter('user');

    expect(result).toEqual({
      bool: {
        must: [
          {
            bool: {
              should: [
                isNotEmptyClause('user.email'),
                isNotEmptyClause('user.id'),
                isNotEmptyClause('user.name'),
              ],
            },
          },
          {
            bool: {
              should: [
                { bool: { must: [{ match: { 'event.kind': 'asset' } }] } },
                {
                  bool: {
                    must: [
                      { terms: { 'event.category': ['iam'] } },
                      {
                        bool: {
                          should: [
                            { match: { 'event.type': 'user' } },
                            { match: { 'event.type': 'creation' } },
                            { match: { 'event.type': 'deletion' } },
                            { match: { 'event.type': 'group' } },
                          ],
                        },
                      },
                      { bool: { must_not: { match: { 'event.kind': 'enrichment' } } } },
                    ],
                  },
                },
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
          isNotEmptyClause('host.entity.id'),
          isNotEmptyClause('host.id'),
          isNotEmptyClause('host.name'),
          isNotEmptyClause('host.hostname'),
        ],
      },
    });
  });

  it('service: returns documentsFilter DSL (or of isNotEmpty for each identity field)', () => {
    const result = getEuidDslDocumentsContainsIdFilter('service');

    expect(result).toEqual({
      bool: {
        should: [isNotEmptyClause('service.entity.id'), isNotEmptyClause('service.name')],
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
