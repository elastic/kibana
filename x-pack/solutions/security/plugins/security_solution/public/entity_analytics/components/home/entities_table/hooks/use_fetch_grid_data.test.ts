/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildInspectData, getEntitiesNextPageParam, getEntitiesQuery } from './use_fetch_grid_data';
import { MAX_ENTITIES_TO_LOAD } from '../constants';

describe('buildInspectData', () => {
  const queryParams = {
    index: ['entities-latest-default'],
    size: 500,
    query: { bool: { filter: [] } },
  };

  const rawResponse = {
    took: 22,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: 3, relation: 'eq' },
      hits: [
        { _index: 'entities-latest-default', _id: '1', _source: { entity: { name: 'host-1' } } },
      ],
    },
  };

  it('should format the response as pretty-printed JSON with indentation', () => {
    const inspect = buildInspectData(queryParams, rawResponse);

    expect(inspect.response[0]).toBe(JSON.stringify(rawResponse, null, 2));
    expect(inspect.response[0]).toContain('\n');
    expect(inspect.response[0]).toContain('  ');
  });

  it('should NOT format the response as compact single-line JSON', () => {
    const inspect = buildInspectData(queryParams, rawResponse);

    expect(inspect.response[0]).not.toBe(JSON.stringify(rawResponse));
  });

  it('should include the DSL query params as a JSON string', () => {
    const inspect = buildInspectData(queryParams, rawResponse);

    expect(inspect.dsl[0]).toBe(JSON.stringify(queryParams));
  });
});

describe('getEntitiesNextPageParam', () => {
  const fullPage = { page: Array(MAX_ENTITIES_TO_LOAD).fill({}) };
  const partialPage = { page: Array(MAX_ENTITIES_TO_LOAD - 1).fill({}) };
  const emptyPage = { page: [] };

  it('returns undefined when the last page has fewer than MAX_ENTITIES_TO_LOAD records', () => {
    expect(getEntitiesNextPageParam(partialPage, [partialPage])).toBeUndefined();
  });

  it('returns undefined for an empty last page', () => {
    expect(getEntitiesNextPageParam(emptyPage, [emptyPage])).toBeUndefined();
  });

  it('returns MAX_ENTITIES_TO_LOAD as the next offset after the first full page', () => {
    expect(getEntitiesNextPageParam(fullPage, [fullPage])).toBe(MAX_ENTITIES_TO_LOAD);
  });

  it('advances the offset by MAX_ENTITIES_TO_LOAD per page', () => {
    expect(getEntitiesNextPageParam(fullPage, [fullPage, fullPage])).toBe(
      MAX_ENTITIES_TO_LOAD * 2
    );
  });

  it('does not use the UI page size (25) for the offset', () => {
    // Regression guard: the bug was allPages.length * options.pageSize (25),
    // producing from=25 on page 2 instead of from=500, causing massive overlap.
    const nextOffset = getEntitiesNextPageParam(fullPage, [fullPage]);
    expect(nextOffset).toBe(500);
    expect(nextOffset).not.toBe(25);
  });
});

describe('getEntitiesQuery', () => {
  const options = {
    query: undefined,
    sort: [['entity.name', 'asc']] as Array<[string, string]>,
    enabled: true,
  };

  it('throws when no index pattern is provided', () => {
    expect(() => getEntitiesQuery(options, undefined, undefined)).toThrow(
      'Index pattern is required'
    );
  });

  it('pins the query to the origin entity store via project_routing', () => {
    const params = getEntitiesQuery(options, undefined, 'entities-latest-default');

    expect(params).toHaveProperty('project_routing', '_alias:_origin');
  });

  it('targets the provided index pattern', () => {
    const params = getEntitiesQuery(options, undefined, 'entities-latest-default');

    expect(params.index).toEqual(['entities-latest-default']);
  });
});
