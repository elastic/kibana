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

  describe('update', () => {
    it('should add an entry and getAll returns it', () => {
      registry.update({ id: 'maintainer-a', interval: '5m' });
      expect(registry.getAll()).toEqual([{ id: 'maintainer-a', interval: '5m' }]);
    });

    it('should add multiple entries and getAll returns all in map order', () => {
      registry.update({ id: 'maintainer-a', interval: '1m' });
      registry.update({ id: 'maintainer-b', interval: '5m' });
      expect(registry.getAll()).toEqual([
        { id: 'maintainer-a', interval: '1m' },
        { id: 'maintainer-b', interval: '5m' },
      ]);
    });

    it('should overwrite entry when update is called with same id', () => {
      registry.update({ id: 'maintainer-a', interval: '1m' });
      registry.update({ id: 'maintainer-a', interval: '10m' });
      expect(registry.getAll()).toEqual([{ id: 'maintainer-a', interval: '10m' }]);
    });
  });
});
