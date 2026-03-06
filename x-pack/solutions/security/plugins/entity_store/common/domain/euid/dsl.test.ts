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
    it('returns filter with term on user.email and entity.namespace when present (event.module sets namespace)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
        event: { module: 'okta' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            { term: { 'entity.namespace': 'okta' } },
          ],
        },
      });
    });

    it('returns undefined when user.email is present but event.module is missing (entity.namespace not set)', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
      });

      expect(result).toBeUndefined();
    });

    it('returns filter with term on user.name and entity.namespace and must_not on higher-ranked identity fields when user.name is present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        event: { module: 'azure' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.name': 'alice' } },
            { term: { 'entity.namespace': 'entra_id' } },
          ],
          must_not: [
            { exists: { field: 'user.email' } },
            { exists: { field: 'user.id' } },
            { exists: { field: 'user.domain' } },
          ],
        },
      });
    });

    it('returns filter with term on user.id and entity.namespace and must_not on higher-ranked identity fields when only user.id is present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { id: 'user-id-42' },
        event: { module: 'o365' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.id': 'user-id-42' } },
            { term: { 'entity.namespace': 'microsoft_365' } },
          ],
          must_not: [{ exists: { field: 'user.email' } }],
        },
      });
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidDslFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.email and entity.namespace when both user.email and user.id are present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com', id: 'user-42' },
        event: { module: 'entityanalytics_okta' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.email': 'alice@example.com' } },
            { term: { 'entity.namespace': 'okta' } },
          ],
        },
      });
    });

    it('returns filter for Active Directory conditional: user.name, user.domain, entity.namespace when namespace is active_directory', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'jane', domain: 'corp.com' },
        event: { module: 'entityanalytics_ad' },
      });

      expect(result).toEqual({
        bool: {
          filter: [
            { term: { 'user.name': 'jane' } },
            { term: { 'user.domain': 'corp.com' } },
            { term: { 'entity.namespace': 'active_directory' } },
          ],
          must_not: [{ exists: { field: 'user.email' } }, { exists: { field: 'user.id' } }],
        },
      });
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

const userIsNotEmptyClause = (field: string) => ({
  bool: {
    must: [{ exists: { field } }, { bool: { must_not: { match: { [field]: '' } } } }],
  },
});

describe('getEuidDslDocumentsContainsIdFilter', () => {
  it('user: returns bool with documentsFilter and should with all user identity fields', () => {
    const result = getEuidDslDocumentsContainsIdFilter('user');

    expect(result).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      { match: { 'event.kind': 'asset' } },
                      {
                        bool: {
                          should: [
                            userIsNotEmptyClause('user.email'),
                            userIsNotEmptyClause('user.id'),
                            userIsNotEmptyClause('user.name'),
                          ],
                        },
                      },
                    ],
                  },
                },
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
                      {
                        bool: {
                          should: [
                            userIsNotEmptyClause('user.email'),
                            userIsNotEmptyClause('user.id'),
                            userIsNotEmptyClause('user.name'),
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
          {
            bool: {
              should: [
                { exists: { field: 'user.email' } },
                { exists: { field: 'user.id' } },
                { exists: { field: 'user.name' } },
                { exists: { field: 'client.user.email' } },
                { exists: { field: 'source.user.email' } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  it('host: returns should with all host identity fields', () => {
    const result = getEuidDslDocumentsContainsIdFilter('host');

    expect(result).toEqual({
      bool: {
        should: [
          { exists: { field: 'host.entity.id' } },
          { exists: { field: 'host.id' } },
          { exists: { field: 'host.name' } },
          { exists: { field: 'host.hostname' } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('service: returns should with all service identity fields', () => {
    const result = getEuidDslDocumentsContainsIdFilter('service');

    expect(result).toEqual({
      bool: {
        should: [{ exists: { field: 'service.entity.id' } }, { exists: { field: 'service.name' } }],
        minimum_should_match: 1,
      },
    });
  });

  it('generic: returns should with entity.id', () => {
    const result = getEuidDslDocumentsContainsIdFilter('generic');

    expect(result).toEqual({
      bool: {
        should: [{ exists: { field: 'entity.id' } }],
        minimum_should_match: 1,
      },
    });
  });
});
