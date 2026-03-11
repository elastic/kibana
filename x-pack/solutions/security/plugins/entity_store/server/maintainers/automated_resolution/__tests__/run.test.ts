/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ResolutionClient } from '../../../domain/resolution/resolution_client';
import type { EntityMaintainerStatus } from '../../../tasks/entity_maintainers/types';
import type { AutomatedResolutionState } from '../types';
import { runAutomatedResolution, selectTarget } from '../run';

const createMockStatus = (
  stateOverrides: Partial<AutomatedResolutionState> = {}
): EntityMaintainerStatus => ({
  metadata: {
    namespace: 'default',
    runs: 1,
    lastSuccessTimestamp: null,
    lastErrorTimestamp: null,
  },
  state: {
    lastProcessedTimestamp: null,
    totalResolutionsCreated: 0,
    lastRun: null,
    ...stateOverrides,
  },
  taskStatus: 'started',
});

const createMockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  get: jest.fn().mockReturnThis(),
  isLevelEnabled: jest.fn().mockReturnValue(true),
});

// Step 1 response: composite agg with email values
const createStep1Response = ({
  emails,
  maxTimestamp = '2024-01-15T00:00:00.000Z',
  afterKey,
}: {
  emails: string[];
  maxTimestamp?: string;
  afterKey?: { email: string };
}) => ({
  hits: { total: { value: 0, relation: 'eq' as const }, hits: [] },
  aggregations: {
    email_values: {
      buckets: emails.map((email) => ({ key: { email } })),
      ...(afterKey ? { after_key: afterKey } : {}),
    },
    max_timestamp: { value_as_string: maxTimestamp },
  },
});

// Step 1 empty response (no new entities)
const createEmptyStep1Response = () => ({
  hits: { total: { value: 0, relation: 'eq' as const }, hits: [] },
  aggregations: {
    email_values: { buckets: [] },
    max_timestamp: { value_as_string: null },
  },
});

// Step 2 response: match groups with unresolved entities and existing targets
const createStep2Response = (
  groups: Array<{
    email: string;
    unresolved: Array<{ id: string; source: string }>;
    existingTargetIds?: string[];
  }>
) => ({
  hits: { total: { value: 0, relation: 'eq' as const }, hits: [] },
  aggregations: {
    match_groups: {
      buckets: groups.map((g) => ({
        key: g.email,
        unresolved: {
          entities: {
            hits: {
              hits: g.unresolved.map((e) => ({
                _source: { 'entity.id': e.id, 'entity.source': e.source },
              })),
            },
          },
        },
        existing_targets: {
          resolved_to_values: {
            buckets: (g.existingTargetIds ?? []).map((id) => ({ key: id })),
          },
        },
      })),
    },
  },
});

describe('runAutomatedResolution', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockResolutionClient: jest.Mocked<Pick<ResolutionClient, 'linkEntities'>>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockAbortController: AbortController;

  beforeEach(() => {
    mockEsClient = { search: jest.fn() } as unknown as jest.Mocked<ElasticsearchClient>;
    mockResolutionClient = {
      linkEntities: jest.fn().mockResolvedValue({ linked: [], skipped: [], target_id: '' }),
    };
    mockLogger = createMockLogger();
    mockAbortController = new AbortController();
  });

  const run = (stateOverrides: Partial<AutomatedResolutionState> = {}) =>
    runAutomatedResolution({
      status: createMockStatus(stateOverrides),
      esClient: mockEsClient,
      resolutionClient: mockResolutionClient as unknown as ResolutionClient,
      logger: mockLogger as any,
      abortController: mockAbortController,
    });

  describe('Step 1 — collect email values', () => {
    it('should do a full scan when watermark is null', async () => {
      mockEsClient.search.mockResolvedValueOnce(createEmptyStep1Response() as any);

      await run();

      const searchCall = mockEsClient.search.mock.calls[0][0] as any;
      const filters = searchCall.query.bool.filter;
      const hasRangeFilter = filters.some((f: any) => f.range && f.range['@timestamp']);
      expect(hasRangeFilter).toBe(false);
    });

    it('should use watermark for incremental scan', async () => {
      mockEsClient.search.mockResolvedValueOnce(createEmptyStep1Response() as any);

      await run({ lastProcessedTimestamp: '2024-01-10T00:00:00.000Z' });

      const searchCall = mockEsClient.search.mock.calls[0][0] as any;
      const filters = searchCall.query.bool.filter;
      const rangeFilter = filters.find((f: any) => f.range && f.range['@timestamp']);
      expect(rangeFilter).toEqual({
        range: { '@timestamp': { gt: '2024-01-10T00:00:00.000Z' } },
      });
    });

    it('should include single-value filter in Step 1 query', async () => {
      mockEsClient.search.mockResolvedValueOnce(createEmptyStep1Response() as any);

      await run();

      const searchCall = mockEsClient.search.mock.calls[0][0] as any;
      const filters = searchCall.query.bool.filter;
      const scriptFilter = filters.find((f: any) => f.script);
      expect(scriptFilter.script.script.source).toBe("doc['user.email'].size() == 1");
    });

    it('should include entity type scoping in Step 1 query', async () => {
      mockEsClient.search.mockResolvedValueOnce(createEmptyStep1Response() as any);

      await run();

      const searchCall = mockEsClient.search.mock.calls[0][0] as any;
      const filters = searchCall.query.bool.filter;
      const termFilter = filters.find((f: any) => f.term && f.term['entity.EngineMetadata.Type']);
      expect(termFilter.term['entity.EngineMetadata.Type']).toBe('user');
    });

    it('should use composite aggregation for Step 1', async () => {
      mockEsClient.search.mockResolvedValueOnce(createEmptyStep1Response() as any);

      await run();

      const searchCall = mockEsClient.search.mock.calls[0][0] as any;
      expect(searchCall.aggs.email_values.composite).toBeDefined();
      expect(searchCall.aggs.email_values.composite.sources).toEqual([
        { email: { terms: { field: 'user.email' } } },
      ]);
    });

    it('should paginate composite agg using after cursor', async () => {
      // First page returns after_key, second page returns no after_key
      mockEsClient.search
        .mockResolvedValueOnce(
          createStep1Response({
            emails: ['a@test.com', 'b@test.com'],
            afterKey: { email: 'b@test.com' },
          }) as any
        )
        .mockResolvedValueOnce(createStep1Response({ emails: ['c@test.com'] }) as any)
        // Step 2 - no matching groups
        .mockResolvedValueOnce(createStep2Response([]) as any);

      const result = await run();

      // Should have made 2 Step 1 calls + 1 Step 2 call
      expect(mockEsClient.search).toHaveBeenCalledTimes(3);

      // Second Step 1 call should have after key
      const secondCall = mockEsClient.search.mock.calls[1][0] as any;
      expect(secondCall.aggs.email_values.composite.after).toEqual({
        email: 'b@test.com',
      });

      expect((result as AutomatedResolutionState).lastRun?.newValuesScanned).toBe(3);
    });
  });

  describe('Step 2 — find matching groups', () => {
    it('should include single-value filter in Step 2 query', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(createStep1Response({ emails: ['a@test.com'] }) as any)
        .mockResolvedValueOnce(createStep2Response([]) as any);

      await run();

      const step2Call = mockEsClient.search.mock.calls[1][0] as any;
      const filters = step2Call.query.bool.filter;
      const scriptFilter = filters.find((f: any) => f.script);
      expect(scriptFilter.script.script.source).toBe("doc['user.email'].size() == 1");
    });

    it('should include entity type scoping in Step 2 query', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(createStep1Response({ emails: ['a@test.com'] }) as any)
        .mockResolvedValueOnce(createStep2Response([]) as any);

      await run();

      const step2Call = mockEsClient.search.mock.calls[1][0] as any;
      const filters = step2Call.query.bool.filter;
      const termFilter = filters.find((f: any) => f.term && f.term['entity.EngineMetadata.Type']);
      expect(termFilter.term['entity.EngineMetadata.Type']).toBe('user');
    });
  });

  describe('early return', () => {
    it('should return current state when no new entities found', async () => {
      mockEsClient.search.mockResolvedValueOnce(createEmptyStep1Response() as any);

      const result = (await run({
        totalResolutionsCreated: 5,
      })) as AutomatedResolutionState;

      expect(result.totalResolutionsCreated).toBe(5);
      expect(result.lastRun?.newValuesScanned).toBe(0);
      expect(result.lastRun?.resolutionsCreated).toBe(0);
      expect(mockResolutionClient.linkEntities).not.toHaveBeenCalled();
    });
  });

  describe('Step 3 — resolve', () => {
    it('should create a new group when 2+ unresolved entities share email', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(createStep1Response({ emails: ['shared@test.com'] }) as any)
        .mockResolvedValueOnce(
          createStep2Response([
            {
              email: 'shared@test.com',
              unresolved: [
                { id: 'user-okta', source: 'logs-entityanalytics_okta.user-default' },
                { id: 'user-entra', source: 'logs-entityanalytics_entra_id.user-default' },
              ],
            },
          ]) as any
        );

      mockResolutionClient.linkEntities.mockResolvedValueOnce({
        linked: ['user-entra'],
        skipped: [],
        target_id: 'user-okta',
      });

      const result = (await run()) as AutomatedResolutionState;

      expect(mockResolutionClient.linkEntities).toHaveBeenCalledWith('user-okta', ['user-entra']);
      expect(result.lastRun?.resolutionsCreated).toBe(1);
    });

    it('should extend existing group when 1 existing target', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(createStep1Response({ emails: ['shared@test.com'] }) as any)
        .mockResolvedValueOnce(
          createStep2Response([
            {
              email: 'shared@test.com',
              unresolved: [{ id: 'user-new', source: 'logs-okta.system-default' }],
              existingTargetIds: ['user-existing-target'],
            },
          ]) as any
        );

      mockResolutionClient.linkEntities.mockResolvedValueOnce({
        linked: ['user-new'],
        skipped: [],
        target_id: 'user-existing-target',
      });

      await run();

      expect(mockResolutionClient.linkEntities).toHaveBeenCalledWith('user-existing-target', [
        'user-new',
      ]);
    });

    it('should skip ambiguous buckets with multiple existing targets', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(createStep1Response({ emails: ['shared@test.com'] }) as any)
        .mockResolvedValueOnce(
          createStep2Response([
            {
              email: 'shared@test.com',
              unresolved: [{ id: 'user-new', source: 'logs-okta.system-default' }],
              existingTargetIds: ['target-1', 'target-2'],
            },
          ]) as any
        );

      const result = (await run()) as AutomatedResolutionState;

      expect(mockResolutionClient.linkEntities).not.toHaveBeenCalled();
      expect(result.lastRun?.skippedAmbiguousBuckets).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('2 existing targets'));
    });

    it('should skip group and continue on linkEntities error', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(createStep1Response({ emails: ['a@test.com', 'b@test.com'] }) as any)
        .mockResolvedValueOnce(
          createStep2Response([
            {
              email: 'a@test.com',
              unresolved: [
                { id: 'user-1', source: 'logs-entityanalytics_ad.user-default' },
                { id: 'user-2', source: 'logs-entityanalytics_okta.user-default' },
              ],
            },
            {
              email: 'b@test.com',
              unresolved: [
                { id: 'user-3', source: 'logs-entityanalytics_ad.user-default' },
                { id: 'user-4', source: 'logs-entityanalytics_okta.user-default' },
              ],
            },
          ]) as any
        );

      // First group fails, second succeeds
      mockResolutionClient.linkEntities
        .mockRejectedValueOnce(new Error('ChainResolutionError: user-2 is already resolved'))
        .mockResolvedValueOnce({
          linked: ['user-4'],
          skipped: [],
          target_id: 'user-3',
        });

      const result = (await run()) as AutomatedResolutionState;

      expect(mockResolutionClient.linkEntities).toHaveBeenCalledTimes(2);
      expect(result.lastRun?.resolutionsCreated).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to link group'));
    });
  });

  describe('Step 4 — update state', () => {
    it('should advance watermark on success', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(
          createStep1Response({
            emails: ['a@test.com'],
            maxTimestamp: '2024-01-15T12:00:00.000Z',
          }) as any
        )
        .mockResolvedValueOnce(createStep2Response([]) as any);

      const result = (await run()) as AutomatedResolutionState;

      expect(result.lastProcessedTimestamp).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should accumulate totalResolutionsCreated', async () => {
      mockEsClient.search
        .mockResolvedValueOnce(createStep1Response({ emails: ['a@test.com'] }) as any)
        .mockResolvedValueOnce(
          createStep2Response([
            {
              email: 'a@test.com',
              unresolved: [
                { id: 'user-1', source: 'logs-entityanalytics_ad.user-default' },
                { id: 'user-2', source: 'logs-entityanalytics_okta.user-default' },
              ],
            },
          ]) as any
        );

      mockResolutionClient.linkEntities.mockResolvedValueOnce({
        linked: ['user-2'],
        skipped: [],
        target_id: 'user-1',
      });

      const result = (await run({ totalResolutionsCreated: 10 })) as AutomatedResolutionState;

      expect(result.totalResolutionsCreated).toBe(11);
    });
  });
});

describe('selectTarget', () => {
  it('should prefer AD over Okta', () => {
    const result = selectTarget([
      { id: 'user-okta', source: 'logs-entityanalytics_okta.user-default' },
      { id: 'user-ad', source: 'logs-entityanalytics_ad.user-default' },
    ]);
    expect(result).toBe('user-ad');
  });

  it('should prefer Okta entity analytics over Okta logs', () => {
    const result = selectTarget([
      { id: 'user-okta-logs', source: 'logs-okta.system-default' },
      { id: 'user-okta-ea', source: 'logs-entityanalytics_okta.user-default' },
    ]);
    expect(result).toBe('user-okta-ea');
  });

  it('should prefer Okta logs over Entra', () => {
    const result = selectTarget([
      { id: 'user-entra', source: 'logs-entityanalytics_entra_id.user-default' },
      { id: 'user-okta', source: 'logs-okta.system-default' },
    ]);
    expect(result).toBe('user-okta');
  });

  it('should prefer Entra over Azure', () => {
    const result = selectTarget([
      { id: 'user-azure', source: 'logs-azure.signinlogs-default' },
      { id: 'user-entra', source: 'logs-entityanalytics_entra_id.user-default' },
    ]);
    expect(result).toBe('user-entra');
  });

  it('should use alphabetical tiebreaker within same source tier', () => {
    const result = selectTarget([
      { id: 'user-z', source: 'logs-entityanalytics_ad.user-default' },
      { id: 'user-a', source: 'logs-entityanalytics_ad.user-default' },
    ]);
    expect(result).toBe('user-a');
  });

  it('should fall back to alphabetical when no known source', () => {
    const result = selectTarget([
      { id: 'user-github-z', source: 'logs-github.audit-default' },
      { id: 'user-slack-a', source: 'logs-slack.audit-default' },
    ]);
    expect(result).toBe('user-github-z');
  });
});
