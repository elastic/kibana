/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityMaintainersRegistry } from './entity_maintainers_registry';

describe('EntityMaintainersRegistry', () => {
  let registry: EntityMaintainersRegistry;

  beforeEach(() => {
    registry = new EntityMaintainersRegistry();
  });

  describe('getAll', () => {
    it('should return empty array when no entries have been added', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('register', () => {
    it('should add an entry and getAll returns it', () => {
      registry.register({ id: 'maintainer-a', interval: '5m', minLicense: 'basic' });
      expect(registry.getAll()).toEqual([
        {
          id: 'maintainer-a',
          interval: '5m',
          minLicense: 'basic',
        },
      ]);
      expect(registry.getAll()[0].description).toBeUndefined();
    });

    it('should add multiple entries and getAll returns all in map order', () => {
      registry.register({ id: 'maintainer-a', interval: '1m', minLicense: 'basic' });
      registry.register({ id: 'maintainer-b', interval: '5m', minLicense: 'basic' });
      expect(registry.getAll()).toEqual([
        {
          id: 'maintainer-a',
          interval: '1m',
          minLicense: 'basic',
        },
        {
          id: 'maintainer-b',
          interval: '5m',
          minLicense: 'basic',
        },
      ]);
      expect(registry.getAll()[0].description).toBeUndefined();
      expect(registry.getAll()[1].description).toBeUndefined();
    });

    it('should overwrite entry when register is called with same id', () => {
      registry.register({ id: 'maintainer-a', interval: '1m', minLicense: 'basic' });
      registry.register({ id: 'maintainer-a', interval: '10m', minLicense: 'gold' });
      expect(registry.getAll()).toEqual([
        {
          id: 'maintainer-a',
          interval: '10m',
          minLicense: 'gold',
        },
      ]);
    });

    it('should store description when provided', () => {
      registry.register({
        id: 'maintainer-a',
        interval: '5m',
        description: 'Maintains entity index',
        minLicense: 'platinum',
      });
      expect(registry.get('maintainer-a')).toEqual({
        id: 'maintainer-a',
        interval: '5m',
        description: 'Maintains entity index',
        minLicense: 'platinum',
      });
    });
  });

  describe('get', () => {
    it('should return undefined when id was not registered', () => {
      expect(registry.get('maintainer-a')).toBeUndefined();
    });

    it('should return the entry when id was registered', () => {
      registry.register({ id: 'maintainer-a', interval: '5m', minLicense: 'basic' });
      expect(registry.get('maintainer-a')).toEqual({
        id: 'maintainer-a',
        interval: '5m',
        minLicense: 'basic',
      });
      expect(registry.get('maintainer-a')!.description).toBeUndefined();
    });
  });

  describe('hasId', () => {
    it('should return false when id was not registered', () => {
      expect(registry.hasId('maintainer-a')).toBe(false);
    });

    it('should return true when id was registered', () => {
      registry.register({ id: 'maintainer-a', interval: '5m', minLicense: 'basic' });
      expect(registry.hasId('maintainer-a')).toBe(true);
    });

    it('should return false for different id', () => {
      registry.register({ id: 'maintainer-a', interval: '5m', minLicense: 'basic' });
      expect(registry.hasId('maintainer-b')).toBe(false);
    });
  });
});
