/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidFromObject } from './memory';

describe('getEuidFromObject', () => {
  it('returns empty string when obj is null or undefined', () => {
    expect(getEuidFromObject('host', null)).toBe(undefined);
    expect(getEuidFromObject('generic', undefined)).toBe(undefined);
  });

  describe('generic', () => {
    it('returns generic: + entity.id when present', () => {
      expect(getEuidFromObject('generic', { entity: { id: 'e-123' } })).toBe('generic:e-123');
    });

    it('unwraps _source when doc is an Elasticsearch hit', () => {
      expect(getEuidFromObject('generic', { _source: { entity: { id: 'e-123' } } })).toBe(
        'generic:e-123'
      );
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
      event: { module },
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
          event: { module: 'entityanalytics_okta' },
        })
      ).toBe('user:a@b.com@okta');
    });

    it('maps event.module azure and entityanalytics_entra_id to namespace entra_id', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'a@b.com' },
          event: { module: 'azure' },
        })
      ).toBe('user:a@b.com@entra_id');
    });

    it('maps event.module o365 and o365_metrics to namespace microsoft_365', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'a@b.com' },
          event: { module: 'o365_metrics' },
        })
      ).toBe('user:a@b.com@microsoft_365');
    });

    it('uses event.module as entity.namespace when no whenClause matches (fallback to source)', () => {
      expect(
        getEuidFromObject('user', {
          user: { email: 'a@b.com' },
          event: { module: 'custom_module' },
        })
      ).toBe('user:a@b.com@custom_module');
    });

    it('returns undefined when user.email is present but event.module is null (entity.namespace null)', () => {
      expect(getEuidFromObject('user', { user: { email: 'dev@example.com' } })).toBeUndefined();
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

    it('uses user.name@user.domain@entity.namespace when entity.namespace is active_directory (conditional instruction)', () => {
      expect(
        getEuidFromObject('user', {
          user: { name: 'jane', domain: 'corp.com' },
          event: { module: 'entityanalytics_ad' },
        })
      ).toBe('user:jane@corp.com@active_directory');
    });

    it('uses user.name@entity.namespace when name and domain present but namespace is not active_directory', () => {
      expect(
        getEuidFromObject('user', {
          user: { name: 'jane', domain: 'corp.com' },
          event: { module: 'okta' },
        })
      ).toBe('user:jane@okta');
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
