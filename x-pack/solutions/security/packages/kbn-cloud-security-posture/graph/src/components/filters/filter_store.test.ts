/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import {
  FilterStore,
  getOrCreateFilterStore,
  getFilterStore,
  destroyFilterStore,
  emitFilterToggle,
  emitIsOneOfFilterToggle,
  emitEntityRelationshipToggle,
  emitPinnedEuidToggle,
  isFilterActiveForScope,
  isEntityRelationshipExpandedForScope,
  isPinnedForScope,
} from './filter_store';

// Simple phrase filter builder for tests
const buildPhraseFilter = (field: string, value: string): Filter =>
  ({
    meta: {
      key: field,
      negate: false,
      disabled: false,
      type: 'phrase',
      field,
      params: { query: value },
    },
    query: { match_phrase: { [field]: value } },
  } as Filter);

// Generates a unique scope ID per call to avoid cross-test pollution
let scopeCounter = 0;
const uniqueScopeId = () => `test-scope-${++scopeCounter}`;

describe('FilterStore', () => {
  describe('constructor and basic state', () => {
    it('should start with empty filters', () => {
      const store = new FilterStore(uniqueScopeId());
      expect(store.getFilters()).toEqual([]);
      store.destroy();
    });

    it('should start with empty expanded entity IDs', () => {
      const store = new FilterStore(uniqueScopeId());
      expect(store.getExpandedEntityIds().size).toBe(0);
      store.destroy();
    });

    it('should store the scopeId', () => {
      const id = uniqueScopeId();
      const store = new FilterStore(id);
      expect(store.scopeId).toBe(id);
      store.destroy();
    });
  });

  describe('setFilters / getFilters', () => {
    it('should set and get filters', () => {
      const store = new FilterStore(uniqueScopeId());
      const filters = [buildPhraseFilter('user.name', 'alice')];
      store.setFilters(filters);
      expect(store.getFilters()).toEqual(filters);
      store.destroy();
    });

    it('should replace previous filters', () => {
      const store = new FilterStore(uniqueScopeId());
      store.setFilters([buildPhraseFilter('user.name', 'alice')]);
      const newFilters = [buildPhraseFilter('host.name', 'server-1')];
      store.setFilters(newFilters);
      expect(store.getFilters()).toEqual(newFilters);
      store.destroy();
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers when filters change', () => {
      const store = new FilterStore(uniqueScopeId());
      const callback = jest.fn();
      const subscription = store.subscribe(callback);

      // BehaviorSubject emits current value on subscribe
      expect(callback).toHaveBeenCalledWith([]);

      const filters = [buildPhraseFilter('user.name', 'alice')];
      store.setFilters(filters);
      expect(callback).toHaveBeenCalledWith(filters);

      subscription.unsubscribe();
      store.destroy();
    });
  });

  describe('toggleFilter', () => {
    it('should add a filter with action "show"', () => {
      const store = new FilterStore(uniqueScopeId());
      store.setDataViewId('data-view-1');
      store.toggleFilter('user.name', 'alice', 'show');

      expect(store.getFilters()).toHaveLength(1);
      expect(store.isFilterActive('user.name', 'alice')).toBe(true);
      store.destroy();
    });

    it('should remove a filter with action "hide"', () => {
      const store = new FilterStore(uniqueScopeId());
      store.setDataViewId('data-view-1');
      store.toggleFilter('user.name', 'alice', 'show');
      expect(store.isFilterActive('user.name', 'alice')).toBe(true);

      store.toggleFilter('user.name', 'alice', 'hide');
      expect(store.isFilterActive('user.name', 'alice')).toBe(false);
      store.destroy();
    });

    describe('multiple values', () => {
      const values = ['alice', 'bob'];

      it('should add a phrases filter with action "show"', () => {
        const store = new FilterStore(uniqueScopeId());
        store.setDataViewId('data-view-1');
        store.toggleFilter('user.name', values, 'show');

        expect(store.getFilters()).toHaveLength(1);
        expect(store.isFilterActive('user.name', values)).toBe(true);
        store.destroy();
      });

      it('should remove a phrases filter with action "hide"', () => {
        const store = new FilterStore(uniqueScopeId());
        store.setDataViewId('data-view-1');
        store.toggleFilter('user.name', values, 'show');
        expect(store.isFilterActive('user.name', values)).toBe(true);

        store.toggleFilter('user.name', values, 'hide');
        expect(store.isFilterActive('user.name', values)).toBe(false);
        store.destroy();
      });

      it('should treat a single-element array the same as a plain string', () => {
        const store = new FilterStore(uniqueScopeId());
        store.setDataViewId('data-view-1');
        store.toggleFilter('user.name', ['alice'], 'show');

        expect(store.getFilters()).toHaveLength(1);
        expect(store.isFilterActive('user.name', 'alice')).toBe(true);
        expect(store.isFilterActive('user.name', ['alice'])).toBe(true);
        store.destroy();
      });
    });
  });

  describe('isFilterActive', () => {
    it('should return false when no filters exist', () => {
      const store = new FilterStore(uniqueScopeId());
      expect(store.isFilterActive('user.name', 'alice')).toBe(false);
      store.destroy();
    });

    it('should return true for an active filter', () => {
      const store = new FilterStore(uniqueScopeId());
      store.setFilters([buildPhraseFilter('user.name', 'alice')]);
      expect(store.isFilterActive('user.name', 'alice')).toBe(true);
      store.destroy();
    });

    it('should return false for a different value', () => {
      const store = new FilterStore(uniqueScopeId());
      store.setFilters([buildPhraseFilter('user.name', 'alice')]);
      expect(store.isFilterActive('user.name', 'bob')).toBe(false);
      store.destroy();
    });

    describe('multiple values', () => {
      const values = ['alice', 'bob'];

      it('should return true when a phrases filter covering all values is active', () => {
        const store = new FilterStore(uniqueScopeId());
        store.setDataViewId('data-view-1');
        store.toggleFilter('user.name', values, 'show');
        expect(store.isFilterActive('user.name', values)).toBe(true);
        store.destroy();
      });

      it('should return false when only a subset of the values is active', () => {
        const store = new FilterStore(uniqueScopeId());
        store.setDataViewId('data-view-1');
        store.toggleFilter('user.name', ['alice'], 'show');
        expect(store.isFilterActive('user.name', values)).toBe(false);
        store.destroy();
      });

      it('should return false when no filters exist', () => {
        const store = new FilterStore(uniqueScopeId());
        expect(store.isFilterActive('user.name', values)).toBe(false);
        store.destroy();
      });
    });
  });

  describe('toggleEntityRelationship', () => {
    it('should expand an entity with action "show"', () => {
      const store = new FilterStore(uniqueScopeId());
      store.toggleEntityRelationship('entity-1', 'show');
      expect(store.isEntityRelationshipExpanded('entity-1')).toBe(true);
      store.destroy();
    });

    it('should collapse an entity with action "hide"', () => {
      const store = new FilterStore(uniqueScopeId());
      store.toggleEntityRelationship('entity-1', 'show');
      store.toggleEntityRelationship('entity-1', 'hide');
      expect(store.isEntityRelationshipExpanded('entity-1')).toBe(false);
      store.destroy();
    });

    it('should handle multiple entities independently', () => {
      const store = new FilterStore(uniqueScopeId());
      store.toggleEntityRelationship('entity-1', 'show');
      store.toggleEntityRelationship('entity-2', 'show');

      expect(store.isEntityRelationshipExpanded('entity-1')).toBe(true);
      expect(store.isEntityRelationshipExpanded('entity-2')).toBe(true);

      store.toggleEntityRelationship('entity-1', 'hide');
      expect(store.isEntityRelationshipExpanded('entity-1')).toBe(false);
      expect(store.isEntityRelationshipExpanded('entity-2')).toBe(true);
      store.destroy();
    });
  });

  describe('subscribeToExpandedEntityIds', () => {
    it('should notify subscribers when expanded entity IDs change', () => {
      const store = new FilterStore(uniqueScopeId());
      const callback = jest.fn();
      const subscription = store.subscribeToExpandedEntityIds(callback);

      // BehaviorSubject emits current value on subscribe
      expect(callback).toHaveBeenCalledWith(new Set());

      store.toggleEntityRelationship('entity-1', 'show');
      expect(callback).toHaveBeenCalledWith(new Set(['entity-1']));

      subscription.unsubscribe();
      store.destroy();
    });
  });

  describe('togglePinnedEuid', () => {
    it('should pin an entity with action "show"', () => {
      const store = new FilterStore(uniqueScopeId());
      store.togglePinnedEuid('user:alice@okta', 'show');
      expect(store.isPinned('user:alice@okta')).toBe(true);
      store.destroy();
    });

    it('should unpin an entity with action "hide"', () => {
      const store = new FilterStore(uniqueScopeId());
      store.togglePinnedEuid('user:alice@okta', 'show');
      store.togglePinnedEuid('user:alice@okta', 'hide');
      expect(store.isPinned('user:alice@okta')).toBe(false);
      store.destroy();
    });

    it('should handle multiple pinned entities independently', () => {
      const store = new FilterStore(uniqueScopeId());
      store.togglePinnedEuid('user:alice@okta', 'show');
      store.togglePinnedEuid('host:server-1', 'show');

      expect(store.isPinned('user:alice@okta')).toBe(true);
      expect(store.isPinned('host:server-1')).toBe(true);

      store.togglePinnedEuid('user:alice@okta', 'hide');
      expect(store.isPinned('user:alice@okta')).toBe(false);
      expect(store.isPinned('host:server-1')).toBe(true);
      store.destroy();
    });
  });

  describe('subscribeToPinnedEuids', () => {
    it('should notify subscribers when pinned EUIDs change', () => {
      const store = new FilterStore(uniqueScopeId());
      const callback = jest.fn();
      const subscription = store.subscribeToPinnedEuids(callback);

      // BehaviorSubject emits current value on subscribe
      expect(callback).toHaveBeenCalledWith(new Set());

      store.togglePinnedEuid('user:alice@okta', 'show');
      expect(callback).toHaveBeenCalledWith(new Set(['user:alice@okta']));

      subscription.unsubscribe();
      store.destroy();
    });
  });

  describe('reset', () => {
    it('should clear filters, expanded entity IDs, and pinned EUIDs', () => {
      const store = new FilterStore(uniqueScopeId());
      store.setDataViewId('data-view-1');
      store.toggleFilter('user.name', 'alice', 'show');
      store.toggleEntityRelationship('entity-1', 'show');
      store.togglePinnedEuid('user:alice@okta', 'show');

      store.reset();

      expect(store.getFilters()).toEqual([]);
      expect(store.getExpandedEntityIds().size).toBe(0);
      expect(store.getPinnedEuids().size).toBe(0);
      store.destroy();
    });
  });

  describe('setDataViewId', () => {
    it('should not set dataViewId when empty string is provided', () => {
      const store = new FilterStore(uniqueScopeId());
      store.setDataViewId('');
      // Adding a filter without a valid dataViewId still works, just uses empty string
      store.toggleFilter('user.name', 'alice', 'show');
      expect(store.getFilters()).toHaveLength(1);
      store.destroy();
    });
  });
});

describe('event bus', () => {
  describe('emitFilterToggle', () => {
    it('should deliver filter events to the matching store', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);
      store.setDataViewId('dv-1');

      emitFilterToggle(id, 'user.name', 'alice', 'show');

      expect(store.isFilterActive('user.name', 'alice')).toBe(true);
      destroyFilterStore(id);
    });

    it('should not deliver filter events to a different scope', () => {
      const idA = uniqueScopeId();
      const idB = uniqueScopeId();
      const storeA = getOrCreateFilterStore(idA);
      const storeB = getOrCreateFilterStore(idB);
      storeA.setDataViewId('dv-1');
      storeB.setDataViewId('dv-1');

      emitFilterToggle(idA, 'user.name', 'alice', 'show');

      expect(storeA.isFilterActive('user.name', 'alice')).toBe(true);
      expect(storeB.isFilterActive('user.name', 'alice')).toBe(false);
      destroyFilterStore(idA);
      destroyFilterStore(idB);
    });

    it('should not throw when no store exists for the scopeId', () => {
      expect(() => {
        emitFilterToggle('non-existent', 'user.name', 'alice', 'show');
      }).not.toThrow();
    });
  });

  describe('emitIsOneOfFilterToggle', () => {
    const values = ['alice', 'bob'];

    it('should add a phrases filter via event bus', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);
      store.setDataViewId('dv-1');

      emitIsOneOfFilterToggle(id, 'user.name', values, 'show');

      expect(store.isFilterActive('user.name', values)).toBe(true);
      destroyFilterStore(id);
    });

    it('should remove a phrases filter via event bus', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);
      store.setDataViewId('dv-1');

      emitIsOneOfFilterToggle(id, 'user.name', values, 'show');
      expect(store.isFilterActive('user.name', values)).toBe(true);

      emitIsOneOfFilterToggle(id, 'user.name', values, 'hide');
      expect(store.isFilterActive('user.name', values)).toBe(false);
      destroyFilterStore(id);
    });

    it('should not deliver events to a different scope', () => {
      const idA = uniqueScopeId();
      const idB = uniqueScopeId();
      const storeA = getOrCreateFilterStore(idA);
      const storeB = getOrCreateFilterStore(idB);
      storeA.setDataViewId('dv-1');
      storeB.setDataViewId('dv-1');

      emitIsOneOfFilterToggle(idA, 'user.name', values, 'show');

      expect(storeA.isFilterActive('user.name', values)).toBe(true);
      expect(storeB.isFilterActive('user.name', values)).toBe(false);
      destroyFilterStore(idA);
      destroyFilterStore(idB);
    });

    it('should not throw when no store exists for the scopeId', () => {
      expect(() => {
        emitIsOneOfFilterToggle('non-existent', 'user.name', values, 'show');
      }).not.toThrow();
    });
  });

  describe('emitEntityRelationshipToggle', () => {
    it('should deliver entity relationship events to the matching store', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);

      emitEntityRelationshipToggle(id, 'entity-1', 'show');

      expect(store.isEntityRelationshipExpanded('entity-1')).toBe(true);
      destroyFilterStore(id);
    });

    it('should not deliver entity relationship events to a different scope', () => {
      const idA = uniqueScopeId();
      const idB = uniqueScopeId();
      getOrCreateFilterStore(idA);
      getOrCreateFilterStore(idB);

      emitEntityRelationshipToggle(idA, 'entity-1', 'show');

      expect(isEntityRelationshipExpandedForScope(idA, 'entity-1')).toBe(true);
      expect(isEntityRelationshipExpandedForScope(idB, 'entity-1')).toBe(false);
      destroyFilterStore(idA);
      destroyFilterStore(idB);
    });
  });

  describe('emitPinnedEuidToggle', () => {
    it('should deliver pinned EUID events to the matching store', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);

      emitPinnedEuidToggle(id, 'user:alice@okta', 'show');

      expect(store.isPinned('user:alice@okta')).toBe(true);
      destroyFilterStore(id);
    });

    it('should not deliver pinned EUID events to a different scope', () => {
      const idA = uniqueScopeId();
      const idB = uniqueScopeId();
      getOrCreateFilterStore(idA);
      getOrCreateFilterStore(idB);

      emitPinnedEuidToggle(idA, 'user:alice@okta', 'show');

      expect(isPinnedForScope(idA, 'user:alice@okta')).toBe(true);
      expect(isPinnedForScope(idB, 'user:alice@okta')).toBe(false);
      destroyFilterStore(idA);
      destroyFilterStore(idB);
    });

    it('should not throw when no store exists for the scopeId', () => {
      expect(() => {
        emitPinnedEuidToggle('non-existent', 'user:alice@okta', 'show');
      }).not.toThrow();
    });
  });
});

describe('registry functions', () => {
  describe('getOrCreateFilterStore', () => {
    it('should create a new store for a new scopeId', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);
      expect(store).toBeInstanceOf(FilterStore);
      expect(store.scopeId).toBe(id);
      destroyFilterStore(id);
    });

    it('should return the same store for the same scopeId', () => {
      const id = uniqueScopeId();
      const store1 = getOrCreateFilterStore(id);
      const store2 = getOrCreateFilterStore(id);
      expect(store1).toBe(store2);
      destroyFilterStore(id);
    });
  });

  describe('getFilterStore', () => {
    it('should return the store when it exists', () => {
      const id = uniqueScopeId();
      const created = getOrCreateFilterStore(id);
      const retrieved = getFilterStore(id);
      expect(retrieved).toBe(created);
      destroyFilterStore(id);
    });

    it('should return undefined and warn when store does not exist', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = getFilterStore('non-existent');
      expect(result).toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('destroyFilterStore', () => {
    it('should destroy and remove the store', () => {
      const id = uniqueScopeId();
      getOrCreateFilterStore(id);
      destroyFilterStore(id);

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(getFilterStore(id)).toBeUndefined();
      warnSpy.mockRestore();
    });

    it('should be a no-op for non-existent scopeId', () => {
      expect(() => destroyFilterStore('non-existent')).not.toThrow();
    });
  });
});

describe('scope helper functions', () => {
  describe('isFilterActiveForScope', () => {
    it('should return true when filter is active', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);
      store.setDataViewId('dv-1');
      store.toggleFilter('user.name', 'alice', 'show');

      expect(isFilterActiveForScope(id, 'user.name', 'alice')).toBe(true);
      destroyFilterStore(id);
    });

    it('should return false when filter is not active', () => {
      const id = uniqueScopeId();
      getOrCreateFilterStore(id);
      expect(isFilterActiveForScope(id, 'user.name', 'alice')).toBe(false);
      destroyFilterStore(id);
    });

    it('should return false when store does not exist', () => {
      expect(isFilterActiveForScope('non-existent', 'user.name', 'alice')).toBe(false);
    });

    describe('multiple values', () => {
      const values = ['alice', 'bob'];

      it('should return true when a phrases filter covering all values is active', () => {
        const id = uniqueScopeId();
        const store = getOrCreateFilterStore(id);
        store.setDataViewId('dv-1');
        store.toggleFilter('user.name', values, 'show');

        expect(isFilterActiveForScope(id, 'user.name', values)).toBe(true);
        destroyFilterStore(id);
      });

      it('should return false when only a subset of the values is active', () => {
        const id = uniqueScopeId();
        const store = getOrCreateFilterStore(id);
        store.setDataViewId('dv-1');
        store.toggleFilter('user.name', ['alice'], 'show');

        expect(isFilterActiveForScope(id, 'user.name', values)).toBe(false);
        destroyFilterStore(id);
      });

      it('should return false when store does not exist', () => {
        expect(isFilterActiveForScope('non-existent', 'user.name', values)).toBe(false);
      });
    });
  });

  describe('isEntityRelationshipExpandedForScope', () => {
    it('should return true when entity is expanded', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);
      store.toggleEntityRelationship('entity-1', 'show');

      expect(isEntityRelationshipExpandedForScope(id, 'entity-1')).toBe(true);
      destroyFilterStore(id);
    });

    it('should return false when entity is not expanded', () => {
      const id = uniqueScopeId();
      getOrCreateFilterStore(id);
      expect(isEntityRelationshipExpandedForScope(id, 'entity-1')).toBe(false);
      destroyFilterStore(id);
    });

    it('should return false when store does not exist', () => {
      expect(isEntityRelationshipExpandedForScope('non-existent', 'entity-1')).toBe(false);
    });
  });

  describe('isPinnedForScope', () => {
    it('should return true when entity is pinned', () => {
      const id = uniqueScopeId();
      const store = getOrCreateFilterStore(id);
      store.togglePinnedEuid('user:alice@okta', 'show');

      expect(isPinnedForScope(id, 'user:alice@okta')).toBe(true);
      destroyFilterStore(id);
    });

    it('should return false when entity is not pinned', () => {
      const id = uniqueScopeId();
      getOrCreateFilterStore(id);
      expect(isPinnedForScope(id, 'user:alice@okta')).toBe(false);
      destroyFilterStore(id);
    });

    it('should return false when store does not exist', () => {
      expect(isPinnedForScope('non-existent', 'user:alice@okta')).toBe(false);
    });
  });
});
