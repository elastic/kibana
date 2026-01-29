/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIdFromObject } from './memory';

describe('getIdFromObject', () => {
  it('returns empty string when obj is null or undefined', () => {
    expect(getIdFromObject('host', null)).toBe(undefined);
    expect(getIdFromObject('generic', undefined)).toBe(undefined);
  });

  describe('generic', () => {
    it('returns generic: + entity.id when present', () => {
      expect(getIdFromObject('generic', { entity: { id: 'e-123' } })).toBe('generic:e-123');
    });

    it('returns empty string when no euid field is present', () => {
      expect(getIdFromObject('generic', {})).toBe(undefined);
      expect(getIdFromObject('generic', { entity: {} })).toBe(undefined);
    });
  });

  describe('host', () => {
    it('uses host.entity.id when present', () => {
      expect(getIdFromObject('host', { host: { entity: { id: 'host-entity-1' } } })).toBe(
        'host:host-entity-1'
      );
    });

    it('uses host.id when host.entity.id is missing', () => {
      expect(getIdFromObject('host', { host: { id: 'host-id-1' } })).toBe('host:host-id-1');
    });

    it('uses host.name + "." + host.domain when prior fields are missing', () => {
      expect(getIdFromObject('host', { host: { name: 'myserver', domain: 'example.com' } })).toBe(
        'host:myserver.example.com'
      );
    });

    it('uses host.hostname + "." + host.domain when prior fields are missing', () => {
      expect(
        getIdFromObject('host', {
          host: { hostname: 'box1', domain: 'corp.local' },
        })
      ).toBe('host:box1.corp.local');
    });

    it('uses host.name alone when prior combinations are missing', () => {
      expect(getIdFromObject('host', { host: { name: 'server1' } })).toBe('host:server1');
    });

    it('uses host.hostname alone when prior combinations are missing', () => {
      expect(getIdFromObject('host', { host: { hostname: 'node-1' } })).toBe('host:node-1');
    });

    it('returns empty string when no host id fields are present', () => {
      expect(getIdFromObject('host', {})).toBe(undefined);
      expect(getIdFromObject('host', { host: {} })).toBe(undefined);
    });

    it('precedence: host.entity.id over host.id', () => {
      const obj = { host: { entity: { id: 'e1' }, id: 'h1' } };
      expect(getIdFromObject('host', obj)).toBe('host:e1');
    });

    it('precedence: host.entity.id over host.name and host.domain', () => {
      const obj = {
        host: { entity: { id: 'e1' }, name: 'myserver', domain: 'example.com' },
      };
      expect(getIdFromObject('host', obj)).toBe('host:e1');
    });

    it('precedence: host.id over host.name + host.domain', () => {
      const obj = { host: { id: 'h1', name: 'myserver', domain: 'example.com' } };
      expect(getIdFromObject('host', obj)).toBe('host:h1');
    });

    it('precedence: host.name + host.domain over host.name alone', () => {
      const obj = { host: { name: 'myserver', domain: 'example.com' } };
      expect(getIdFromObject('host', obj)).toBe('host:myserver.example.com');
    });

    it('precedence: host.name over host.hostname when both present', () => {
      const obj = { host: { name: 'server1', hostname: 'node-1' } };
      expect(getIdFromObject('host', obj)).toBe('host:server1');
    });
  });

  describe('user', () => {
    it('uses user.entity.id when present', () => {
      expect(getIdFromObject('user', { user: { entity: { id: 'user-entity-1' } } })).toBe(
        'user:user-entity-1'
      );
    });

    it('uses user.name + "@" + host.entity.id when user.entity.id is missing', () => {
      expect(
        getIdFromObject('user', {
          user: { name: 'alice' },
          host: { entity: { id: 'host-e1' } },
        })
      ).toBe('user:alice@host-e1');
    });

    it('uses user.name + "@" + host.id when prior combination is missing', () => {
      expect(
        getIdFromObject('user', {
          user: { name: 'bob' },
          host: { id: 'host-1' },
        })
      ).toBe('user:bob@host-1');
    });

    it('uses user.name + "@" + host.name when prior combinations are missing', () => {
      expect(
        getIdFromObject('user', {
          user: { name: 'charlie' },
          host: { name: 'workstation' },
        })
      ).toBe('user:charlie@workstation');
    });

    it('uses user.id when prior combinations are missing', () => {
      expect(getIdFromObject('user', { user: { id: 'user-id-42' } })).toBe('user:user-id-42');
    });

    it('uses user.email when prior combinations are missing', () => {
      expect(getIdFromObject('user', { user: { email: 'dev@example.com' } })).toBe(
        'user:dev@example.com'
      );
    });

    it('uses user.name + "@" + user.domain when prior combinations are missing', () => {
      expect(getIdFromObject('user', { user: { name: 'dave', domain: 'corp.com' } })).toBe(
        'user:dave@corp.com'
      );
    });

    it('uses user.name alone when prior combinations are missing', () => {
      expect(getIdFromObject('user', { user: { name: 'eve' } })).toBe('user:eve');
    });

    it('returns empty string when no user id fields are present', () => {
      expect(getIdFromObject('user', {})).toBe(undefined);
      expect(getIdFromObject('user', { user: {} })).toBe(undefined);
    });

    it('precedence: user.entity.id over user.name@host.entity.id', () => {
      const obj = {
        user: { entity: { id: 'ue1' }, name: 'alice' },
        host: { entity: { id: 'he1' } },
      };
      expect(getIdFromObject('user', obj)).toBe('user:ue1');
    });

    it('precedence: user.name@host.entity.id over user.name@host.id', () => {
      const obj = {
        user: { name: 'alice' },
        host: { entity: { id: 'he1' }, id: 'h1' },
      };
      expect(getIdFromObject('user', obj)).toBe('user:alice@he1');
    });

    it('precedence: user.name@host.name over user.id', () => {
      const obj = {
        user: { name: 'bob', id: 'u42' },
        host: { name: 'workstation' },
      };
      expect(getIdFromObject('user', obj)).toBe('user:bob@workstation');
    });

    it('precedence: user.id over user.email', () => {
      const obj = { user: { id: 'u42', email: 'dev@example.com' } };
      expect(getIdFromObject('user', obj)).toBe('user:u42');
    });

    it('precedence: user.email over user.name@user.domain', () => {
      const obj = { user: { email: 'dev@example.com', name: 'dave', domain: 'corp.com' } };
      expect(getIdFromObject('user', obj)).toBe('user:dev@example.com');
    });

    it('precedence: user.name@user.domain over user.name alone', () => {
      const obj = { user: { name: 'eve', domain: 'corp.com' } };
      expect(getIdFromObject('user', obj)).toBe('user:eve@corp.com');
    });
  });

  describe('service', () => {
    it('uses service.entity.id when present', () => {
      expect(getIdFromObject('service', { service: { entity: { id: 'svc-entity-1' } } })).toBe(
        'service:svc-entity-1'
      );
    });

    it('uses service.name when service.entity.id is missing', () => {
      expect(getIdFromObject('service', { service: { name: 'api-gateway' } })).toBe(
        'service:api-gateway'
      );
    });

    it('returns empty string when no service id fields are present', () => {
      expect(getIdFromObject('service', {})).toBe(undefined);
      expect(getIdFromObject('service', { service: {} })).toBe(undefined);
    });

    it('precedence: service.entity.id over service.name', () => {
      const obj = { service: { entity: { id: 'svc-e1' }, name: 'api-gateway' } };
      expect(getIdFromObject('service', obj)).toBe('service:svc-e1');
    });
  });
});
