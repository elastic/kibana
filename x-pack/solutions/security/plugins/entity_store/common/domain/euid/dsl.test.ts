/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidDslFilterBasedOnDocument } from './dsl';

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
    it('returns filter with term on user.entity.id when present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { entity: { id: 'user-entity-1' } },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.entity.id': 'user-entity-1' } }],
        },
      });
    });

    it('returns filter with terms on user.name and host.entity.id when composed id is used', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { name: 'alice' },
        host: { entity: { id: 'host-e1' } },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.name': 'alice' } }, { term: { 'host.entity.id': 'host-e1' } }],
          must_not: [{ exists: { field: 'user.entity.id' } }],
        },
      });
    });

    it('returns filter with term on user.id when only user.id is present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', { user: { id: 'user-id-42' } });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.id': 'user-id-42' } }],
          must_not: [
            { exists: { field: 'user.entity.id' } },
            { exists: { field: 'user.name' } },
            { exists: { field: 'host.entity.id' } },
            { exists: { field: 'host.id' } },
            { exists: { field: 'host.name' } },
          ],
        },
      });
    });

    it('returns undefined when no user id fields are present', () => {
      expect(getEuidDslFilterBasedOnDocument('user', {})).toBeUndefined();
    });

    it('precedence: uses user.entity.id when both user.entity.id and user.name@host.entity.id are present', () => {
      const result = getEuidDslFilterBasedOnDocument('user', {
        user: { entity: { id: 'ue1' }, name: 'alice' },
        host: { entity: { id: 'he1' } },
      });

      expect(result).toEqual({
        bool: {
          filter: [{ term: { 'user.entity.id': 'ue1' } }],
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
