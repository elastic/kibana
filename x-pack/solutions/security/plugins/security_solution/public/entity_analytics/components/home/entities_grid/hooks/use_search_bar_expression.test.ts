/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { CombinedFilter, Filter, Query } from '@kbn/es-query';
import { BooleanRelation, FILTERS } from '@kbn/es-query';
import { convertFiltersToESQLExpression } from '@kbn/esql-utils';
import { splitFiltersByFields, useSearchBarExpression } from './use_search_bar_expression';

let mockGlobalFilters: Filter[] = [];
let mockGlobalQuery: Query = { query: '', language: 'kuery' };

jest.mock('../../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../../common/store/inputs', () => ({
  inputsSelectors: {
    globalFiltersQuerySelector: () => () => mockGlobalFilters,
    globalQuerySelector: () => () => mockGlobalQuery,
  },
}));

const ENTITY_FIELDS: ReadonlySet<string> = new Set(['entity.id', 'entity.EngineMetadata.Type']);

const phraseFilter = (field: string, value: string, negate = false): Filter => ({
  meta: { key: field, type: FILTERS.PHRASE, params: { query: value }, negate },
  query: { match_phrase: { [field]: value } },
});

const combinedFilter = (filters: Filter[]): CombinedFilter => ({
  meta: { type: FILTERS.COMBINED, relation: BooleanRelation.OR, params: filters },
});

const entityDataView = {
  fields: { getAll: () => [...ENTITY_FIELDS].map((name) => ({ name })) },
} as unknown as DataView;

describe('splitFiltersByFields', () => {
  it('keeps the filters on fields the entity docs have', () => {
    const filters = [phraseFilter('entity.id', 'host:a')];

    expect(splitFiltersByFields(filters, ENTITY_FIELDS)).toEqual({
      applicable: filters,
      ignoredFields: [],
    });
  });

  it('ignores the filters on fields the entity docs lack', () => {
    const known = phraseFilter('entity.id', 'host:a');
    const unknown = phraseFilter('kibana.alert.workflow_status', 'open');

    expect(splitFiltersByFields([known, unknown], ENTITY_FIELDS)).toEqual({
      applicable: [known],
      ignoredFields: ['kibana.alert.workflow_status'],
    });
  });

  it('keeps a combined filter whose fields are all known as it is', () => {
    const known = combinedFilter([
      phraseFilter('entity.id', 'host:a'),
      phraseFilter('entity.EngineMetadata.Type', 'host'),
    ]);

    expect(splitFiltersByFields([known], ENTITY_FIELDS)).toEqual({
      applicable: [known],
      ignoredFields: [],
    });
  });

  it('ignores a combined filter whole when any of its parts names an unknown field', () => {
    const mixed = combinedFilter([
      phraseFilter('entity.id', 'host:a'),
      phraseFilter('kibana.alert.workflow_status', 'open'),
    ]);

    expect(splitFiltersByFields([mixed], ENTITY_FIELDS)).toEqual({
      applicable: [],
      ignoredFields: ['kibana.alert.workflow_status'],
    });
  });

  it('ignores a combined filter nested in another when any of its parts is unknown', () => {
    const nested = combinedFilter([
      phraseFilter('entity.id', 'host:a'),
      combinedFilter([phraseFilter('process.name', 'a'), phraseFilter('entity.id', 'host:b')]),
    ]);

    expect(splitFiltersByFields([nested], ENTITY_FIELDS)).toEqual({
      applicable: [],
      ignoredFields: ['process.name'],
    });
  });

  it('ignores a negated filter on an unknown field too', () => {
    const negated = phraseFilter('kibana.alert.workflow_status', 'open', true);

    expect(splitFiltersByFields([negated], ENTITY_FIELDS)).toEqual({
      applicable: [],
      ignoredFields: ['kibana.alert.workflow_status'],
    });
  });

  it('lists each ignored field once', () => {
    const { ignoredFields } = splitFiltersByFields(
      [phraseFilter('process.name', 'a'), phraseFilter('process.name', 'b')],
      ENTITY_FIELDS
    );

    expect(ignoredFields).toEqual(['process.name']);
  });

  it('keeps a disabled filter and does not report its field', () => {
    const disabled = phraseFilter('kibana.alert.workflow_status', 'open');
    disabled.meta.disabled = true;

    expect(splitFiltersByFields([disabled], ENTITY_FIELDS)).toEqual({
      applicable: [disabled],
      ignoredFields: [],
    });
  });

  it('keeps a query string filter, whose normalized `meta.key` is `query`', () => {
    const filter: Filter = {
      meta: { type: FILTERS.QUERY_STRING, key: 'query', value: 'host.name: a' },
      query: { query_string: { query: 'host.name: a' } },
    };

    expect(splitFiltersByFields([filter], ENTITY_FIELDS)).toEqual({
      applicable: [filter],
      ignoredFields: [],
    });
  });

  it('keeps a custom filter, whose normalized `meta.key` is its DSL key', () => {
    const filter: Filter = {
      meta: { type: FILTERS.CUSTOM, key: 'bool', value: '{}' },
      query: { bool: { filter: [] } },
    };

    expect(splitFiltersByFields([filter], ENTITY_FIELDS)).toEqual({
      applicable: [filter],
      ignoredFields: [],
    });
  });

  it('keeps the filters that name no field', () => {
    const filter: Filter = { meta: { type: FILTERS.MATCH_ALL }, query: { match_all: {} } };

    expect(splitFiltersByFields([filter], ENTITY_FIELDS)).toEqual({
      applicable: [filter],
      ignoredFields: [],
    });
  });

  it('leaves an ES|QL expression without the unknown column', () => {
    const { applicable } = splitFiltersByFields(
      [phraseFilter('entity.id', 'host:a'), phraseFilter('kibana.alert.workflow_status', 'open')],
      ENTITY_FIELDS
    );

    const { esqlExpression } = convertFiltersToESQLExpression(applicable);

    expect(esqlExpression).toContain('entity.id');
    expect(esqlExpression).not.toContain('workflow_status');
  });
});

describe('useSearchBarExpression', () => {
  beforeEach(() => {
    mockGlobalFilters = [
      phraseFilter('entity.id', 'host:a'),
      phraseFilter('kibana.alert.workflow_status', 'open'),
    ];
    mockGlobalQuery = { query: 'entity.name: a', language: 'kuery' };
  });

  it('leaves out the filters on fields the entity data view lacks and reports them', () => {
    const { result } = renderHook(() => useSearchBarExpression(entityDataView));

    expect(result.current.ignoredFields).toEqual(['kibana.alert.workflow_status']);
    expect(result.current.applicableFilters).toEqual([mockGlobalFilters[0]]);
    expect(result.current.searchExpression).toContain('entity.id');
    expect(result.current.searchExpression).toContain('KQL(');
    expect(result.current.searchExpression).not.toContain('workflow_status');
  });

  it('converts every filter and ignores none while there is no data view', () => {
    const { result } = renderHook(() => useSearchBarExpression(undefined));

    expect(result.current.ignoredFields).toEqual([]);
    expect(result.current.applicableFilters).toEqual(mockGlobalFilters);
    expect(result.current.searchExpression).toContain('workflow_status');
  });

  it('is undefined when there is no filter nor query', () => {
    mockGlobalFilters = [];
    mockGlobalQuery = { query: '', language: 'kuery' };

    const { result } = renderHook(() => useSearchBarExpression(entityDataView));

    expect(result.current).toEqual({
      searchExpression: undefined,
      applicableFilters: [],
      ignoredFields: [],
    });
  });
});
