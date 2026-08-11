/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { ENTITY_FIELDS } from './constants';
import { processGroupFilters } from './entities_table_section';

const createFilter = (query: Filter['query'], metaKey?: string): Filter => ({
  query,
  meta: metaKey ? { key: metaKey } : {},
});

describe('processGroupFilters', () => {
  it('replaces resolution match_phrase and script filters with a single bool/should', () => {
    const filters = [
      createFilter(
        { match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: { query: 'target-id' } } },
        ENTITY_FIELDS.RESOLVED_TO
      ),
      createFilter(
        { script: { script: { source: `doc['resolved_to'].size() == 1` } } },
        ENTITY_FIELDS.RESOLVED_TO
      ),
    ];

    const result = processGroupFilters(filters);

    expect(result).toHaveLength(1);
    expect(result[0].query).toEqual({
      bool: {
        should: [
          { term: { [ENTITY_FIELDS.ENTITY_ID]: 'target-id' } },
          { term: { [ENTITY_FIELDS.RESOLVED_TO]: 'target-id' } },
        ],
        minimum_should_match: 1,
      },
    });
    expect(result[0].meta).toEqual({});
  });

  it('handles match_phrase with plain string value', () => {
    const filters = [
      createFilter(
        { match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: 'target-id' } },
        ENTITY_FIELDS.RESOLVED_TO
      ),
    ];

    const result = processGroupFilters(filters);

    expect(result).toHaveLength(1);
    expect(result[0].query?.bool?.should).toEqual([
      { term: { [ENTITY_FIELDS.ENTITY_ID]: 'target-id' } },
      { term: { [ENTITY_FIELDS.RESOLVED_TO]: 'target-id' } },
    ]);
  });

  it('passes non-resolution filters through unchanged', () => {
    const entityTypeFilter = createFilter(
      { match_phrase: { 'entity.EngineMetadata.Type': { query: 'user' } } },
      'entity.EngineMetadata.Type'
    );

    const result = processGroupFilters([entityTypeFilter]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(entityTypeFilter);
  });

  it('preserves non-resolution filters alongside the resolution replacement', () => {
    const entityTypeFilter = createFilter(
      { match_phrase: { 'entity.EngineMetadata.Type': { query: 'user' } } },
      'entity.EngineMetadata.Type'
    );
    const resolutionFilter = createFilter(
      { match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: { query: 'target-id' } } },
      ENTITY_FIELDS.RESOLVED_TO
    );
    const scriptFilter = createFilter(
      { script: { script: { source: 'doc["resolved_to"].size() == 1' } } },
      ENTITY_FIELDS.RESOLVED_TO
    );

    const result = processGroupFilters([resolutionFilter, scriptFilter, entityTypeFilter]);

    expect(result).toHaveLength(2);
    expect(result[0].query?.bool?.should).toBeDefined();
    expect(result[1]).toBe(entityTypeFilter);
  });

  it('passes through already-processed filters (no meta.key on replacement)', () => {
    const alreadyProcessed: Filter = {
      query: {
        bool: {
          should: [
            { term: { [ENTITY_FIELDS.ENTITY_ID]: 'target-id' } },
            { term: { [ENTITY_FIELDS.RESOLVED_TO]: 'target-id' } },
          ],
          minimum_should_match: 1,
        },
      },
      meta: {},
    };

    const result = processGroupFilters([alreadyProcessed]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(alreadyProcessed);
  });

  it('returns empty array for empty input', () => {
    expect(processGroupFilters([])).toEqual([]);
  });

  it('drops filters without a query', () => {
    const noQueryFilter = { meta: {} } as Filter;
    const validFilter = createFilter({ term: { field: 'value' } });

    const result = processGroupFilters([noQueryFilter, validFilter]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(validFilter);
  });

  it('drops resolution filters when none contain a match_phrase', () => {
    const scriptOnly = createFilter(
      { script: { script: { source: 'doc["resolved_to"].size() == 1' } } },
      ENTITY_FIELDS.RESOLVED_TO
    );
    const entityTypeFilter = createFilter(
      { match_phrase: { 'entity.EngineMetadata.Type': { query: 'user' } } },
      'entity.EngineMetadata.Type'
    );

    const result = processGroupFilters([scriptOnly, entityTypeFilter]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(entityTypeFilter);
  });

  it('uses first target entity ID when multiple resolution filters present', () => {
    const filters = [
      createFilter(
        { match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: { query: 'first-target' } } },
        ENTITY_FIELDS.RESOLVED_TO
      ),
      createFilter(
        { match_phrase: { [ENTITY_FIELDS.RESOLVED_TO]: { query: 'second-target' } } },
        ENTITY_FIELDS.RESOLVED_TO
      ),
    ];

    const result = processGroupFilters(filters);

    expect(result).toHaveLength(1);
    expect(result[0].query?.bool?.should).toEqual(
      expect.arrayContaining([{ term: { [ENTITY_FIELDS.ENTITY_ID]: 'first-target' } }])
    );
  });
});
