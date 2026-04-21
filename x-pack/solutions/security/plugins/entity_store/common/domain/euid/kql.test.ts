/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidKqlFilterBasedOnDocument } from './kql';

const fieldMissingOrEmpty = (field: string) => `(NOT ${field}: * OR ${field}: "")`;

describe('getEuidKqlFilterBasedOnDocument', () => {
  it('returns undefined when doc is falsy', () => {
    expect(getEuidKqlFilterBasedOnDocument('host', null)).toBeUndefined();
    expect(getEuidKqlFilterBasedOnDocument('generic', undefined)).toBeUndefined();
    expect(getEuidKqlFilterBasedOnDocument('user', {})).toBeUndefined();
  });

  describe('generic', () => {
    it('returns KQL term on entity.id when present', () => {
      expect(getEuidKqlFilterBasedOnDocument('generic', { entity: { id: 'e-123' } })).toBe(
        'entity.id: "e-123"'
      );
    });

    it('unwraps _source when doc is an Elasticsearch hit', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('generic', { _source: { entity: { id: 'e-123' } } })
      ).toBe('entity.id: "e-123"');
    });
  });

  describe('host', () => {
    it('returns term on host.id when present', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('host', {
          host: { name: 'to-be-ignored', id: 'host-id-1' },
        })
      ).toBe('host.id: "host-id-1"');
    });

    it('returns term on host.id when present (flattened _source)', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('host', {
          _source: { 'host.name': 'to-be-ignored', 'host.id': 'host-id-1' },
        })
      ).toBe('host.id: "host-id-1"');
    });

    it('returns term on host.name with missing-or-empty guard on host.id when host.id is absent', () => {
      expect(getEuidKqlFilterBasedOnDocument('host', { host: { name: 'server1' } })).toBe(
        `host.name: "server1" AND ${fieldMissingOrEmpty('host.id')}`
      );
    });

    it('returns term on host.hostname with guards on host.id and host.name when both are absent', () => {
      expect(getEuidKqlFilterBasedOnDocument('host', { host: { hostname: 'node-1' } })).toBe(
        `host.hostname: "node-1" AND ${fieldMissingOrEmpty('host.id')} AND ${fieldMissingOrEmpty(
          'host.name'
        )}`
      );
    });

    it('precedence: uses host.id when both host.id and host.name are present', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('host', { host: { id: 'e1', name: 'myserver' } })
      ).toBe('host.id: "e1"');
    });

    it('returns undefined when no host identity fields are present', () => {
      expect(getEuidKqlFilterBasedOnDocument('host', { host: { ip: '10.0.0.1' } })).toBeUndefined();
    });

    it('escapes double quotes in host.name', () => {
      expect(getEuidKqlFilterBasedOnDocument('host', { host: { name: 'srv"evil' } })).toBe(
        `host.name: "srv\\"evil" AND ${fieldMissingOrEmpty('host.id')}`
      );
    });
  });

  describe('user', () => {
    // Source clause parts are ordered per-value: for each value in sourceMatchesAny, exact-match
    // fields come before prefix-match fields (event.module before data_stream.dataset).
    const oktaSourceClause =
      '(event.module: "okta" OR data_stream.dataset: okta* OR ' +
      'event.module: "entityanalytics_okta" OR data_stream.dataset: entityanalytics_okta*)';

    it('returns term on user.email and source clause for okta namespace', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { email: 'alice@example.com' },
          event: { kind: 'asset', module: 'okta' },
        })
      ).toBe(`user.email: "alice@example.com" AND ${oktaSourceClause}`);
    });

    it('entity store record without event.module: omits source clause (entity.namespace re-evaluates to unknown)', () => {
      // Entity store records don't carry event.module, so applyFieldEvaluations re-derives
      // entity.namespace as 'unknown'. No whenClause matches 'unknown', so no source clause
      // is appended. The identity field alone is still useful for timeline filtering.
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          'user.email': 'alice@example.com',
          'entity.namespace': 'okta',
          'entity.id': 'user:alice@example.com@okta',
        })
      ).toBe('user.email: "alice@example.com"');
    });

    it('returns term on user.email and source clause for entityanalytics_okta module', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { email: 'alice@example.com' },
          event: { kind: 'asset', module: 'entityanalytics_okta' },
        })
      ).toBe(`user.email: "alice@example.com" AND ${oktaSourceClause}`);
    });

    it('returns term on user.email without source clause when no event.module or data_stream.dataset (unknown namespace)', () => {
      const result = getEuidKqlFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
        event: { kind: 'asset' },
      });
      // Source match spec is 'unknown' — no source clause appended; identity field alone is included
      expect(result).toBe('user.email: "alice@example.com"');
    });

    it('returns term on user.name and source clause with higher-ranked fields guarded (entra_id)', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { name: 'alice' },
          event: { kind: 'asset', module: 'azure' },
        })
      ).toBe(
        'user.name: "alice" AND ' +
          `${fieldMissingOrEmpty('user.email')} AND ` +
          `${fieldMissingOrEmpty('user.id')} AND ` +
          `${fieldMissingOrEmpty('user.domain')} AND ` +
          '(event.module: "azure" OR data_stream.dataset: azure* OR ' +
          'event.module: "entityanalytics_entra_id" OR data_stream.dataset: entityanalytics_entra_id*)'
      );
    });

    it('returns term on user.name + user.domain and source clause (active_directory), guards on email and id', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { name: 'jane', domain: 'corp.com' },
          event: { kind: 'asset', module: 'entityanalytics_ad' },
        })
      ).toBe(
        'user.name: "jane" AND user.domain: "corp.com" AND ' +
          `${fieldMissingOrEmpty('user.email')} AND ` +
          `${fieldMissingOrEmpty('user.id')} AND ` +
          '(event.module: "entityanalytics_ad" OR data_stream.dataset: entityanalytics_ad*)'
      );
    });

    it('returns term on user.name + host.id for local namespace (no source clause needed)', () => {
      const result = getEuidKqlFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        host: { id: 'host-1' },
        event: { kind: 'event', category: 'authentication' },
      });
      expect(result).toBeDefined();
      expect(result).toContain('user.name: "alice"');
      expect(result).toContain('host.id: "host-1"');
      expect(result).not.toContain('entity.namespace');
    });

    it('does not include entity.namespace in the KQL output', () => {
      const result = getEuidKqlFilterBasedOnDocument('user', {
        user: { email: 'bob@example.com' },
        event: { kind: 'asset', module: 'okta' },
      });
      expect(result).not.toContain('entity.namespace');
    });

    it('returns undefined when doc passes documentsFilter but fails postAggFilter (no asset/iam/entity.id)', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { id: 'user-id-42' },
          event: { module: 'o365' },
        })
      ).toBeUndefined();
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidKqlFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.email and source clause when both user.email and user.id are present', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { email: 'alice@example.com', id: 'user-42' },
          event: { kind: 'asset', module: 'entityanalytics_okta' },
        })
      ).toBe(`user.email: "alice@example.com" AND ${oktaSourceClause}`);
    });

    it('escapes double quotes in user.email', () => {
      const result = getEuidKqlFilterBasedOnDocument('user', {
        user: { email: 'a"b@example.com' },
        event: { kind: 'asset', module: 'okta' },
      });
      expect(result).toContain('user.email: "a\\"b@example.com"');
    });
  });

  describe('service', () => {
    it('returns undefined when service.name is missing (single-field identity)', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('service', {
          service: { entity: { id: 'svc-entity-1' } },
        })
      ).toBeUndefined();
    });

    it('returns term on service.name (single-field identity)', () => {
      expect(getEuidKqlFilterBasedOnDocument('service', { service: { name: 'api-gateway' } })).toBe(
        'service.name: "api-gateway"'
      );
    });

    it('uses service.name when both service.entity.id and service.name are present', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('service', {
          service: { entity: { id: 'svc-e1' }, name: 'api-gateway' },
        })
      ).toBe('service.name: "api-gateway"');
    });
  });
});
