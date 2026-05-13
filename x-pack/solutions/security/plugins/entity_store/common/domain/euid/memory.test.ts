/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidFromObject, getEntityIdentifiersFromDocument } from './memory';

describe('getEntityIdentifiersFromDocument', () => {
  it('returns undefined when doc is null or undefined', () => {
    expect(getEntityIdentifiersFromDocument('host', null)).toBeUndefined();
    expect(getEntityIdentifiersFromDocument('host', undefined)).toBeUndefined();
  });

  it('returns host.id entry when nested host.id is present', () => {
    expect(getEntityIdentifiersFromDocument('host', { host: { id: 'h1' } })).toEqual({
      'host.id': 'h1',
    });
  });

  it('returns host.name when host.id is absent', () => {
    expect(getEntityIdentifiersFromDocument('host', { host: { name: 'server1' } })).toEqual({
      'host.name': 'server1',
    });
  });

  it('unwraps _source like getEuidFromObject', () => {
    expect(
      getEntityIdentifiersFromDocument('generic', { _source: { entity: { id: 'e-123' } } })
    ).toEqual({ 'entity.id': 'e-123' });
  });

  it('returns service.name for single-field service identity', () => {
    expect(
      getEntityIdentifiersFromDocument('service', { service: { name: 'api-gateway' } })
    ).toEqual({ 'service.name': 'api-gateway' });
  });

  it('returns undefined for service when service.name is missing', () => {
    expect(getEntityIdentifiersFromDocument('service', { service: {} })).toBeUndefined();
  });

  it('returns user.email and evaluated entity.namespace for IDP email path', () => {
    expect(
      getEntityIdentifiersFromDocument('user', {
        user: { email: 'alice@example.com' },
        event: { kind: 'asset', module: 'okta' },
      })
    ).toEqual({
      'user.email': 'alice@example.com',
      'entity.namespace': 'okta',
    });
  });

  it('returns user.name, host.id, and entity.namespace for non-IDP local path', () => {
    expect(
      getEntityIdentifiersFromDocument('user', {
        user: { name: 'alice' },
        host: { id: 'host-1' },
      })
    ).toEqual({
      'user.name': 'alice',
      'host.id': 'host-1',
      'entity.namespace': 'local',
    });
  });

  it('returns undefined when user document fails pipeline gate (e.g. wrong IDP module)', () => {
    expect(
      getEntityIdentifiersFromDocument('user', {
        user: { email: 'a@b.com' },
        event: { module: 'azure' },
      })
    ).toBeUndefined();
  });

  it('prefers host.id over host.name for host identifiers', () => {
    expect(
      getEntityIdentifiersFromDocument('host', {
        host: { id: 'h1', name: 'server1', hostname: 'node-1' },
      })
    ).toEqual({
      'host.id': 'h1',
    });
  });
});

describe('getEuidFromObject', () => {
  it('returns empty string when obj is null or undefined', () => {
    expect(getEuidFromObject('host', null)).toBe(undefined);
    expect(getEuidFromObject('generic', undefined)).toBe(undefined);
  });

  describe('generic', () => {
    it('returns entity.id without type prefix (skipTypePrepend)', () => {
      expect(getEuidFromObject('generic', { entity: { id: 'e-123' } })).toBe('e-123');
    });

    it('unwraps _source when doc is an Elasticsearch hit', () => {
      expect(getEuidFromObject('generic', { _source: { entity: { id: 'e-123' } } })).toBe('e-123');
    });
  });

  describe('host', () => {
    it('uses host.id when present', () => {
      expect(getEuidFromObject('host', { host: { id: 'host-id-1' } })).toBe('host:host-id-1');
    });

    it('uses host.name when host.id is missing', () => {
      expect(getEuidFromObject('host', { host: { name: 'server1' } })).toBe('host:server1');
    });

    it('uses host.hostname when host.id and host.name are missing', () => {
      expect(getEuidFromObject('host', { host: { hostname: 'node-1' } })).toBe('host:node-1');
    });

    it('precedence: host.id over host.name', () => {
      const obj = { host: { id: 'h1', name: 'server1' } };
      expect(getEuidFromObject('host', obj)).toBe('host:h1');
    });

    it('precedence: host.id over host.hostname', () => {
      const obj = { host: { id: 'h1', hostname: 'node-1' } };
      expect(getEuidFromObject('host', obj)).toBe('host:h1');
    });

    it('precedence: host.name over host.hostname when both present', () => {
      const obj = { host: { name: 'server1', hostname: 'node-1' } };
      expect(getEuidFromObject('host', obj)).toBe('host:server1');
    });

    it('returns undefined when no host identity field is present', () => {
      expect(getEuidFromObject('host', { host: { domain: 'example.com' } })).toBeUndefined();
    });
  });

  describe('user', () => {
    const withNamespace = (doc: object, module: string = 'okta') => ({
      ...doc,
      event: { kind: 'asset', module },
    });

    it('uses user.email + "@" + entity.namespace when user.email and event.module are present', () => {
      expect(
        getEuidFromObject('user', withNamespace({ user: { email: 'alice@example.com' } }))
      ).toBe('user:alice@example.com@okta');
    });

    it('maps event.module okta and entityanalytics_okta to namespace okta', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'a@b.com' },
          event: { kind: 'asset', module: 'entityanalytics_okta' },
        })
      ).toBe('user:a@b.com@okta');
    });

    it('returns undefined when document does not satisfy IDP or non-IDP postAggFilter', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'a@b.com' },
          event: { module: 'azure' },
        })
      ).toBeUndefined();
    });

    it('uses non-IDP path when user.name and host.id are present', () => {
      expect(
        getEuidFromObject('user', {
          user: { name: 'alice' },
          host: { id: 'host-1' },
        })
      ).toBe('user:alice@host-1@local');
    });

    it('returns undefined when event.outcome is failure (documentsFilter)', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'a@b.com' },
          event: { kind: 'asset', module: 'okta', outcome: 'failure' },
        })
      ).toBeUndefined();
    });

    it('maps event.module o365 and o365_metrics to namespace microsoft_365', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'a@b.com' },
          event: { kind: 'asset', module: 'o365_metrics' },
        })
      ).toBe('user:a@b.com@microsoft_365');
    });

    it('uses event.module as entity.namespace when no whenClause matches (fallback to source)', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'a@b.com' },
          event: { kind: 'asset', module: 'custom_module' },
        })
      ).toBe('user:a@b.com@custom_module');
    });

    it('returns euid with entity.namespace fallback when user.email is present but no source (event.module/data_stream.dataset) is set', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'dev@example.com' },
          event: { kind: 'asset' },
        })
      ).toBe('user:dev@example.com@unknown');
    });

    it('uses user.name + "@" + entity.namespace when user.name and event.module are present', () => {
      expect(getEuidFromObject('user', withNamespace({ user: { name: 'alice' } }))).toBe(
        'user:alice@okta'
      );
    });

    it('uses user.id + "@" + entity.namespace when user.id and event.module are present', () => {
      expect(getEuidFromObject('user', withNamespace({ user: { id: 'user-id-42' } }))).toBe(
        'user:user-id-42@okta'
      );
    });

    it('precedence: user.email@entity.namespace over user.id@entity.namespace', () => {
      const obj = withNamespace({
        user: { email: 'alice@example.com', id: 'user-42' },
      });
      expect(getEuidFromObject('user', obj)).toBe('user:alice@example.com@okta');
    });

    it('precedence: user.email over user.name@entity.namespace', () => {
      const obj = withNamespace({
        user: { email: 'dev@example.com', name: 'dave', domain: 'corp.com' },
      });
      expect(getEuidFromObject('user', obj)).toBe('user:dev@example.com@okta');
    });

    it('uses user.name@user.domain when name and domain present', () => {
      expect(
        getEuidFromObject('user', {
          user: { name: 'jane', domain: 'corp.com' },
          event: { kind: 'asset', module: 'entityanalytics_ad' },
        })
      ).toBe('user:jane@corp.com@active_directory');
    });

    it('uses user.name@user.domain when name and domain present (namespace does not affect which instruction matches)', () => {
      expect(
        getEuidFromObject('user', {
          user: { name: 'jane', domain: 'corp.com' },
          event: { kind: 'asset', module: 'okta' },
        })
      ).toBe('user:jane@corp.com@okta');
    });
  });

  describe('service', () => {
    it('returns undefined when service.name is missing (single-field identity)', () => {
      expect(getEuidFromObject('service', { service: { entity: { id: 'svc-entity-1' } } })).toBe(
        undefined
      );
    });

    it('uses service.name (single-field identity)', () => {
      expect(getEuidFromObject('service', { service: { name: 'api-gateway' } })).toBe(
        'service:api-gateway'
      );
    });

    it('returns undefined when no service.name is present', () => {
      expect(getEuidFromObject('service', {})).toBe(undefined);
      expect(getEuidFromObject('service', { service: {} })).toBe(undefined);
    });

    it('uses service.name when both service.entity.id and service.name are present (single-field identity)', () => {
      const obj = { service: { entity: { id: 'svc-e1' }, name: 'api-gateway' } };
      expect(getEuidFromObject('service', obj)).toBe('service:api-gateway');
    });
  });
});
