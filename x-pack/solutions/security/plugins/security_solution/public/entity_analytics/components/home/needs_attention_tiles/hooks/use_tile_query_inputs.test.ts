/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityFilters } from '../../entities_grid/common';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { useTileQueryInputs } from './use_tile_query_inputs';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockIndex = useResolvedLatestEntitiesIndexName as jest.Mock;

const INDEX = { indexName: '.entities-v1' };
const ON_W1: EntityFilters = { ...EMPTY_ENTITY_FILTERS, watchlists: ['w1'] };
const W1 = 'MV_CONTAINS(entity.attributes.watchlists, "w1")';

const overridesQuery = (state: { data?: object; isError?: boolean; error?: Error }) =>
  mockUseQuery.mockReturnValue({ data: undefined, isError: false, error: null, ...state });

const render = (entityFilters: EntityFilters) =>
  renderHook(() => useTileQueryInputs('default', entityFilters)).result.current;

const lastOverridesOptions = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][2];

describe('useTileQueryInputs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { data: { search: {} } } });
    mockIndex.mockReturnValue({ data: INDEX, isLoading: false, error: null });
    overridesQuery({});
  });

  it('passes the index through with no filters, and reads no overrides', () => {
    expect(render(EMPTY_ENTITY_FILTERS)).toEqual({
      data: INDEX,
      isLoading: false,
      error: undefined,
      entityFilterClauses: [],
    });
    expect(lastOverridesOptions().enabled).toBe(false);
  });

  it('reads no overrides for filters that judge every member alike, like the entity type', () => {
    const { data, entityFilterClauses } = render({
      ...EMPTY_ENTITY_FILTERS,
      entityTypes: [EntityType.host],
    });
    expect(data).toBe(INDEX);
    expect(entityFilterClauses).toEqual(['| WHERE entity.EngineMetadata.Type IN ("host")']);
    expect(lastOverridesOptions().enabled).toBe(false);
  });

  it('judges the risk level by the group, as the grid does on resolved rows', () => {
    const [clause] = render({ ...EMPTY_ENTITY_FILTERS, riskLevels: ['High'] }).entityFilterClauses;
    expect(clause).toContain('entity.relationships.resolution.risk.calculated_level IN ("High")');
  });

  it('holds the index back while the overrides of a group value filter load', () => {
    const { data, isLoading } = render(ON_W1);
    expect(lastOverridesOptions().enabled).toBe(true);
    expect(data).toBeUndefined();
    expect(isLoading).toBe(true);
  });

  it('adds the groups that pass only through an alias, and drops the ones that fail through one', () => {
    overridesQuery({ data: { include: ['host:in'], exclude: ['host:out'] } });
    const { data, isLoading, entityFilterClauses } = render(ON_W1);
    expect(data).toBe(INDEX);
    expect(isLoading).toBe(false);
    expect(entityFilterClauses).toEqual([
      `| WHERE ((${W1}) AND NOT entity.id IN ("host:out")) OR entity.id IN ("host:in")`,
    ]);
  });

  it('keeps the plain filter when no group passes differently from its main entity', () => {
    overridesQuery({ data: { include: [], exclude: [] } });
    expect(render(ON_W1).entityFilterClauses).toEqual([`| WHERE ${W1}`]);
  });

  it('reports the index as missing, with the error, when the overrides fail', () => {
    const error = new Error('The filters match too many resolved entities');
    overridesQuery({ isError: true, error });
    expect(render(ON_W1)).toMatchObject({ data: undefined, isLoading: false, error });
  });

  it('waits for the index before reading the overrides, and passes a missing index through', () => {
    mockIndex.mockReturnValue({ data: undefined, isLoading: true, error: null });
    expect(render(ON_W1)).toMatchObject({ data: undefined, isLoading: true });
    expect(lastOverridesOptions().enabled).toBe(false);

    mockIndex.mockReturnValue({ data: { indexName: null }, isLoading: false, error: null });
    expect(render(ON_W1)).toMatchObject({ data: { indexName: null }, isLoading: false });
    expect(lastOverridesOptions().enabled).toBe(false);
  });

  it('reads the overrides once per space, index and filter', () => {
    render(ON_W1);
    expect(mockUseQuery.mock.calls[0][0]).toEqual([
      'tileEntityFilterOverrides',
      'default',
      '.entities-v1',
      W1,
    ]);
  });
});
