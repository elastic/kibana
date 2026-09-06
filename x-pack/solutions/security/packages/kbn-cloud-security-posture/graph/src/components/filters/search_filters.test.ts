/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import {
  type Filter,
  BooleanRelation,
  type CombinedFilter,
  FILTERS,
  isCombinedFilter,
} from '@kbn/es-query';
import type {
  CombinedFilterMeta,
  PhraseFilter,
  PhraseFilterMetaParams,
  PhrasesFilter,
} from '@kbn/es-query/src/filters/build_filters';
import { omit } from 'lodash';
import {
  CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
  addFilter,
  containsFilter,
  removeFilter,
  buildNamespaceSourceFilters,
  buildEntityDslFilter,
  addEntityFilter,
  containsEntityFilter,
  removeEntityFilter,
} from './search_filters';

const dataViewId = 'test-data-view';

const buildFilterMock = (key: string, value: string, controlledBy?: string) => ({
  meta: {
    key,
    index: dataViewId,
    negate: false,
    disabled: false,
    type: 'phrase',
    field: key,
    controlledBy,
    params: {
      query: value,
    },
  },
  query: {
    match_phrase: {
      [key]: value,
    },
  },
});

const buildPhrasesFilterMock = (
  key: string,
  values: string[],
  controlledBy?: string
): PhrasesFilter => ({
  meta: {
    key,
    index: dataViewId,
    negate: false,
    disabled: false,
    type: 'phrases',
    field: key,
    controlledBy,
    params: values,
  },
  query: {
    bool: {
      should: values.map((v) => ({ match_phrase: { [key]: v } })),
      minimum_should_match: 1,
    },
  },
});

const buildCombinedFilterMock = (filters: Filter[], controlledBy?: string): CombinedFilter => ({
  meta: {
    relation: BooleanRelation.OR,
    controlledBy,
    params: filters,
    type: FILTERS.COMBINED,
  },
  query: {},
});

describe('search_filters', () => {
  const key = 'test-key';
  const value = 'test-value';

  const controlledPhraseFilter: PhraseFilter = buildFilterMock(
    key,
    value,
    CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
  );

  describe('containsFilter', () => {
    it('should return true if the filter is present in the controlled phrase filter', () => {
      const filters: Filter[] = [controlledPhraseFilter];

      expect(containsFilter(filters, key, value)).toBe(true);
    });

    it('should return true if the filter is present in a phrase filter (not controlled)', () => {
      const filters: Filter[] = [
        buildFilterMock(key, 'another-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
        buildFilterMock(key, value),
      ];

      expect(containsFilter(filters, key, value)).toBe(true);
    });

    it('should return true if the filter is present in the controlled combined filter', () => {
      const filters: Filter[] = [
        buildCombinedFilterMock(
          [
            buildFilterMock(key, 'another-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            controlledPhraseFilter,
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        ),
      ];

      expect(containsFilter(filters, key, value)).toBe(true);
    });

    it('should return true if the filter is present in a combined filter (not controlled)', () => {
      const filters: Filter[] = [
        buildCombinedFilterMock([
          buildFilterMock(key, 'another-value'),
          buildFilterMock(key, value),
        ]),
      ];

      expect(containsFilter(filters, key, value)).toBe(true);
    });

    it('should return false if the filter is not present in empty filters', () => {
      const filters: Filter[] = [];
      expect(containsFilter(filters, key, value)).toBe(false);
    });

    it('should return false if the filter is not present with controlled filter with same key and different value', () => {
      const filters: Filter[] = [
        buildFilterMock(key, 'different-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
      ];
      expect(containsFilter(filters, key, value)).toBe(false);
    });

    it('should return false when the combined filter with same key and different value', () => {
      const filters: Filter[] = [
        buildCombinedFilterMock(
          [
            buildFilterMock(key, 'different-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            buildFilterMock(key, 'different-value2', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        ),
      ];

      expect(containsFilter(filters, key, value)).toBe(false);
    });

    describe('multiple values', () => {
      const values = ['value-a', 'value-b'];

      it('should return true when a PhrasesFilter contains all requested values', () => {
        const filters: Filter[] = [
          buildPhrasesFilterMock(key, values, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
        ];

        expect(containsFilter(filters, key, values)).toBe(true);
      });

      it('should return true when a PhrasesFilter is a superset of the requested values', () => {
        const filters: Filter[] = [
          buildPhrasesFilterMock(
            key,
            [...values, 'value-c'],
            CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
          ),
        ];

        expect(containsFilter(filters, key, values)).toBe(true);
      });

      it('should return true when a CombinedFilter covers all requested values', () => {
        const filters: Filter[] = [
          buildCombinedFilterMock(
            values.map((v) => buildFilterMock(key, v, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER)),
            CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
          ),
        ];

        expect(containsFilter(filters, key, values)).toBe(true);
      });

      it('should return false when a PhrasesFilter is missing one of the requested values', () => {
        const filters: Filter[] = [
          buildPhrasesFilterMock(
            key,
            ['value-a', 'value-c'],
            CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
          ),
        ];

        expect(containsFilter(filters, key, values)).toBe(false);
      });

      it('should return false when a CombinedFilter is missing one of the requested values', () => {
        const filters: Filter[] = [
          buildCombinedFilterMock(
            [
              buildFilterMock(key, 'value-a', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
              buildFilterMock(key, 'value-c', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            ],
            CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
          ),
        ];

        expect(containsFilter(filters, key, values)).toBe(false);
      });

      it('should return false when the PhrasesFilter is for a different key', () => {
        const filters: Filter[] = [
          buildPhrasesFilterMock('other-key', values, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
        ];

        expect(containsFilter(filters, key, values)).toBe(false);
      });

      it('should ignore disabled PhrasesFilters', () => {
        const disabledFilter: Filter = {
          ...buildPhrasesFilterMock(key, values, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          meta: {
            ...buildPhrasesFilterMock(key, values, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER).meta,
            disabled: true,
          },
        };

        expect(containsFilter([disabledFilter], key, values)).toBe(false);
      });

      it('should treat a single-element array the same as a plain string', () => {
        const filters: Filter[] = [controlledPhraseFilter];

        expect(containsFilter(filters, key, [value])).toBe(true);
      });
    });
  });

  describe('addFilter', () => {
    describe('single value', () => {
      it('should add a new filter to an empty list', () => {
        const filters: Filter[] = [];

        // Act
        const newFilters = addFilter(dataViewId, filters, key, value);

        // Assert
        expect(newFilters).toHaveLength(1);
        expect(newFilters[0]).toEqual({
          $state: { store: 'appState' },
          meta: expect.objectContaining({
            key,
            params: { query: value },
            controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
            index: dataViewId,
            disabled: false,
            field: key,
            negate: false,
            type: 'phrase',
          }),
          query: {
            match_phrase: {
              [key]: value,
            },
          },
        });
      });

      it('should add a new filter to an existing list with uncontrolled filter', () => {
        const filters: Filter[] = [buildFilterMock(key, 'another-value')];

        // Act
        const newFilters = addFilter(dataViewId, filters, key, value);

        // Assert
        expect(newFilters).toHaveLength(1);
        expect(newFilters[0]).toEqual({
          $state: { store: 'appState' },
          meta: expect.objectContaining({
            params: [
              { ...filters[0], meta: { ...omit(filters[0].meta, 'disabled') } },
              {
                meta: expect.objectContaining({
                  key,
                  field: key,
                  params: { query: value },
                  index: dataViewId,
                  controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
                  type: 'phrase',
                }),
                query: {
                  match_phrase: {
                    [key]: value,
                  },
                },
              },
            ],
            index: dataViewId,
            controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
            relation: 'OR',
            type: 'combined',
          }),
        });
      });

      it('should combine with an existing filter', () => {
        const filters: Filter[] = [controlledPhraseFilter];

        // Act
        const newFilters = addFilter(dataViewId, filters, key, 'new-value');

        // Assert
        expect(newFilters).toHaveLength(1);
        expect(newFilters[0].meta.params).toHaveLength(2);
      });

      it('should add a new filter when the existing controlled (first) filter is disabled', () => {
        const filters: Filter[] = [
          { ...controlledPhraseFilter, meta: { ...controlledPhraseFilter.meta, disabled: true } },
        ];

        // Act
        const newFilters = addFilter(dataViewId, filters, key, value);

        // Assert
        expect(newFilters).toHaveLength(2);
        expect(newFilters[0].meta.disabled).toBe(false);
        expect(newFilters[1].meta.disabled).toBe(true);
      });
    });

    describe('multiple values', () => {
      const values = ['value-a', 'value-b'];

      it('should add a PhrasesFilter to an empty list', () => {
        const newFilters = addFilter(dataViewId, [], key, values);

        expect(newFilters).toHaveLength(1);
        expect(newFilters[0]).toEqual({
          $state: { store: 'appState' },
          meta: expect.objectContaining({
            key,
            type: 'phrases',
            field: key,
            params: values,
            index: dataViewId,
            disabled: false,
            negate: false,
            controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
          }),
          query: {
            bool: {
              should: values.map((v) => ({ match_phrase: { [key]: v } })),
              minimum_should_match: 1,
            },
          },
        });
      });

      it('should wrap an existing phrase filter into a CombinedFilter with the new PhrasesFilter', () => {
        const filters: Filter[] = [controlledPhraseFilter];

        const newFilters = addFilter(dataViewId, filters, key, values);

        expect(newFilters).toHaveLength(1);
        expect(newFilters[0].meta.type).toBe('combined');
        expect((newFilters[0].meta as CombinedFilterMeta).relation).toBe(BooleanRelation.OR);
        expect(newFilters[0].meta.controlledBy).toBe(CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER);

        const params = newFilters[0].meta.params as Filter[];
        expect(params).toHaveLength(2);
        expect(params[0]).toMatchObject({ meta: { type: 'phrase', params: { query: value } } });
        expect(params[1]).toMatchObject({
          meta: { type: 'phrases', params: values },
          query: {
            bool: {
              should: values.map((v) => ({ match_phrase: { [key]: v } })),
              minimum_should_match: 1,
            },
          },
        });
      });

      it('should append a PhrasesFilter into an existing CombinedFilter', () => {
        const existingCombined = buildCombinedFilterMock(
          [
            buildFilterMock(key, 'existing-a', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            buildFilterMock(key, 'existing-b', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        );

        const newFilters = addFilter(dataViewId, [existingCombined], key, values);

        expect(newFilters).toHaveLength(1);
        expect(newFilters[0].meta.type).toBe('combined');

        const params = newFilters[0].meta.params as Filter[];
        expect(params).toHaveLength(3);
        expect(params[2]).toMatchObject({ meta: { type: 'phrases', params: values } });
      });

      it('should add a PhrasesFilter when the first filter is disabled', () => {
        const disabledFilter = {
          ...controlledPhraseFilter,
          meta: { ...controlledPhraseFilter.meta, disabled: true },
        };

        const newFilters = addFilter(dataViewId, [disabledFilter], key, values);

        expect(newFilters).toHaveLength(2);
        expect(newFilters[0].meta.type).toBe('phrases');
        expect(newFilters[0].meta.disabled).toBe(false);
        expect(newFilters[1].meta.disabled).toBe(true);
      });

      it('should treat a single-element array the same as a plain string (produces PhraseFilter)', () => {
        const newFilters = addFilter(dataViewId, [], key, [value]);

        expect(newFilters).toHaveLength(1);
        expect(newFilters[0].meta.type).toBe('phrase');
        expect(newFilters[0].meta.params).toEqual({ query: value });
      });
    });
  });

  describe('removeFilter', () => {
    describe('single value', () => {
      it('should return the same filters when filter not found', () => {
        const filters: Filter[] = [controlledPhraseFilter];

        const newFilters = removeFilter(filters, key, 'non-existent-value');

        expect(newFilters).toHaveLength(1);
        expect(newFilters).toEqual(filters);
      });

      it('should remove a single phrase filter when present', () => {
        const filters: Filter[] = [controlledPhraseFilter];

        const newFilters = removeFilter(filters, key, value);

        expect(newFilters).toHaveLength(0);
      });

      it('should not remove any filters if the filter is not present', () => {
        const filters: Filter[] = [controlledPhraseFilter];

        const newFilters = removeFilter(filters, key, 'non-existent-value');

        expect(newFilters).toHaveLength(1);
      });

      it('should remove the correct filter from a CombinedFilter and return a plain PhraseFilter when only one remains', () => {
        const combinedFilter: CombinedFilter = buildCombinedFilterMock(
          [
            controlledPhraseFilter,
            buildFilterMock(key, 'another-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        );

        const newFilters = removeFilter([combinedFilter], key, value);

        expect(newFilters).toHaveLength(1);
        expect(isCombinedFilter(newFilters[0])).toBe(false);
        expect(newFilters[0].meta.key).toBe(key);
        expect((newFilters[0].meta.params as PhraseFilterMetaParams).query).toBe('another-value');
      });

      it('should remove the correct filter from a CombinedFilter that contains more than 2 filters', () => {
        const filters: Filter[] = [
          buildCombinedFilterMock(
            [
              buildFilterMock(key, 'another-value', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
              buildFilterMock(key, 'another-value1', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            ],
            CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
          ),
          buildCombinedFilterMock([
            buildFilterMock(key, value),
            buildFilterMock(key, 'another-value'),
            buildFilterMock(key, 'another-value2'),
          ]),
        ];

        const newFilters = removeFilter(filters, key, value);

        expect(newFilters).toHaveLength(2);
        expect(isCombinedFilter(newFilters[1])).toBe(true);
        expect(newFilters[1].meta.params).toHaveLength(2);
      });

      it('should treat a single-element array the same as a plain string', () => {
        const newFilters = removeFilter([controlledPhraseFilter], key, [value]);

        expect(newFilters).toHaveLength(0);
      });

      it('should preserve dataViewId (index) when removing the first of 3 sequentially added filters', () => {
        // Add 3 filters in sequence using addFilter, simulating real usage
        const value1 = 'value-1';
        const value2 = 'value-2';
        const value3 = 'value-3';

        const after1 = addFilter(dataViewId, [], key, value1);
        const after2 = addFilter(dataViewId, after1, key, value2);
        const after3 = addFilter(dataViewId, after2, key, value3);

        // after3[0] is a CombinedFilter with 3 nested phrase filters
        expect(after3).toHaveLength(1);
        expect(isCombinedFilter(after3[0])).toBe(true);
        expect(after3[0].meta.params).toHaveLength(3);

        // Remove the first filter — the CombinedFilter unwraps to the remaining 2
        const afterRemove = removeFilter(after3, key, value1);

        // Should still be a CombinedFilter with 2 entries, both preserving the dataViewId index
        expect(afterRemove).toHaveLength(1);
        expect(isCombinedFilter(afterRemove[0])).toBe(true);

        const params = afterRemove[0].meta.params as Filter[];
        expect(params).toHaveLength(2);
        params.forEach((param) => {
          expect(param.meta.index).toBe(dataViewId);
        });
      });
    });

    describe('multiple values', () => {
      const values = ['value-a', 'value-b'];

      it('should remove a standalone PhrasesFilter that matches all values', () => {
        const filters: Filter[] = [
          buildPhrasesFilterMock(key, values, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
        ];

        const newFilters = removeFilter(filters, key, values);

        expect(newFilters).toHaveLength(0);
      });

      it('should not remove a PhrasesFilter when only a subset of values matches', () => {
        const filters: Filter[] = [
          buildPhrasesFilterMock(
            key,
            ['value-a', 'value-c'],
            CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
          ),
        ];

        const newFilters = removeFilter(filters, key, values);

        expect(newFilters).toHaveLength(1);
        expect(newFilters).toEqual(filters);
      });

      it('should not remove anything when no filter matches all values', () => {
        const filters: Filter[] = [
          buildFilterMock(key, 'value-a', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          buildFilterMock(key, 'value-b', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
        ];

        const newFilters = removeFilter(filters, key, values);

        expect(newFilters).toHaveLength(2);
        expect(newFilters).toEqual(filters);
      });

      it('should remove a PhrasesFilter from inside a CombinedFilter, unwrapping when only one entry remains', () => {
        const remainingFilter = buildFilterMock(
          key,
          'other-value',
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        );
        const combinedFilter = buildCombinedFilterMock(
          [
            buildPhrasesFilterMock(key, values, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            remainingFilter,
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        );

        const newFilters = removeFilter([combinedFilter], key, values);

        expect(newFilters).toHaveLength(1);
        expect(isCombinedFilter(newFilters[0])).toBe(false);
        expect(newFilters[0]).toMatchObject({
          meta: { type: 'phrase', params: { query: 'other-value' } },
        });
      });

      it('should remove a PhrasesFilter from inside a CombinedFilter while keeping the rest combined', () => {
        const combinedFilter = buildCombinedFilterMock(
          [
            buildPhrasesFilterMock(key, values, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            buildFilterMock(key, 'other-a', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
            buildFilterMock(key, 'other-b', CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          ],
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        );

        const newFilters = removeFilter([combinedFilter], key, values);

        expect(newFilters).toHaveLength(1);
        expect(isCombinedFilter(newFilters[0])).toBe(true);
        expect(newFilters[0].meta.params).toHaveLength(2);
      });

      it('should remove an entire CombinedFilter when all its entries satisfy the requested values', () => {
        const combinedFilter = buildCombinedFilterMock(
          values.map((v) => buildFilterMock(key, v, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER)),
          CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER
        );

        const newFilters = removeFilter([combinedFilter], key, values);

        expect(newFilters).toHaveLength(0);
      });

      it('should leave other filters untouched when removing a PhrasesFilter', () => {
        const otherFilter = buildFilterMock('other-key', 'other-value');
        const filters: Filter[] = [
          buildPhrasesFilterMock(key, values, CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER),
          otherFilter,
        ];

        const newFilters = removeFilter(filters, key, values);

        expect(newFilters).toHaveLength(1);
        expect(newFilters[0]).toEqual(otherFilter);
      });
    });
  });

  describe('buildNamespaceSourceFilters', () => {
    it('emits a single phrase filter for a single observed value', () => {
      const filters = buildNamespaceSourceFilters('data_stream.dataset', 'gcp.audit', 'logs-*');
      expect(filters).toHaveLength(1);
      expect(filters[0].meta.type).toBe('phrase');
      expect(filters[0].query).toEqual({ match_phrase: { 'data_stream.dataset': 'gcp.audit' } });
    });

    it('emits a phrases filter for multiple observed values', () => {
      const filters = buildNamespaceSourceFilters(
        'data_stream.dataset',
        ['gcp.audit', 'gcp.firewall'],
        'logs-*'
      );
      expect(filters).toHaveLength(1);
      expect(filters[0].meta.type).toBe('phrases');
    });

    it('returns empty array when all values are empty strings', () => {
      expect(buildNamespaceSourceFilters('data_stream.dataset', '')).toHaveLength(0);
      expect(buildNamespaceSourceFilters('data_stream.dataset', ['', ''])).toHaveLength(0);
    });
  });

  describe('buildEntityDslFilter with namespace source values', () => {
    // The shape the Entity Store's `getEuidDslFilterBasedOnDocument` really returns for a GCP
    // user resolved at ranking position 1 (user.id, no user.email). The `prefix` clause is part
    // of that contract — `data_stream.dataset` is a `firstChunkOfField` source, so the builder
    // reverses the namespace by prefix. Translating it away is this module's job, not the
    // Entity Store's, so the fixture keeps it.
    const GCP_DSL = {
      bool: {
        filter: [
          { term: { 'user.id': 'alice@example.com' } },
          {
            bool: {
              should: [
                { term: { 'event.module': 'gcp' } },
                { prefix: { 'data_stream.dataset': 'gcp' } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        must: [{ bool: { must_not: [{ exists: { field: 'user.email' } }] } }],
      },
    };

    const entityId = 'user:alice@example.com@gcp';

    /** Sub-filters of the top-level AND, which is what the filter bar renders as chips. */
    const andParams = (filter: Filter | undefined): Filter[] => filter?.meta.params as Filter[];

    it('wraps the whole expression in an AND owned by the entity id', () => {
      const filter = buildEntityDslFilter(entityId, GCP_DSL, dataViewId, {
        'data_stream.dataset': 'gcp.audit',
      });

      expect(filter?.meta).toMatchObject({
        type: FILTERS.COMBINED,
        relation: BooleanRelation.AND,
        controlledBy: `${CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER}:${entityId}`,
        index: dataViewId,
      });
    });

    it('never puts the entity id anywhere the filter bar renders', () => {
      // The entity id is an internal `<euid>|<role>` handle. In `key` it left single-clause
      // filters with a non-field key and no chip rendered at all; in `alias` it replaced the
      // chip label with the raw handle. Neither is user-facing text.
      const roleScopedId = `${entityId}|actor`;
      const filter = buildEntityDslFilter(roleScopedId, GCP_DSL, dataViewId, {
        'data_stream.dataset': 'gcp.audit',
      });

      expect(filter?.meta.alias).toBeUndefined();
      expect(filter?.meta.key).not.toBe(roleScopedId);
    });

    it('keeps the field name in meta.key for a single-clause identity so the chip renders', () => {
      // Single-field identities (generic, service) collapse to one leaf filter whose `key` is the
      // field the bar draws the chip from — it must survive.
      const genericId = 'projects/your-project-id/buckets/euid-demo-bucket';
      const filter = buildEntityDslFilter(
        genericId,
        { bool: { filter: [{ term: { 'entity.target.id': genericId } }] } },
        dataViewId
      );

      expect(filter).toMatchObject({
        meta: {
          type: 'phrase',
          key: 'entity.target.id',
          field: 'entity.target.id',
          controlledBy: `${CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER}:${genericId}`,
        },
        query: { match_phrase: { 'entity.target.id': genericId } },
      });
      expect(filter?.meta.alias).toBeUndefined();
    });

    it('finds and removes a single-clause entity filter by its entity id', () => {
      const genericId = 'projects/your-project-id/buckets/euid-demo-bucket';
      const added = addEntityFilter(dataViewId, [], genericId, {
        bool: { filter: [{ term: { 'entity.target.id': genericId } }] },
      });

      expect(containsEntityFilter(added, genericId)).toBe(true);
      expect(removeEntityFilter(added, genericId)).toHaveLength(0);
    });

    describe('combining several entity filters', () => {
      // Clicking "show this entity's actions" on an actor and then "show actions done to this
      // entity" on a target is additive: the analyst wants both sets of events. Emitting them as
      // sibling top-level filters ANDs them, which returns their intersection — usually empty,
      // since one event rarely satisfies an actor identity clause and a target identity clause
      // at once.
      const targetId = 'projects/your-project-id/buckets/euid-demo-bucket|target';
      const targetDsl = {
        bool: { filter: [{ term: { 'entity.target.id': 'projects/p/buckets/b1' } }] },
      };

      const addBoth = () => {
        const afterActor = addEntityFilter(dataViewId, [], entityId, GCP_DSL, {
          'data_stream.dataset': 'gcp.audit',
        });
        return addEntityFilter(dataViewId, afterActor, targetId, targetDsl);
      };

      it('ORs a second entity filter with the first instead of ANDing them', () => {
        const filters = addBoth();

        expect(filters).toHaveLength(1);
        expect(filters[0].meta).toMatchObject({
          type: FILTERS.COMBINED,
          relation: BooleanRelation.OR,
        });
        expect(filters[0].meta.params).toHaveLength(2);
      });

      it('keeps both entity filters findable once nested in the OR', () => {
        const filters = addBoth();

        expect(containsEntityFilter(filters, entityId)).toBe(true);
        expect(containsEntityFilter(filters, targetId)).toBe(true);
      });

      it('unwraps the OR when one of the two is removed', () => {
        const remaining = removeEntityFilter(addBoth(), entityId);

        expect(remaining).toHaveLength(1);
        expect(isCombinedFilter(remaining[0])).toBe(false);
        expect(containsEntityFilter(remaining, targetId)).toBe(true);
        expect(containsEntityFilter(remaining, entityId)).toBe(false);
      });

      it('drops the filter entirely when both are removed', () => {
        const filters = addBoth();

        expect(removeEntityFilter(removeEntityFilter(filters, entityId), targetId)).toHaveLength(0);
      });

      it('replaces rather than duplicates when the same entity is toggled twice', () => {
        const filters = addBoth();
        const readded = addEntityFilter(dataViewId, filters, targetId, targetDsl);

        expect(readded[0].meta.params).toHaveLength(2);
      });
    });

    it('renders the identity clause as a phrase filter and the guard as a negated exists', () => {
      const filter = buildEntityDslFilter(entityId, GCP_DSL, dataViewId, {
        'data_stream.dataset': 'gcp.audit',
      });

      const [identity, , guard] = andParams(filter);

      expect(identity).toMatchObject({
        meta: { type: 'phrase', key: 'user.id', negate: false },
        query: { match_phrase: { 'user.id': 'alice@example.com' } },
      });
      expect(guard).toMatchObject({
        meta: { type: 'exists', key: 'user.email', negate: true },
        query: { exists: { field: 'user.email' } },
      });
    });

    it('replaces the prefix clause with an exact phrase filter on the observed dataset', () => {
      const filter = buildEntityDslFilter(entityId, GCP_DSL, dataViewId, {
        'data_stream.dataset': 'gcp.audit',
      });
      const [, namespaceArm] = andParams(filter);

      // The namespace disjunction survives as an OR of two ordinary phrase filters — both
      // expressible with the filter bar's `is` operator.
      expect(namespaceArm.meta).toMatchObject({
        type: FILTERS.COMBINED,
        relation: BooleanRelation.OR,
      });

      const orParams = namespaceArm.meta.params as Filter[];
      expect(orParams).toHaveLength(2);
      expect(orParams[0]).toMatchObject({
        meta: { type: 'phrase', key: 'event.module' },
        query: { match_phrase: { 'event.module': 'gcp' } },
      });
      expect(orParams[1]).toMatchObject({
        meta: { type: 'phrase', key: 'data_stream.dataset' },
        query: { match_phrase: { 'data_stream.dataset': 'gcp.audit' } },
      });
    });

    it('uses an is-one-of (phrases) filter when several dataset values were observed', () => {
      const filter = buildEntityDslFilter(entityId, GCP_DSL, dataViewId, {
        'data_stream.dataset': ['gcp.audit', 'gcp.firewall'],
      });
      const [, namespaceArm] = andParams(filter);
      const orParams = namespaceArm.meta.params as Filter[];

      expect(orParams[1]).toMatchObject({
        meta: {
          type: 'phrases',
          key: 'data_stream.dataset',
          params: ['gcp.audit', 'gcp.firewall'],
        },
        query: {
          bool: {
            should: [
              { match_phrase: { 'data_stream.dataset': 'gcp.audit' } },
              { match_phrase: { 'data_stream.dataset': 'gcp.firewall' } },
            ],
            minimum_should_match: 1,
          },
        },
      });
    });

    it('drops the prefix clause when the dataset was not observed, collapsing the OR', () => {
      const filter = buildEntityDslFilter(entityId, GCP_DSL, dataViewId);
      const params = andParams(filter);

      // With only `event.module` left in the disjunction there is nothing to OR, so it is
      // emitted as a plain sibling phrase filter rather than a single-entry combined filter.
      expect(params).toHaveLength(3);
      expect(params[1]).toMatchObject({
        meta: { type: 'phrase', key: 'event.module' },
        query: { match_phrase: { 'event.module': 'gcp' } },
      });
      expect(JSON.stringify(filter)).not.toContain('data_stream.dataset');
    });

    it('never emits a clause the filter bar cannot represent', () => {
      const withObserved = buildEntityDslFilter(entityId, GCP_DSL, dataViewId, {
        'data_stream.dataset': 'gcp.audit',
      });
      const withoutObserved = buildEntityDslFilter(entityId, GCP_DSL, dataViewId);

      // `prefix` has no counterpart among is / is one of / exists, so it must never survive
      // translation regardless of whether an observed value was available to replace it.
      for (const filter of [withObserved, withoutObserved]) {
        expect(JSON.stringify(filter)).not.toContain('"prefix"');
      }
    });

    describe('an entity type with several prefix arms for one field', () => {
      // Okta's namespace evaluation lists both `okta` and `entityanalytics_okta` as source values,
      // so the builder emits a prefix arm for each against the same field. Okta documents carry no
      // `event.module`, which makes the substituted `data_stream.dataset` arm the only thing
      // holding the namespace clause up.
      const OKTA_DSL = {
        bool: {
          filter: [
            { term: { 'user.name': 'alice@example.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'okta' } },
                  { prefix: { 'data_stream.dataset': 'okta' } },
                  { term: { 'event.module': 'entityanalytics_okta' } },
                  { prefix: { 'data_stream.dataset': 'entityanalytics_okta' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      const oktaId = 'user:alice@example.com@okta';
      const observed = { 'data_stream.dataset': 'entityanalytics_okta.user' };

      const namespaceArm = (filter: Filter | undefined) =>
        (filter?.meta.params as Filter[])[1].meta.params as Filter[];

      it('substitutes the observed value only into the arm whose prefix it matches', () => {
        const arms = namespaceArm(buildEntityDslFilter(oktaId, OKTA_DSL, dataViewId, observed));

        // `entityanalytics_okta.user` does not start with `okta`, so that arm must be dropped
        // rather than take a value it would never have matched.
        const datasetArms = arms.filter((a) => a.meta.key === 'data_stream.dataset');
        expect(datasetArms).toHaveLength(1);
        expect(datasetArms[0].query).toEqual({
          match_phrase: { 'data_stream.dataset': 'entityanalytics_okta.user' },
        });
      });

      it('does not emit the same clause twice when arms collapse onto one value', () => {
        const arms = namespaceArm(buildEntityDslFilter(oktaId, OKTA_DSL, dataViewId, observed));
        const rendered = arms.map((a) => JSON.stringify(a.query));

        expect(new Set(rendered).size).toBe(rendered.length);
      });

      it('keeps the namespace clause matchable, which dropping every prefix would not', () => {
        const withObserved = buildEntityDslFilter(oktaId, OKTA_DSL, dataViewId, observed);
        const withoutObserved = buildEntityDslFilter(oktaId, OKTA_DSL, dataViewId);

        // Without substitution the disjunction is only `event.module` phrases, and no Okta
        // document has that field — the filter would return nothing at all.
        expect(JSON.stringify(withObserved)).toContain('entityanalytics_okta.user');
        expect(JSON.stringify(withoutObserved)).not.toContain('data_stream.dataset');
      });
    });
  });
});
