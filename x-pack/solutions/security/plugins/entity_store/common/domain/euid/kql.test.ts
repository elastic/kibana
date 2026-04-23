/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidKqlFilterBasedOnDocument, conditionToKql } from './kql';

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
    it('returns clause with host.id when present', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('host', {
          host: { name: 'to-be-ignored', id: 'host-id-1' },
        })
      ).toBe('host.id: "host-id-1"');
    });

    it('returns clause with host.id when present (flattened _source)', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('host', {
          _source: { 'host.name': 'to-be-ignored', 'host.id': 'host-id-1' },
        })
      ).toBe('host.id: "host-id-1"');
    });

    it('returns clause with host.name and missing-or-empty guard on host.id when host.id is missing', () => {
      expect(getEuidKqlFilterBasedOnDocument('host', { host: { name: 'server1' } })).toBe(
        `host.name: "server1" AND ${fieldMissingOrEmpty('host.id')}`
      );
    });

    it('returns clause with host.hostname with guards on host.id and host.name when both are absent', () => {
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

    const azureSourceClause =
      '(event.module: "azure" OR data_stream.dataset: azure* OR ' +
      'event.module: "entityanalytics_entra_id" OR data_stream.dataset: entityanalytics_entra_id*)';

    const unknownSourceClause =
      '((NOT event.module: * OR event.module: "") AND (NOT data_stream.dataset: * OR data_stream.dataset: ""))';

    it('returns clause with user.email and source clause (event.module whenClause expands to sourceMatchesAny)', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { email: 'alice@example.com' },
          event: { kind: 'asset', module: 'okta' },
        })
      ).toBe(`user.email: "alice@example.com" AND ${oktaSourceClause}`);
    });

    it('returns clause with user.email and unknown source clause when no event.module or data_stream.dataset', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { email: 'alice@example.com' },
          event: { kind: 'asset' },
        })
      ).toBe(`user.email: "alice@example.com" AND ${unknownSourceClause}`);
    });

    it('returns clause with user.name and source clause and must on higher-ranked fields missing-or-empty', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
          user: { name: 'alice' },
          event: { kind: 'asset', module: 'azure' },
        })
      ).toBe(
        `user.name: "alice" AND ${fieldMissingOrEmpty('user.email')} AND ${fieldMissingOrEmpty(
          'user.id'
        )} AND ${fieldMissingOrEmpty('user.domain')} AND ${azureSourceClause}`
      );
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

    it('returns clause with user.name and user.domain with source clause and must on higher-ranked fields missing-or-empty', () => {
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

    it('excludes all fieldEvaluation destinations (e.g. entity.namespace) from filter and must so the query can match stored documents', () => {
      const result = getEuidKqlFilterBasedOnDocument('user', {
        user: { email: 'bob@example.com' },
        event: { kind: 'asset', module: 'okta' },
      });
      expect(result).not.toContain('entity.namespace');
    });

    it('returns filter for user.name and host.id when fieldEvaluations set entity.namespace to local (non-IDP)', () => {
      const result = getEuidKqlFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        host: { id: 'host-1' },
        event: { kind: 'event', category: 'authentication' },
      });

      expect(result).toBeDefined();
      expect(result).toBe(`user.name: "alice" AND host.id: "host-1"`);
      expect(result).toContain('user.name: "alice"');
      expect(result).toContain('host.id: "host-1"');
      expect(result).not.toContain('entity.namespace');
    });

    it('escapes double quotes in user.email', () => {
      const result = getEuidKqlFilterBasedOnDocument('user', {
        user: { email: 'a"b@example.com' },
        event: { kind: 'asset', module: 'okta' },
      });
      expect(result).toContain('user.email: "a\\"b@example.com"');
    });

    it('evaluates correctly for real non-IDP document', () => {
      expect(
        getEuidKqlFilterBasedOnDocument('user', {
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
      ).toBe(`user.name: "tyrese.goldner" AND host.id: "4a7a8b68-1814-487f-9e56-5e7bed425edc"`);
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

    it('returns clause with service.name (single-field identity)', () => {
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

describe('conditionToKql', () => {
  describe('filter conditions', () => {
    it('converts eq operator', () => {
      expect(conditionToKql({ field: 'status', eq: 'active' })).toBe('status: "active"');
    });

    it('converts neq operator', () => {
      expect(conditionToKql({ field: 'status', neq: 'inactive' })).toBe('NOT status: "inactive"');
    });

    it('converts exists operator (true)', () => {
      expect(conditionToKql({ field: 'user.email', exists: true })).toBe('user.email: *');
    });

    it('converts exists operator (false)', () => {
      expect(conditionToKql({ field: 'user.email', exists: false })).toBe('NOT user.email: *');
    });

    it('converts gt operator', () => {
      expect(conditionToKql({ field: 'age', gt: 18 })).toBe('age > 18');
    });

    it('converts gte operator', () => {
      expect(conditionToKql({ field: 'age', gte: 18 })).toBe('age >= 18');
    });

    it('converts lt operator', () => {
      expect(conditionToKql({ field: 'age', lt: 65 })).toBe('age < 65');
    });

    it('converts lte operator', () => {
      expect(conditionToKql({ field: 'age', lte: 65 })).toBe('age <= 65');
    });

    it('converts range operator with gte and lt', () => {
      expect(
        conditionToKql({ field: 'http.response.status_code', range: { gte: 200, lt: 300 } })
      ).toBe('(http.response.status_code >= 200 AND http.response.status_code < 300)');
    });

    it('converts range operator with gt and lte', () => {
      expect(conditionToKql({ field: 'temperature', range: { gt: 0, lte: 100 } })).toBe(
        '(temperature > 0 AND temperature <= 100)'
      );
    });

    it('converts range operator with all boundaries', () => {
      expect(conditionToKql({ field: 'value', range: { gte: 10, gt: 5, lte: 100, lt: 110 } })).toBe(
        '(value >= 10 AND value > 5 AND value <= 100 AND value < 110)'
      );
    });

    it('converts range operator with date strings', () => {
      expect(
        conditionToKql({ field: '@timestamp', range: { gte: '2024-01-01', lt: '2024-12-31' } })
      ).toBe('(@timestamp >= 2024-01-01 AND @timestamp < 2024-12-31)');
    });

    it('converts contains operator', () => {
      expect(conditionToKql({ field: 'message', contains: 'error' })).toBe('message: *error*');
    });

    it('converts startsWith operator', () => {
      expect(conditionToKql({ field: 'url', startsWith: 'https://' })).toBe('url: https://*');
    });

    it('converts endsWith operator', () => {
      expect(conditionToKql({ field: 'filename', endsWith: '.log' })).toBe('filename: *.log');
    });

    it('converts includes operator', () => {
      expect(conditionToKql({ field: 'event.kind', includes: 'asset' })).toBe(
        'event.kind: "asset"'
      );
    });

    it('escapes double quotes in string values', () => {
      expect(conditionToKql({ field: 'user.name', eq: 'john"doe' })).toBe(
        'user.name: "john\\"doe"'
      );
    });
  });

  describe('logical operators', () => {
    it('converts and condition', () => {
      expect(
        conditionToKql({
          and: [
            { field: 'status', eq: 'active' },
            { field: 'age', gte: 18 },
          ],
        })
      ).toBe('(status: "active" AND age >= 18)');
    });

    it('converts or condition', () => {
      expect(
        conditionToKql({
          or: [
            { field: 'status', eq: 'active' },
            { field: 'status', eq: 'pending' },
          ],
        })
      ).toBe('(status: "active" OR status: "pending")');
    });

    it('converts not condition', () => {
      expect(conditionToKql({ not: { field: 'status', eq: 'deleted' } })).toBe(
        'NOT status: "deleted"'
      );
    });

    it('unwraps single-element and', () => {
      expect(conditionToKql({ and: [{ field: 'status', eq: 'active' }] })).toBe('status: "active"');
    });

    it('unwraps single-element or', () => {
      expect(conditionToKql({ or: [{ field: 'status', eq: 'active' }] })).toBe('status: "active"');
    });

    it('converts nested logical conditions', () => {
      expect(
        conditionToKql({
          and: [
            { field: 'status', eq: 'active' },
            {
              or: [
                { field: 'priority', eq: 'high' },
                { field: 'priority', eq: 'critical' },
              ],
            },
          ],
        })
      ).toBe('(status: "active" AND (priority: "high" OR priority: "critical"))');
    });

    it('converts not wrapping an or', () => {
      expect(
        conditionToKql({
          not: {
            or: [
              { field: 'event.kind', includes: 'asset' },
              { field: 'event.category', includes: 'iam' },
            ],
          },
        })
      ).toBe('NOT (event.kind: "asset" OR event.category: "iam")');
    });
  });

  describe('special conditions', () => {
    it('converts always condition', () => {
      expect(conditionToKql({ always: {} })).toBe('*');
    });

    it('converts never condition', () => {
      expect(conditionToKql({ never: {} })).toBe('NOT *');
    });
  });
});
