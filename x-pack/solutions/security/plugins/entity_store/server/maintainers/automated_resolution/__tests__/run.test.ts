/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { runRules, selectTarget } from '../run';
import type { RunRulesDeps } from '../run';
import type { AutomatedResolutionState, EntityHit } from '../types';
import { OOTB_RESOLUTION_RULES, STAGE_0_RULE_IDS } from '../rules_config';

// Mock cascade so run.test.ts only tests routing / watermark logic
jest.mock('../cascade', () => ({
  cascadeLink: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cascadeLink: mockCascadeLink } = require('../cascade') as {
  cascadeLink: jest.Mock;
};

const NAMESPACE = 'default';
const S1_RULE = OOTB_RESOLUTION_RULES[0]; // email rule, first in array

const emptyRules = STAGE_0_RULE_IDS.reduce((acc, id) => {
  acc[id] = { lastProcessedTimestamp: null, lastRun: null };
  return acc;
}, {} as AutomatedResolutionState['rules']);

const createInitialState = (
  overrides: Partial<AutomatedResolutionState['rules']['S1']> = {}
): AutomatedResolutionState => ({
  rules: {
    ...emptyRules,
    S1: { lastProcessedTimestamp: null, lastRun: null, ...overrides },
  },
});

const createDeps = (
  state: AutomatedResolutionState,
  esClient: ElasticsearchClient,
  overrides: Partial<RunRulesDeps> = {}
): RunRulesDeps => ({
  state,
  enabledRules: [S1_RULE],
  namespace: NAMESPACE,
  esClient,
  logger: loggerMock.create(),
  abortController: new AbortController(),
  ...overrides,
});

/** Step 1 mock: composite agg over `values`, max_timestamp */
const createCollectValuesResponse = (
  values: string[],
  maxTimestamp: string,
  afterKey?: Record<string, string>
) => ({
  aggregations: {
    values: {
      buckets: values.map((v) => ({ key: { value: v }, doc_count: 1 })),
      ...(afterKey ? { after_key: afterKey } : {}),
    },
    max_timestamp: { value_as_string: maxTimestamp },
  },
});

/** Step 2 mock: terms agg over `match_groups` */
const createFindGroupsResponse = (
  groups: Array<{
    value: string;
    unresolved: Array<{ id: string; namespace: string }>;
    existingTargets: string[];
    totalUnresolved?: number;
  }>
) => ({
  aggregations: {
    match_groups: {
      buckets: groups.map((g) => ({
        key: g.value,
        doc_count: g.unresolved.length + g.existingTargets.length,
        unresolved: {
          doc_count: g.totalUnresolved ?? g.unresolved.length,
          hits: {
            hits: {
              total: { value: g.totalUnresolved ?? g.unresolved.length, relation: 'eq' },
              hits: g.unresolved.map((u) => ({
                _source: { entity: { id: u.id, namespace: u.namespace } },
              })),
            },
          },
        },
        existing_targets: {
          doc_count: g.existingTargets.length,
          target_ids: {
            buckets: g.existingTargets.map((t) => ({ key: t, doc_count: 1 })),
          },
        },
      })),
    },
  },
});

describe('runRules', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCascadeLink.mockResolvedValue({
      resolutionsCreated: 1,
      cascadeCount: 0,
      cycleBlocked: false,
    });
    mockEsClient = { search: jest.fn() } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  it('should perform a full scan when S1 watermark is null', async () => {
    const state = createInitialState();
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(
        createFindGroupsResponse([
          {
            value: 'a@test.com',
            unresolved: [
              { id: 'user-1', namespace: 'okta' },
              { id: 'user-2', namespace: 'entra_id' },
            ],
            existingTargets: [],
          },
        ]) as any
      );

    await runRules(createDeps(state, mockEsClient));

    const step1Query = mockEsClient.search.mock.calls[0][0] as any;
    const filters = step1Query.query.bool.filter;
    const hasFirstSeenFilter = filters.some(
      (f: any) => f.range && f.range['entity.lifecycle.first_seen']
    );
    expect(hasFirstSeenFilter).toBe(false);
  });

  it('should include timestamp range filter for incremental scan', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-03-09T00:00:00Z' });
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(createFindGroupsResponse([]) as any);

    await runRules(createDeps(state, mockEsClient));

    const step1Query = mockEsClient.search.mock.calls[0][0] as any;
    const filters = step1Query.query.bool.filter;
    const firstSeenFilter = filters.find(
      (f: any) => f.range && f.range['entity.lifecycle.first_seen']
    );
    expect(firstSeenFilter).toEqual({
      range: { 'entity.lifecycle.first_seen': { gt: '2026-03-09T00:00:00Z' } },
    });
  });

  it('should return early when no new entities found', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-03-09T00:00:00Z' });
    mockEsClient.search.mockResolvedValueOnce(createCollectValuesResponse([], '') as any);

    const result = await runRules(createDeps(state, mockEsClient));

    expect(result.rules.S1.lastProcessedTimestamp).toBe('2026-03-09T00:00:00Z');
    expect(result.rules.S1.lastRun?.resolutionsCreated).toBe(0);
    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
  });

  it('should create new resolution group with 2+ unresolved entities', async () => {
    const state = createInitialState();
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(
        createFindGroupsResponse([
          {
            value: 'a@test.com',
            unresolved: [
              { id: 'user-okta', namespace: 'okta' },
              { id: 'user-entra', namespace: 'entra_id' },
            ],
            existingTargets: [],
          },
        ]) as any
      );

    const result = await runRules(createDeps(state, mockEsClient));

    // cascadeLink should be called with the target (okta wins priority) and alias
    expect(mockCascadeLink).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'user-okta',
      ['user-entra'],
      expect.anything()
    );
    expect(result.rules.S1.lastRun?.resolutionsCreated).toBe(1);
  });

  it('should extend existing resolution group', async () => {
    const state = createInitialState();
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(
        createFindGroupsResponse([
          {
            value: 'a@test.com',
            unresolved: [{ id: 'user-new', namespace: 'okta' }],
            existingTargets: ['user-existing-target'],
          },
        ]) as any
      );

    const result = await runRules(createDeps(state, mockEsClient));

    expect(mockCascadeLink).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'user-existing-target',
      ['user-new'],
      expect.anything()
    );
    expect(result.rules.S1.lastRun?.resolutionsCreated).toBe(1);
  });

  it('should skip ambiguous buckets with multiple existing targets', async () => {
    const state = createInitialState();
    const logger = loggerMock.create();
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(
        createFindGroupsResponse([
          {
            value: 'a@test.com',
            unresolved: [{ id: 'user-new', namespace: 'okta' }],
            existingTargets: ['target-1', 'target-2'],
          },
        ]) as any
      );

    const result = await runRules(createDeps(state, mockEsClient, { logger }));

    expect(mockCascadeLink).not.toHaveBeenCalled();
    expect(result.rules.S1.lastRun?.skippedAmbiguousBuckets).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Skipping ambiguous bucket'));
  });

  it('should count cycle-blocked cascade as skipped ambiguous', async () => {
    const state = createInitialState();
    const logger = loggerMock.create();
    mockCascadeLink.mockResolvedValueOnce({
      resolutionsCreated: 0,
      cascadeCount: 0,
      cycleBlocked: true,
    });
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(
        createFindGroupsResponse([
          {
            value: 'a@test.com',
            unresolved: [
              { id: 'user-1', namespace: 'okta' },
              { id: 'user-2', namespace: 'entra_id' },
            ],
            existingTargets: [],
          },
        ]) as any
      );

    const result = await runRules(createDeps(state, mockEsClient, { logger }));

    expect(result.rules.S1.lastRun?.skippedAmbiguousBuckets).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cycle blocked'));
  });

  it('should include single-value filter in Step 1 query', async () => {
    const state = createInitialState();
    mockEsClient.search.mockResolvedValueOnce(createCollectValuesResponse([], '') as any);

    await runRules(createDeps(state, mockEsClient));

    const step1Query = mockEsClient.search.mock.calls[0][0] as any;
    const scriptFilter = step1Query.query.bool.filter.find((f: any) =>
      f.script?.script?.source?.includes('size() == 1')
    );
    expect(scriptFilter).toBeDefined();
  });

  it('should include entity type scoping in both Step 1 and Step 2 queries', async () => {
    const state = createInitialState();
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(createFindGroupsResponse([]) as any);

    await runRules(createDeps(state, mockEsClient));

    const step1TypeFilter = mockEsClient.search.mock.calls[0][0] as any;
    expect(
      step1TypeFilter.query.bool.filter.find((f: any) => f.term?.['entity.EngineMetadata.Type'])
    ).toEqual({ term: { 'entity.EngineMetadata.Type': 'user' } });

    const step2TypeFilter = mockEsClient.search.mock.calls[1][0] as any;
    expect(
      step2TypeFilter.query.bool.filter.find((f: any) => f.term?.['entity.EngineMetadata.Type'])
    ).toEqual({ term: { 'entity.EngineMetadata.Type': 'user' } });
  });

  it('should advance S1 watermark on success', async () => {
    const state = createInitialState();
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T19:30:11.776Z') as any
      )
      .mockResolvedValueOnce(createFindGroupsResponse([]) as any);

    const result = await runRules(createDeps(state, mockEsClient));

    expect(result.rules.S1.lastProcessedTimestamp).toBe('2026-03-10T19:30:11.776Z');
  });

  it('should not advance S1 watermark when a bucket fails', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-03-09T00:00:00Z' });
    const logger = loggerMock.create();
    mockCascadeLink.mockRejectedValueOnce(new Error('transient ES failure'));
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(
        createFindGroupsResponse([
          {
            value: 'a@test.com',
            unresolved: [
              { id: 'user-1', namespace: 'okta' },
              { id: 'user-2', namespace: 'entra_id' },
            ],
            existingTargets: [],
          },
        ]) as any
      );

    const result = await runRules(createDeps(state, mockEsClient, { logger }));

    expect(result.rules.S1.lastProcessedTimestamp).toBe('2026-03-09T00:00:00Z');
    expect(result.rules.S1.lastRun?.resolutionsCreated).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to resolve bucket'));
  });

  it('should advance watermark when all buckets succeed', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-03-09T00:00:00Z' });
    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(
        createFindGroupsResponse([
          {
            value: 'a@test.com',
            unresolved: [
              { id: 'user-1', namespace: 'okta' },
              { id: 'user-2', namespace: 'entra_id' },
            ],
            existingTargets: [],
          },
        ]) as any
      );

    const result = await runRules(createDeps(state, mockEsClient));

    expect(result.rules.S1.lastProcessedTimestamp).toBe('2026-03-10T00:00:00Z');
  });

  it('should log warning when top_hits truncation occurs', async () => {
    const state = createInitialState();
    const logger = loggerMock.create();

    mockEsClient.search
      .mockResolvedValueOnce(
        createCollectValuesResponse(['a@test.com'], '2026-03-10T00:00:00Z') as any
      )
      .mockResolvedValueOnce(
        createFindGroupsResponse([
          {
            value: 'a@test.com',
            unresolved: [
              { id: 'user-1', namespace: 'okta' },
              { id: 'user-2', namespace: 'entra_id' },
            ],
            existingTargets: [],
            totalUnresolved: 150,
          },
        ]) as any
      );

    await runRules(createDeps(state, mockEsClient, { logger }));

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('150 unresolved entities but top_hits capped at')
    );
  });

  it('should not advance watermark when no new entities found', async () => {
    const originalTimestamp = '2026-03-09T00:00:00Z';
    const state = createInitialState({ lastProcessedTimestamp: originalTimestamp });
    mockEsClient.search.mockResolvedValueOnce(createCollectValuesResponse([], '') as any);

    const result = await runRules(createDeps(state, mockEsClient));

    expect(result.rules.S1.lastProcessedTimestamp).toBe(originalTimestamp);
  });

  it('should return current state unchanged when already aborted before run', async () => {
    const state = createInitialState({ lastProcessedTimestamp: '2026-03-09T00:00:00Z' });
    const abortCtrl = new AbortController();
    abortCtrl.abort();

    const result = await runRules(createDeps(state, mockEsClient, { abortController: abortCtrl }));

    expect(result.rules.S1.lastProcessedTimestamp).toBe('2026-03-09T00:00:00Z');
    expect(result.rules.S1.lastRun).toBeNull();
    expect(mockEsClient.search).toHaveBeenCalledTimes(0);
  });

  it('should paginate composite agg in Step 1', async () => {
    const state = createInitialState();

    mockEsClient.search
      .mockResolvedValueOnce({
        aggregations: {
          values: {
            buckets: [
              { key: { value: 'a@test.com' }, doc_count: 1 },
              { key: { value: 'b@test.com' }, doc_count: 1 },
            ],
            after_key: { value: 'b@test.com' },
          },
          max_timestamp: { value_as_string: '2026-03-10T00:00:00Z' },
        },
      } as any)
      .mockResolvedValueOnce({
        aggregations: {
          values: {
            buckets: [{ key: { value: 'c@test.com' }, doc_count: 1 }],
          },
          max_timestamp: { value_as_string: '2026-03-10T00:00:00Z' },
        },
      } as any)
      .mockResolvedValueOnce(createFindGroupsResponse([]) as any);

    const result = await runRules(createDeps(state, mockEsClient));

    expect(result.rules.S1.lastRun?.resolutionsCreated).toBe(0);
    expect(mockEsClient.search).toHaveBeenCalledTimes(3);
  });

  it('should skip disabled rules', async () => {
    const state = createInitialState();

    const result = await runRules(createDeps(state, mockEsClient, { enabledRules: [] }));

    expect(mockEsClient.search).not.toHaveBeenCalled();
    expect(result).toEqual(state);
  });

  describe('S2 — exclusionList and namespace filter', () => {
    it('should include namespace filter in Step 1 for S2', async () => {
      const S2_RULE = OOTB_RESOLUTION_RULES.find((r) => r.id === 'S2')!;
      const state = createInitialState();
      mockEsClient.search.mockResolvedValueOnce(createCollectValuesResponse([], '') as any);

      await runRules(createDeps(state, mockEsClient, { enabledRules: [S2_RULE] }));

      const step1Query = mockEsClient.search.mock.calls[0][0] as any;
      const nsFilter = step1Query.query.bool.filter.find((f: any) => f.terms?.['entity.namespace']);
      expect(nsFilter).toBeDefined();
      expect(nsFilter.terms['entity.namespace']).toContain('active_directory');
      expect(nsFilter.terms['entity.namespace']).toContain('system');
    });

    it('should include exclusionList as must_not filter for S2', async () => {
      const S2_RULE = OOTB_RESOLUTION_RULES.find((r) => r.id === 'S2')!;
      const state = createInitialState();
      mockEsClient.search.mockResolvedValueOnce(createCollectValuesResponse([], '') as any);

      await runRules(createDeps(state, mockEsClient, { enabledRules: [S2_RULE] }));

      const step1Query = mockEsClient.search.mock.calls[0][0] as any;
      const mustNotFilter = step1Query.query.bool.filter.find((f: any) => f.bool?.must_not?.terms);
      expect(mustNotFilter).toBeDefined();
      expect(mustNotFilter.bool.must_not.terms['user.id']).toContain('S-1-5-18');
    });
  });

  describe('S3 — matchPattern filtering', () => {
    it('should filter out non-GUID values before Step 2', async () => {
      const S3_RULE = OOTB_RESOLUTION_RULES.find((r) => r.id === 'S3')!;
      const state = createInitialState();

      const validGuid = '550e8400-e29b-41d4-a716-446655440000';
      const invalidValue = 'S-1-5-21-1234'; // SID, not GUID

      mockEsClient.search
        .mockResolvedValueOnce(
          createCollectValuesResponse([validGuid, invalidValue], '2026-03-10T00:00:00Z') as any
        )
        .mockResolvedValueOnce(createFindGroupsResponse([]) as any);

      await runRules(
        createDeps(state, mockEsClient, {
          enabledRules: [S3_RULE],
          state: {
            rules: {
              ...emptyRules,
              S3: { lastProcessedTimestamp: null, lastRun: null },
            },
          },
        })
      );

      // Step 2 query should only contain the valid GUID, not the SID
      const step2Query = mockEsClient.search.mock.calls[1][0] as any;
      const termsFilter = step2Query.query.bool.filter.find((f: any) => f.terms?.['user.id']);
      expect(termsFilter.terms['user.id']).toContain(validGuid);
      expect(termsFilter.terms['user.id']).not.toContain(invalidValue);
    });
  });
});

describe('selectTarget', () => {
  const PRIORITY = ['active_directory', 'okta', 'entra_id'];

  it('should prefer AD entity over Okta', () => {
    const entities: EntityHit[] = [
      { entityId: 'user-okta', namespace: 'okta' },
      { entityId: 'user-ad', namespace: 'active_directory' },
    ];
    expect(selectTarget(entities, PRIORITY).entityId).toBe('user-ad');
  });

  it('should prefer Okta over Entra', () => {
    const entities: EntityHit[] = [
      { entityId: 'user-entra', namespace: 'entra_id' },
      { entityId: 'user-okta', namespace: 'okta' },
    ];
    expect(selectTarget(entities, PRIORITY).entityId).toBe('user-okta');
  });

  it('should prefer Entra over unknown namespace', () => {
    const entities: EntityHit[] = [
      { entityId: 'user-github', namespace: 'github' },
      { entityId: 'user-entra', namespace: 'entra_id' },
    ];
    expect(selectTarget(entities, PRIORITY).entityId).toBe('user-entra');
  });

  it('should use alphabetical tiebreaker among same namespace', () => {
    const entities: EntityHit[] = [
      { entityId: 'z-user@okta', namespace: 'okta' },
      { entityId: 'a-user@okta', namespace: 'okta' },
    ];
    expect(selectTarget(entities, PRIORITY).entityId).toBe('a-user@okta');
  });

  it('should fall back to alphabetical first when no known namespace', () => {
    const entities: EntityHit[] = [
      { entityId: 'z-user@github', namespace: 'github' },
      { entityId: 'a-user@slack', namespace: 'slack' },
    ];
    expect(selectTarget(entities, PRIORITY).entityId).toBe('a-user@slack');
  });

  it('should use exact match — substring of a known namespace does not match', () => {
    const entities: EntityHit[] = [
      { entityId: 'user-1', namespace: 'not_okta' },
      { entityId: 'user-2', namespace: 'active_directory_custom' },
    ];
    expect(selectTarget(entities, PRIORITY).entityId).toBe('user-1');
  });
});
