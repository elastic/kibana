/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedFilter, Filter } from '@kbn/es-query';
import { BooleanRelation, FILTERS } from '@kbn/es-query';
import { convertFiltersToESQLExpression } from '@kbn/esql-utils';
import { splitFiltersByFields } from './use_search_bar_expression';

const ENTITY_FIELDS: ReadonlySet<string> = new Set(['entity.id', 'entity.EngineMetadata.Type']);

const phraseFilter = (field: string, value: string, negate = false): Filter => ({
  meta: { key: field, type: FILTERS.PHRASE, params: { query: value }, negate },
  query: { match_phrase: { [field]: value } },
});

const combinedFilter = (filters: Filter[]): CombinedFilter => ({
  meta: { type: FILTERS.COMBINED, relation: BooleanRelation.OR, params: filters },
});

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
