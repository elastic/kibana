/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import {
  getGroupedEntitiesQuery,
  parseTargetMetadataHits,
  useFetchUnfilteredResolutionGroupData,
  useFetchFilteredResolutionGroupData,
  useFetchGroupedData,
  ESQL_LIMIT_CAP,
  type EntitiesGroupingQuery,
} from './use_fetch_grouped_data';
import { useKibana } from '../../../../../common/lib/kibana';
import { DataViewContext, type DataViewContextValue } from '..';
import { ENTITY_FIELDS, ENTITY_GROUPING_OPTIONS } from '../constants';

jest.mock('@kbn/esql-utils', () => ({ getESQLResults: jest.fn() }));

jest.mock('../../../../../common/lib/kibana');

const mockSearch = jest.fn();

const createWrapper = (
  indexPattern = 'entities-latest-default'
): React.FC<{ children: React.ReactNode }> => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const dataView = {
      getIndexPattern: () => indexPattern,
    } as unknown as DataViewContextValue['dataView'];
    return React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(DataViewContext.Provider, { value: { dataView } }, children)
    );
  };
  return Wrapper;
};

describe('parseTargetMetadataHits', () => {
  it('extracts name, type, and riskScore from well-formed hits', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:alice@okta',
            name: 'alice',
            EngineMetadata: { Type: EntityType.user },
            relationships: {
              resolution: { risk: { calculated_score_norm: 85.5 } },
            },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(1);
    expect(result.get('user:alice@okta')).toEqual({
      name: 'alice',
      type: EntityType.user,
      riskScore: 85.5,
      individualRiskScore: null,
    });
  });

  it('extracts individualRiskScore from entity.risk.calculated_score_norm', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:solo@okta',
            name: 'solo',
            EngineMetadata: { Type: EntityType.user },
            risk: { calculated_score_norm: 67.25 },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.get('user:solo@okta')).toEqual({
      name: 'solo',
      type: EntityType.user,
      riskScore: null,
      individualRiskScore: 67.25,
    });
  });

  it('parses multiple hits into a map keyed by entity.id', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:alice@okta',
            name: 'alice',
            EngineMetadata: { Type: EntityType.user },
          },
        },
      },
      {
        _source: {
          entity: {
            id: 'host:srv-01',
            name: 'srv-01',
            EngineMetadata: { Type: EntityType.host },
            relationships: {
              resolution: { risk: { calculated_score_norm: 42.0 } },
            },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(2);
    expect(result.get('user:alice@okta')).toEqual({
      name: 'alice',
      type: EntityType.user,
      riskScore: null,
      individualRiskScore: null,
    });
    expect(result.get('host:srv-01')).toEqual({
      name: 'srv-01',
      type: EntityType.host,
      riskScore: 42.0,
      individualRiskScore: null,
    });
  });

  it('sets riskScore to null when resolution risk fields are absent', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:bob@ad',
            name: 'bob',
            EngineMetadata: { Type: EntityType.user },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.get('user:bob@ad')?.riskScore).toBeNull();
  });

  it('skips hits with missing entity.id', () => {
    const hits = [
      {
        _source: {
          entity: {
            name: 'no-id-entity',
            EngineMetadata: { Type: EntityType.user },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(0);
  });

  it('skips hits with missing entity.name', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:nameless',
            EngineMetadata: { Type: EntityType.user },
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(0);
  });

  it('skips hits with missing EngineMetadata.Type', () => {
    const hits = [
      {
        _source: {
          entity: {
            id: 'user:typeless',
            name: 'typeless-user',
          },
        },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(0);
  });

  it('skips hits with null _source', () => {
    const hits = [{ _source: null }, { _source: undefined }];

    const result = parseTargetMetadataHits(hits as Array<{ _source?: unknown }>);

    expect(result.size).toBe(0);
  });

  it('skips hits with _source that has no entity field', () => {
    const hits = [
      {
        _source: { someOtherField: 'value' },
      },
    ];

    const result = parseTargetMetadataHits(hits);

    expect(result.size).toBe(0);
  });

  it('returns an empty map for empty hits array', () => {
    const result = parseTargetMetadataHits([]);

    expect(result.size).toBe(0);
  });
});

describe('getGroupedEntitiesQuery', () => {
  const minimalQuery = { size: 0 } as EntitiesGroupingQuery;

  it('pins the grouped query to the origin entity store via project_routing', () => {
    const result = getGroupedEntitiesQuery(minimalQuery, 'entities-latest-default');

    expect(result).toHaveProperty('project_routing', '_alias:_origin');
  });

  it('targets the provided index pattern', () => {
    const result = getGroupedEntitiesQuery(minimalQuery, 'entities-latest-default');

    expect(result.index).toBe('entities-latest-default');
  });
});

// ─── Shared helpers for ES|QL fetch hook tests ──────────────────────────────

const makeUnfilteredResolutionEsqlResponse = (
  targets: Array<{
    id: string;
    name: string;
    type: string;
    eff: number | null;
    riskScore: number | null;
    resolutionRisk: number | null;
  }>
) => ({
  response: {
    columns: [
      { name: ENTITY_FIELDS.ENTITY_ID },
      { name: ENTITY_FIELDS.ENTITY_NAME },
      { name: ENTITY_FIELDS.ENTITY_TYPE },
      { name: 'effective_risk' },
      { name: ENTITY_FIELDS.ENTITY_RISK },
      { name: ENTITY_FIELDS.RESOLUTION_RISK_SCORE },
    ],
    values: targets.map((t) => [t.id, t.name, t.type, t.eff, t.riskScore, t.resolutionRisk]),
  },
  params: { query: '' },
});

const makeFilteredResolutionEsqlResponse = (
  groups: Array<{ group_key: string; group_risk: number | null; group_size: number }>
) => ({
  response: {
    columns: [{ name: 'group_key' }, { name: 'group_risk' }, { name: 'group_size' }],
    values: groups.map((g) => [g.group_key, g.group_risk, g.group_size]),
  },
  params: { query: '' },
});

// Shape returned by the filtered distinct-group count ES|QL query (`| STATS total = COUNT(*)`).
const makeGroupCountEsqlResponse = (total: number) => ({
  response: {
    columns: [{ name: 'total' }],
    values: [[total]],
  },
  params: { query: '' },
});

const setupKibanaMock = () => {
  (useKibana as jest.Mock).mockReturnValue({
    services: {
      data: { search: { search: mockSearch } },
      notifications: { toasts: { addError: jest.fn() } },
    },
  });
};

describe('useFetchUnfilteredResolutionGroupData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibanaMock();
  });

  it('returns target metadata from ES|QL rows without a separate metadata DSL query', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(
      makeUnfilteredResolutionEsqlResponse([
        {
          id: 'user:alice',
          name: 'alice',
          type: 'user',
          eff: 85,
          riskScore: 70,
          resolutionRisk: 85,
        },
      ])
    );
    // Call 1: group count (targets); Call 2: unit count (all entities); Call 3: alias count
    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 1 } } } }))
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 1 } } } }))
      .mockReturnValueOnce(
        of({ rawResponse: { aggregations: { aliases_by_target: { buckets: [] } } } })
      );

    const { result } = renderHook(
      () => useFetchUnfilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.targetMetadata.get('user:alice')).toEqual({
      name: 'alice',
      type: 'user',
      riskScore: 85,
      individualRiskScore: 70,
    });

    // Only DSL count + alias queries — metadata comes from the ES|QL rows, not a fixup call
    expect(mockSearch).toHaveBeenCalledTimes(3);
  });

  it('sets doc_count to 1 plus the alias count from the terms agg', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(
      makeUnfilteredResolutionEsqlResponse([
        {
          id: 'user:alice',
          name: 'alice',
          type: 'user',
          eff: 85,
          riskScore: 70,
          resolutionRisk: 85,
        },
        {
          id: 'host:srv-01',
          name: 'srv-01',
          type: 'host',
          eff: 60,
          riskScore: 60,
          resolutionRisk: null,
        },
      ])
    );
    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 2 } } } })) // group count
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 2 } } } })) // unit count
      .mockReturnValueOnce(
        of({
          rawResponse: {
            aggregations: {
              aliases_by_target: {
                // alice has 1 alias; srv-01 has none
                buckets: [{ key: 'user:alice', doc_count: 1 }],
              },
            },
          },
        })
      );

    const { result } = renderHook(
      () => useFetchUnfilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const buckets = result.current.data!.groupData.groupByFields.buckets;
    const alice = buckets.find((b) => b.key[0] === 'user:alice');
    const srv = buckets.find((b) => b.key[0] === 'host:srv-01');

    expect(alice?.doc_count).toBe(2); // 1 target + 1 alias
    expect(srv?.doc_count).toBe(1); // 1 target, no aliases
  });

  it('wraps each target entity id in an array as bucket.key with key_as_string and selectedGroup', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(
      makeUnfilteredResolutionEsqlResponse([
        {
          id: 'user:alice',
          name: 'alice',
          type: 'user',
          eff: 85,
          riskScore: 70,
          resolutionRisk: 85,
        },
      ])
    );
    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 1 } } } })) // group count
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 1 } } } })) // unit count
      .mockReturnValueOnce(
        of({ rawResponse: { aggregations: { aliases_by_target: { buckets: [] } } } })
      );

    const { result } = renderHook(
      () => useFetchUnfilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [bucket] = result.current.data!.groupData.groupByFields.buckets;
    expect(Array.isArray(bucket.key)).toBe(true);
    expect(bucket.key).toEqual(['user:alice']);
    expect(bucket.key_as_string).toBe('user:alice');
    expect(bucket.selectedGroup).toBe(ENTITY_GROUPING_OPTIONS.RESOLUTION);
  });

  it(`caps the ES|QL LIMIT at ${ESQL_LIMIT_CAP} when (pageIndex+1)*pageSize would exceed it`, async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(makeUnfilteredResolutionEsqlResponse([]));
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { total: { value: 0 } },
          aggregations: { aliases_by_target: { buckets: [] } },
        },
      })
    );

    renderHook(() => useFetchUnfilteredResolutionGroupData({ pageIndex: 999, pageSize: 100 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(getESQLResults as jest.Mock).toHaveBeenCalled());

    const { esqlQuery } = (getESQLResults as jest.Mock).mock.calls[0][0];
    expect(esqlQuery).toMatch(new RegExp(`LIMIT ${ESQL_LIMIT_CAP}`));
    // Always-on inline entity-type filter and the target-only (unresolved) predicate
    expect(esqlQuery).toContain(`${ENTITY_FIELDS.ENTITY_TYPE} IN ("user","host","service")`);
    expect(esqlQuery).toContain(`${ENTITY_FIELDS.RESOLVED_TO} IS NULL`);
  });

  it('sorts by effective_risk DESC then entity.id ASC for stable pagination ties', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(makeUnfilteredResolutionEsqlResponse([]));
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { total: { value: 0 } },
          aggregations: { aliases_by_target: { buckets: [] } },
        },
      })
    );

    renderHook(() => useFetchUnfilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(getESQLResults as jest.Mock).toHaveBeenCalled());

    const { esqlQuery } = (getESQLResults as jest.Mock).mock.calls[0][0];
    expect(esqlQuery).toContain(
      `SORT effective_risk DESC NULLS LAST, ${ENTITY_FIELDS.ENTITY_ID} ASC`
    );
  });

  it('uses track_total_hits result as groupsCount', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(makeUnfilteredResolutionEsqlResponse([]));
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: { total: { value: 42 } },
          aggregations: { aliases_by_target: { buckets: [] } },
        },
      })
    );

    const { result } = renderHook(
      () => useFetchUnfilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.groupData.groupsCount.value).toBe(42);
  });

  it('counts targets for groupsCount and all entities (targets + aliases) for unitsCount', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(makeUnfilteredResolutionEsqlResponse([]));
    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 3 } } } })) // group count (targets only)
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 8 } } } })) // unit count (all entities)
      .mockReturnValueOnce(
        of({ rawResponse: { aggregations: { aliases_by_target: { buckets: [] } } } })
      );

    const { result } = renderHook(
      () => useFetchUnfilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // groups (one per target) and entities (targets + aliases) come from separate count queries
    expect(result.current.data!.groupData.groupsCount.value).toBe(3);
    expect(result.current.data!.groupData.unitsCount.value).toBe(8);
  });

  it('slices to the requested page and scopes the alias-count include to that page', async () => {
    // pageIndex 1 / pageSize 2 fetches LIMIT 4 rows, then client-slices to rows[2..3].
    const mkTarget = (n: number) => ({
      id: `user:u${n}`,
      name: `u${n}`,
      type: 'user',
      eff: 100 - n,
      riskScore: 100 - n,
      resolutionRisk: 100 - n,
    });
    (getESQLResults as jest.Mock).mockResolvedValue(
      makeUnfilteredResolutionEsqlResponse([mkTarget(0), mkTarget(1), mkTarget(2), mkTarget(3)])
    );
    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 4 } } } })) // group count
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 4 } } } })) // unit count
      .mockReturnValueOnce(
        of({ rawResponse: { aggregations: { aliases_by_target: { buckets: [] } } } })
      );

    const { result } = renderHook(
      () => useFetchUnfilteredResolutionGroupData({ pageIndex: 1, pageSize: 2 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const buckets = result.current.data!.groupData.groupByFields.buckets;
    // Only the second page (rows[2..3]), not rows[0..1]
    expect(buckets.map((b) => b.key[0])).toEqual(['user:u2', 'user:u3']);

    // The bounded alias-count agg must be limited to the current page's target ids
    const aliasCall = mockSearch.mock.calls[2][0];
    expect(aliasCall.params.aggs.aliases_by_target.terms.include).toEqual(['user:u2', 'user:u3']);
    expect(aliasCall.params.aggs.aliases_by_target.terms.size).toBe(2);
  });
});

describe('useFetchFilteredResolutionGroupData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibanaMock();
  });

  it('passes the user DSL filter to the STATS join ES|QL query', async () => {
    const userFilter = {
      bool: { filter: [{ term: { 'host.name': 'my-host' } }], must: [], should: [], must_not: [] },
    };

    (getESQLResults as jest.Mock).mockResolvedValue(makeFilteredResolutionEsqlResponse([]));
    mockSearch.mockReturnValue(of({ rawResponse: { hits: { total: { value: 0 }, hits: [] } } }));

    renderHook(
      () => useFetchFilteredResolutionGroupData({ pageIndex: 0, pageSize: 10, filter: userFilter }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(getESQLResults as jest.Mock).toHaveBeenCalled());

    expect((getESQLResults as jest.Mock).mock.calls[0][0].filter).toEqual(userFilter);
  });

  it('fetches target metadata without user filters in the fixup DSL query', async () => {
    const userFilter = {
      bool: { filter: [{ term: { 'host.name': 'my-host' } }], must: [], should: [], must_not: [] },
    };

    (getESQLResults as jest.Mock).mockResolvedValue(
      makeFilteredResolutionEsqlResponse([
        { group_key: 'user:alice', group_risk: 90, group_size: 1 },
      ])
    );
    // Call 1: total count; Call 2: metadata fixup
    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 1 } } } }))
      .mockReturnValueOnce(of({ rawResponse: { hits: { hits: [] } } }));

    renderHook(
      () => useFetchFilteredResolutionGroupData({ pageIndex: 0, pageSize: 10, filter: userFilter }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));

    const metadataCall = mockSearch.mock.calls[1][0];
    // Metadata fixup query must NOT contain user filter terms
    const filterClauses: unknown[] = metadataCall.params?.query?.bool?.filter ?? [];
    const hasUserFilter = filterClauses.some(
      (f) =>
        typeof f === 'object' && f !== null && 'bool' in f && JSON.stringify(f).includes('my-host')
    );
    expect(hasUserFilter).toBe(false);
    // Must query by entity.id (the target ids from the page)
    expect(filterClauses).toContainEqual({
      terms: { [ENTITY_FIELDS.ENTITY_ID]: ['user:alice'] },
    });
  });

  it('load-bearing: alias-only match surfaces target name and risk from the metadata fixup', async () => {
    // The user filter matches only the alias. The STATS join returns group_key = target's id
    // (COALESCE(resolved_to, entity.id) = resolved_to = target id for the alias row).
    // Without the metadata fixup the target's name would be unknown; with it we get it.
    // group_risk (50) is deliberately different from the metadata riskScore (90) so the assertion
    // proves resolutionRiskScore came from the metadata branch, not the group_risk fallback.
    (getESQLResults as jest.Mock).mockResolvedValue(
      makeFilteredResolutionEsqlResponse([
        { group_key: 'target-user-001', group_risk: 50, group_size: 1 },
      ])
    );

    const metadataHit = {
      _source: {
        entity: {
          id: 'target-user-001',
          name: 'Alice',
          EngineMetadata: { Type: EntityType.user },
          relationships: { resolution: { risk: { calculated_score_norm: 90 } } },
        },
      },
    };

    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 1 } } } })) // total count
      .mockReturnValueOnce(of({ rawResponse: { hits: { hits: [metadataHit] } } })); // fixup

    const { result } = renderHook(
      () => useFetchFilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { targetMetadata, groupData } = result.current.data!;

    expect(targetMetadata.get('target-user-001')).toEqual({
      name: 'Alice',
      type: EntityType.user,
      riskScore: 90,
      individualRiskScore: null,
    });

    const [bucket] = groupData.groupByFields.buckets;
    expect(bucket.key).toEqual(['target-user-001']);
    expect(bucket.key_as_string).toBe('target-user-001');
    // metadata riskScore (90) wins over group_risk (50)
    expect(bucket.resolutionRiskScore.value).toBe(90);
  });

  it('falls back to group_risk for resolutionRiskScore when no target metadata is found', async () => {
    // No metadata hit for the group_key (fixup returns nothing), so resolutionRiskScore must fall
    // back to the STATS join's group_risk rather than surfacing null.
    (getESQLResults as jest.Mock).mockResolvedValue(
      makeFilteredResolutionEsqlResponse([
        { group_key: 'target-user-001', group_risk: 77, group_size: 1 },
      ])
    );

    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 1 } } } })) // total count
      .mockReturnValueOnce(of({ rawResponse: { hits: { hits: [] } } })); // fixup: no metadata

    const { result } = renderHook(
      () => useFetchFilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [bucket] = result.current.data!.groupData.groupByFields.buckets;
    expect(bucket.resolutionRiskScore.value).toBe(77);
  });

  it('sets resolutionRiskScore to null when neither metadata nor group_risk is present', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(
      makeFilteredResolutionEsqlResponse([
        { group_key: 'target-user-001', group_risk: null, group_size: 1 },
      ])
    );

    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 1 } } } })) // total count
      .mockReturnValueOnce(of({ rawResponse: { hits: { hits: [] } } })); // fixup: no metadata

    const { result } = renderHook(
      () => useFetchFilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [bucket] = result.current.data!.groupData.groupByFields.buckets;
    expect(bucket.resolutionRiskScore.value).toBeNull();
  });

  it('wraps each group_key in an array as bucket.key', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(
      makeFilteredResolutionEsqlResponse([
        { group_key: 'user:alice', group_risk: 85, group_size: 2 },
      ])
    );
    mockSearch.mockReturnValue(of({ rawResponse: { hits: { total: { value: 1 }, hits: [] } } }));

    const { result } = renderHook(
      () => useFetchFilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [bucket] = result.current.data!.groupData.groupByFields.buckets;
    expect(Array.isArray(bucket.key)).toBe(true);
    expect(bucket.key).toEqual(['user:alice']);
    expect(bucket.selectedGroup).toBe(ENTITY_GROUPING_OPTIONS.RESOLUTION);
  });

  it(`caps the ES|QL LIMIT at ${ESQL_LIMIT_CAP} when (pageIndex+1)*pageSize would exceed it`, async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(makeFilteredResolutionEsqlResponse([]));
    mockSearch.mockReturnValue(of({ rawResponse: { hits: { total: { value: 0 }, hits: [] } } }));

    renderHook(() => useFetchFilteredResolutionGroupData({ pageIndex: 999, pageSize: 100 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(getESQLResults as jest.Mock).toHaveBeenCalled());

    const { esqlQuery } = (getESQLResults as jest.Mock).mock.calls[0][0];
    expect(esqlQuery).toMatch(new RegExp(`LIMIT ${ESQL_LIMIT_CAP}`));
    // Always-on inline entity-type filter and the COALESCE group key that lets a matching alias
    // surface its target's group
    expect(esqlQuery).toContain(`${ENTITY_FIELDS.ENTITY_TYPE} IN ("user","host","service")`);
    expect(esqlQuery).toContain(
      `COALESCE(${ENTITY_FIELDS.RESOLVED_TO}, ${ENTITY_FIELDS.ENTITY_ID})`
    );
  });

  it('sorts by group_risk DESC, group_size DESC, then group_key ASC for stable pagination ties', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue(makeFilteredResolutionEsqlResponse([]));
    mockSearch.mockReturnValue(of({ rawResponse: { hits: { total: { value: 0 }, hits: [] } } }));

    renderHook(() => useFetchFilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(getESQLResults as jest.Mock).toHaveBeenCalled());

    const { esqlQuery } = (getESQLResults as jest.Mock).mock.calls[0][0];
    expect(esqlQuery).toContain('SORT group_risk DESC NULLS LAST, group_size DESC, group_key ASC');
  });

  it('reports the distinct-group count as groupsCount so filtered views paginate past page 1', async () => {
    // STATS join returns a single group for this page, but there are 137 groups in total.
    // groupsCount must be the total (137), not the page's bucket count (1) — otherwise the
    // grouping component collapses to a single page whenever a filter is active.
    (getESQLResults as jest.Mock).mockImplementation(({ esqlQuery }: { esqlQuery: string }) =>
      Promise.resolve(
        esqlQuery.includes('group_risk')
          ? makeFilteredResolutionEsqlResponse([
              { group_key: 'user:alice', group_risk: 85, group_size: 2 },
            ])
          : makeGroupCountEsqlResponse(137)
      )
    );
    mockSearch
      .mockReturnValueOnce(of({ rawResponse: { hits: { total: { value: 500 } } } })) // unit count
      .mockReturnValueOnce(of({ rawResponse: { hits: { hits: [] } } })); // metadata fixup

    const { result } = renderHook(
      () => useFetchFilteredResolutionGroupData({ pageIndex: 0, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.groupData.groupByFields.buckets).toHaveLength(1);
    expect(result.current.data!.groupData.groupsCount.value).toBe(137);
    expect(result.current.data!.groupData.unitsCount.value).toBe(500);
  });
});

describe('useFetchGroupedData', () => {
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: { search: { search: mockSearch } },
        notifications: { toasts: { addError: mockAddError, addDanger: jest.fn() } },
      },
    });
  });

  const query = { size: 0 } as EntitiesGroupingQuery;

  it('returns the aggregations when the search resolves with them', async () => {
    const aggregations = { groupsCount: { value: 3 }, unitsCount: { value: 12 } };
    mockSearch.mockReturnValue(of({ rawResponse: { aggregations } }));

    const { result } = renderHook(() => useFetchGroupedData({ query, enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(aggregations));
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('degrades to an empty result (no error) when the search returns no aggregations', async () => {
    // A successful search against a cleared/missing entity store index comes back without an
    // `aggregations` key. The hook must resolve with `{}` (empty groups) rather than throwing,
    // so the grouped view shows the empty state instead of an error toast + stuck loader.
    mockSearch.mockReturnValue(of({ rawResponse: {} }));

    const { result } = renderHook(() => useFetchGroupedData({ query, enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({});
    expect(result.current.isError).toBe(false);
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('does not fire when there is no index pattern', () => {
    mockSearch.mockReturnValue(of({ rawResponse: { aggregations: {} } }));

    renderHook(() => useFetchGroupedData({ query, enabled: true }), {
      // An empty index pattern (e.g. data view not resolved yet) disables the query.
      wrapper: createWrapper(''),
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });
});
