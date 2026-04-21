/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils/types';
import { getEntityFields } from './utils';

const makeDoc = (source: Record<string, unknown>): DataTableRecord =>
  ({
    id: 'test',
    raw: { _source: source },
    flattened: {},
  } as unknown as DataTableRecord);

describe('getEntityFields', () => {
  describe('entityIdentifier', () => {
    it('returns user.name (not entity.name) as entityIdentifier for a local user with composed entity.name', () => {
      // Local user: entity.name = user.name@host.name, but alerts use user.name
      const doc = makeDoc({
        entity: {
          name: 'glo@glorias-macbook-pro.local',
          id: 'user:glo@host-id@local',
          EngineMetadata: { Type: 'user' },
        },
        user: { name: 'glo' },
      });

      const { entityName, entityIdentifier, entityType } = getEntityFields(doc);

      expect(entityType).toBe('user');
      expect(entityName).toBe('glo@glorias-macbook-pro.local');
      expect(entityIdentifier).toBe('glo'); // must be user.name, not entity.name
    });

    it('returns user.name as entityIdentifier for an IDP user where entity.name equals user.name', () => {
      const doc = makeDoc({
        entity: {
          name: 'john.doe',
          id: 'user:john.doe@okta',
          EngineMetadata: { Type: 'user' },
        },
        user: { name: 'john.doe' },
      });

      const { entityName, entityIdentifier } = getEntityFields(doc);

      expect(entityName).toBe('john.doe');
      expect(entityIdentifier).toBe('john.doe');
    });

    it('returns host.name as entityIdentifier for a host entity', () => {
      const doc = makeDoc({
        entity: {
          name: 'web-server.example.com',
          id: 'host:web-server.example.com',
          EngineMetadata: { Type: 'host' },
        },
        host: { name: 'web-server' },
      });

      const { entityName, entityIdentifier } = getEntityFields(doc);

      expect(entityName).toBe('web-server.example.com');
      expect(entityIdentifier).toBe('web-server');
    });

    it('returns service.name as entityIdentifier for a service entity', () => {
      const doc = makeDoc({
        entity: {
          name: 'api-gateway',
          id: 'service:api-gateway',
          EngineMetadata: { Type: 'service' },
        },
        service: { name: 'api-gateway' },
      });

      const { entityIdentifier } = getEntityFields(doc);

      expect(entityIdentifier).toBe('api-gateway');
    });

    it('falls back to entity.name when identity field value is absent', () => {
      const doc = makeDoc({
        entity: {
          name: 'some-entity',
          id: 'user:some-entity',
          EngineMetadata: { Type: 'user' },
          // no user.name in source
        },
      });

      const { entityIdentifier } = getEntityFields(doc);

      expect(entityIdentifier).toBe('some-entity');
    });
  });

  describe('entityName and entityId (unchanged)', () => {
    it('returns entity.name and entity.id from the entity object', () => {
      const doc = makeDoc({
        entity: {
          name: 'glo@glorias-macbook-pro.local',
          id: 'user:glo@host-id@local',
          EngineMetadata: { Type: 'user' },
        },
        user: { name: 'glo' },
      });

      const { entityName, entityId } = getEntityFields(doc);

      expect(entityName).toBe('glo@glorias-macbook-pro.local');
      expect(entityId).toBe('user:glo@host-id@local');
    });
  });
});
