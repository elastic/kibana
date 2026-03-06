/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEuidEsqlEvaluation,
  getEuidEsqlDocumentsContainsIdFilter,
  getEuidEsqlFilterBasedOnDocument,
} from './esql';

const normalize = (s: string) =>
  s
    .split(/\n/)
    .map((line) => line.replace(/\s{2,}/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');

describe('getEuidEsqlFilterBasedOnDocument', () => {
  it('returns undefined when doc is falsy', () => {
    expect(getEuidEsqlFilterBasedOnDocument('host', null)).toBeUndefined();
    expect(getEuidEsqlFilterBasedOnDocument('generic', undefined)).toBeUndefined();
    expect(getEuidEsqlFilterBasedOnDocument('user', {})).toBeUndefined();
  });

  describe('generic', () => {
    it('returns ESQL filter with equality on entity.id when present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('generic', { entity: { id: 'e-123' } });

      expect(result).toBe('((entity.id == "e-123"))');
    });

    it('unwraps _source when doc is an Elasticsearch hit', () => {
      const result = getEuidEsqlFilterBasedOnDocument('generic', {
        _source: { entity: { id: 'e-123' } },
      });

      expect(result).toBe('((entity.id == "e-123"))');
    });
  });

  describe('host', () => {
    it('returns filter with equality on host.entity.id when present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', {
        host: { name: 'to-be-ignored', entity: { id: 'host-entity-1' } },
      });

      expect(result).toBe('((host.entity.id == "host-entity-1"))');
    });

    it('returns filter with equality on host.id and null/empty check on host.entity.id when host.entity.id is missing', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', { host: { id: 'host-id-1' } });

      expect(result).toBe(
        '((host.id == "host-id-1") AND (host.entity.id IS NULL OR host.entity.id == ""))'
      );
    });

    it('returns filter with equalities on host.name and host.domain and null/empty checks when composed id is used', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', {
        host: { name: 'myserver', domain: 'example.com' },
      });

      expect(result).toBe(
        '((host.name == "myserver") AND (host.domain == "example.com") AND (host.entity.id IS NULL OR host.entity.id == "") AND (host.id IS NULL OR host.id == ""))'
      );
    });

    it('returns filter with equality on host.name and null/empty checks when only host.name is present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', { host: { name: 'server1' } });

      expect(result).toBe(
        '((host.name == "server1") AND (host.entity.id IS NULL OR host.entity.id == "") AND (host.id IS NULL OR host.id == "") AND (host.domain IS NULL OR host.domain == "") AND (host.hostname IS NULL OR host.hostname == ""))'
      );
    });

    it('precedence: uses host.entity.id when both host.entity.id and host.name are present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', {
        host: { entity: { id: 'e1' }, name: 'myserver', domain: 'example.com' },
      });

      expect(result).toBe('((host.entity.id == "e1"))');
    });
  });

  describe('user', () => {
    it('returns filter with equality on user.email when present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
      });

      expect(result).toBe('((user.email == "alice@example.com"))');
    });

    it('returns filter with equality on user.name and null/empty checks on higher-ranked identity fields when user.name is present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { name: 'alice' },
      });

      expect(result).toBe(
        '((user.name == "alice") AND (user.email IS NULL OR user.email == "") AND (user.id IS NULL OR user.id == ""))'
      );
    });

    it('returns filter with equality on user.id and null/empty check on higher-ranked identity field when only user.id is present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', { user: { id: 'user-id-42' } });

      expect(result).toBe(
        '((user.id == "user-id-42") AND (user.email IS NULL OR user.email == ""))'
      );
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidEsqlFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.email when both user.email and user.id are present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com', id: 'user-42' },
      });

      expect(result).toBe('((user.email == "alice@example.com"))');
    });
  });

  describe('service', () => {
    it('returns filter with equality on service.entity.id when present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-entity-1' } },
      });

      expect(result).toBe('((service.entity.id == "svc-entity-1"))');
    });

    it('returns filter with equality on service.name and null/empty check when service.entity.id is missing', () => {
      const result = getEuidEsqlFilterBasedOnDocument('service', {
        service: { name: 'api-gateway' },
      });

      expect(result).toBe(
        '((service.name == "api-gateway") AND (service.entity.id IS NULL OR service.entity.id == ""))'
      );
    });

    it('precedence: uses service.entity.id when both service.entity.id and service.name are present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-e1' }, name: 'api-gateway' },
      });

      expect(result).toBe('((service.entity.id == "svc-e1"))');
    });
  });
});

describe('getEuidEsqlDocumentsContainsIdFilter', () => {
  it('returns single field condition for generic (one required field)', () => {
    const result = getEuidEsqlDocumentsContainsIdFilter('generic');

    const expected = '(entity.id IS NOT NULL AND entity.id != "")';
    expect(result).toBe(expected);
  });

  it('returns OR of required fields for host', () => {
    const result = getEuidEsqlDocumentsContainsIdFilter('host');

    const expected =
      '(host.entity.id IS NOT NULL AND host.entity.id != "") OR (host.id IS NOT NULL AND host.id != "") OR (host.name IS NOT NULL AND host.name != "") OR (host.hostname IS NOT NULL AND host.hostname != "")';
    expect(result).toBe(expected);
  });

  it('returns documents filter AND contains-id expression for user', () => {
    const result = getEuidEsqlDocumentsContainsIdFilter('user');

    expect(result).toMatch(/event\.kind/);
    expect(result).toMatch(/event\.category/);
    expect(result).toMatch(/AND\s+\(/);
    expect(result).toMatch(/user\.email IS NOT NULL AND user\.email != ""/);
    expect(result).toMatch(/user\.id IS NOT NULL AND user\.id != ""/);
    expect(result).toMatch(/user\.name IS NOT NULL AND user\.name != ""/);
  });
});

describe('getEuidEsqlEvaluation', () => {
  it('returns field IS NOT NULL AND field != "" for non-calculated identity (generic)', () => {
    const result = getEuidEsqlEvaluation('generic');

    const expected = 'CONCAT("generic:", entity.id)';
    expect(normalize(result)).toBe(normalize(expected));
  });

  it('returns full CONCAT(type:, CASE(...), NULL) for calculated identity (host)', () => {
    const result = getEuidEsqlEvaluation('host');

    const expected = `CONCAT("host:", CASE((host.entity.id IS NOT NULL AND host.entity.id != ""), host.entity.id,
                      (host.id IS NOT NULL AND host.id != ""), host.id,
                      (host.name IS NOT NULL AND host.name != "" AND host.domain IS NOT NULL AND host.domain != ""), CONCAT(host.name, ".", host.domain),
                      (host.hostname IS NOT NULL AND host.hostname != "" AND host.domain IS NOT NULL AND host.domain != ""), CONCAT(host.hostname, ".", host.domain),
                      (host.name IS NOT NULL AND host.name != ""), host.name,
                      (host.hostname IS NOT NULL AND host.hostname != ""), host.hostname, NULL))`;
    expect(normalize(result)).toBe(normalize(expected));
  });
});
