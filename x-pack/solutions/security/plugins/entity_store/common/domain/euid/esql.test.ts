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
  getFieldEvaluationsEsql,
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

      expect(result).toBe('(entity.id == "e-123")');
    });

    it('unwraps _source when doc is an Elasticsearch hit', () => {
      const result = getEuidEsqlFilterBasedOnDocument('generic', {
        _source: { entity: { id: 'e-123' } },
      });

      expect(result).toBe('(entity.id == "e-123")');
    });
  });

  describe('host', () => {
    it('returns filter with equality on host.id when present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', {
        host: { name: 'to-be-ignored', id: 'host-id-1' },
      });

      expect(result).toBe('((host.id == "host-id-1"))');
    });

    it('returns filter with equality on host.name and null/empty check on host.id when host.id is missing', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', { host: { name: 'server1' } });

      expect(result).toBe('((host.name == "server1") AND (host.id IS NULL OR host.id == ""))');
    });

    it('returns filter with equality on host.hostname and null/empty checks when only host.hostname is present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', { host: { hostname: 'node-1' } });

      expect(result).toBe(
        '((host.hostname == "node-1") AND (host.id IS NULL OR host.id == "") AND (host.name IS NULL OR host.name == ""))'
      );
    });

    it('precedence: uses host.id when both host.id and host.name are present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('host', {
        host: { id: 'e1', name: 'myserver' },
      });

      expect(result).toBe('((host.id == "e1"))');
    });
  });

  describe('user', () => {
    it('returns filter with equality on user.email and entity.namespace when present (event.module sets namespace)', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
        event: { module: 'okta' },
      });

      expect(result).toBe('((user.email == "alice@example.com") AND (entity.namespace == "okta"))');
    });

    it('returns filter with entity.namespace fallback when user.email is present but no source (event.module/data_stream.dataset) is set', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com' },
      });

      expect(result).toBe(
        '((user.email == "alice@example.com") AND (entity.namespace == "unknown"))'
      );
    });

    it('returns filter with equality on user.name and entity.namespace and null/empty checks on higher-ranked identity fields when user.name is present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        event: { module: 'azure' },
      });

      expect(result).toBe(
        '((user.name == "alice") AND (entity.namespace == "entra_id") AND (user.email IS NULL OR user.email == "") AND (user.id IS NULL OR user.id == "") AND (user.domain IS NULL OR user.domain == ""))'
      );
    });

    it('returns filter with equality on user.id and entity.namespace and null/empty check on higher-ranked identity field when only user.id is present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { id: 'user-id-42' },
        event: { module: 'o365' },
      });

      expect(result).toBe(
        '((user.id == "user-id-42") AND (entity.namespace == "microsoft_365") AND (user.email IS NULL OR user.email == ""))'
      );
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidEsqlFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.email and entity.namespace when both user.email and user.id are present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { email: 'alice@example.com', id: 'user-42' },
        event: { module: 'entityanalytics_okta' },
      });

      expect(result).toBe('((user.email == "alice@example.com") AND (entity.namespace == "okta"))');
    });

    it('returns filter for user.name and user.domain when name and domain present', () => {
      const result = getEuidEsqlFilterBasedOnDocument('user', {
        user: { name: 'jane', domain: 'corp.com' },
        event: { module: 'entityanalytics_ad' },
      });

      expect(result).toBe(
        '((user.name == "jane") AND (user.domain == "corp.com") AND (entity.namespace == "active_directory") AND (user.email IS NULL OR user.email == "") AND (user.id IS NULL OR user.id == ""))'
      );
    });
  });

  describe('service', () => {
    it('returns undefined when service.name is missing (single-field identity)', () => {
      const result = getEuidEsqlFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-entity-1' } },
      });

      expect(result).toBeUndefined();
    });

    it('returns filter with equality on service.name (single-field identity)', () => {
      const result = getEuidEsqlFilterBasedOnDocument('service', {
        service: { name: 'api-gateway' },
      });

      expect(result).toBe('(service.name == "api-gateway")');
    });

    it('uses service.name when both service.entity.id and service.name are present (single-field identity)', () => {
      const result = getEuidEsqlFilterBasedOnDocument('service', {
        service: { entity: { id: 'svc-e1' }, name: 'api-gateway' },
      });

      expect(result).toBe('(service.name == "api-gateway")');
    });
  });
});

describe('getEuidEsqlDocumentsContainsIdFilter', () => {
  it('returns single field condition for generic (one required field)', () => {
    const result = getEuidEsqlDocumentsContainsIdFilter('generic');

    expect(result).toBe('(entity.id IS NOT NULL AND entity.id != "")');
  });

  it('returns OR of required fields for host', () => {
    const result = getEuidEsqlDocumentsContainsIdFilter('host');

    const expected =
      'NOT(`host.id` IS NULL) AND `host.id` != "" OR NOT(`host.name` IS NULL) AND `host.name` != "" OR NOT(`host.hostname` IS NULL) AND `host.hostname` != ""';
    expect(result).toBe(expected);
  });

  it('returns documents filter AND contains-id expression for user', () => {
    const result = getEuidEsqlDocumentsContainsIdFilter('user');

    expect(result).toMatch(/event\.kind/);
    expect(result).toMatch(/event\.category/);
    expect(result).toMatch(/AND\s+\(/);
    expect(result).toMatch(/user\.email/);
    expect(result).toMatch(/user\.id/);
    expect(result).toMatch(/user\.name/);
  });
});

describe('getFieldEvaluationsEsql', () => {
  it('returns empty string for entity types without field evaluations', () => {
    expect(getFieldEvaluationsEsql('generic')).toBe(undefined);
    expect(getFieldEvaluationsEsql('host')).toBe(undefined);
    expect(getFieldEvaluationsEsql('service')).toBe(undefined);
  });

  it('returns EVAL fragment for user entity.namespace with var per source then CASE', () => {
    const result = getFieldEvaluationsEsql('user');
    const base = '_src_entity_namespace';
    const v0 = `${base}0`;
    const v1 = `${base}1`;
    const expected = [
      `${v0} = MV_FIRST(event.module)`,
      `${v1} = MV_FIRST(SPLIT(MV_FIRST(data_stream.dataset), "."))`,
      `${base} = CASE((${v0} IS NOT NULL AND ${v0} != ""), ${v0}, (${v1} IS NOT NULL AND ${v1} != ""), ${v1}, NULL)`,
      `entity.namespace = CASE((${base} IS NULL OR ${base} == ""), "unknown", (${base} == "okta" OR ${base} == "entityanalytics_okta"), "okta", (${base} == "azure" OR ${base} == "entityanalytics_entra_id"), "entra_id", (${base} == "o365" OR ${base} == "o365_metrics"), "microsoft_365", (${base} == "entityanalytics_ad"), "active_directory", ${base})`,
    ].join(', ');
    expect(result?.replace(/\s+/g, ' ').trim()).toBe(expected.replace(/\s+/g, ' ').trim());
  });
});

describe('getEuidEsqlEvaluation', () => {
  it('returns raw field for generic (skipTypePrepend: no type prefix)', () => {
    const result = getEuidEsqlEvaluation('generic');

    const expected = 'entity.id';
    expect(normalize(result)).toBe(normalize(expected));
  });

  it('returns full CONCAT(type:, CASE(...), NULL) for calculated identity (host)', () => {
    const result = getEuidEsqlEvaluation('host');

    const expected = `CONCAT("host:", CASE((host.id IS NOT NULL AND host.id != ""), host.id,
                      (host.name IS NOT NULL AND host.name != ""), host.name,
                      (host.hostname IS NOT NULL AND host.hostname != ""), host.hostname, NULL))`;
    expect(normalize(result)).toBe(normalize(expected));
  });
});
