/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

import { registerStatusReportTask, getResolutionState } from './status_report_task';
import { createAssetManagerClient } from './factories';
import {
  ENTITY_STORE_METADATA_USAGE_EVENT,
  ENTITY_STORE_RESOLUTION_STATE_EVENT,
  ENTITY_STORE_USAGE_EVENT,
} from '../telemetry/events';
import { ENTITY_STORE_STATUS } from '../domain/constants';
import { getMetadataEntitiesDataStreamName } from '../domain/asset_manager/metadata_data_stream';
import { ALL_ENTITY_TYPES } from '../../common/domain/definitions/entity_schema';
import { getLatestEntitiesIndexName } from '../../common/domain/entity_index';
import type { EntityStoreCoreSetup } from '../types';

jest.mock('./factories');
// wrapTaskRun adds a tracing span around the run callback; here it just invokes it.
jest.mock('../telemetry/traces', () => ({
  wrapTaskRun: jest.fn(({ run }: { run: () => Promise<unknown> }) => run()),
}));

const createAssetManagerClientMock = createAssetManagerClient as jest.Mock;

const NAMESPACE = 'default';
const METADATA_INDEX = getMetadataEntitiesDataStreamName(NAMESPACE);
const LATEST_INDEX = getLatestEntitiesIndexName(NAMESPACE);

const makeSearchResponse = ({
  resolvedDocCount,
  resolutionGroupsValue,
  maxBucketValue,
}: {
  resolvedDocCount: number;
  resolutionGroupsValue: number;
  maxBucketValue: number | null;
}) => ({
  aggregations: {
    resolved_entities: { doc_count: resolvedDocCount },
    resolution_groups: { value: resolutionGroupsValue },
    max_group_aliases: { value: maxBucketValue },
  },
});

describe('getResolutionState', () => {
  const signal = new AbortController().signal;

  it('returns all zeros when no resolution groups exist', async () => {
    const search = jest
      .fn()
      .mockResolvedValue(
        makeSearchResponse({ resolvedDocCount: 0, resolutionGroupsValue: 0, maxBucketValue: null })
      );
    const esClient = { search } as unknown as ElasticsearchClient;

    const result = await getResolutionState(esClient, 'test-index', 'user', signal);

    expect(result).toEqual({
      resolvedEntities: 0,
      targetEntities: 0,
      resolutionGroups: 0,
      maxGroupSize: 0,
    });
  });

  it('returns correct values for a mixed resolution state', async () => {
    const search = jest
      .fn()
      .mockResolvedValue(
        makeSearchResponse({ resolvedDocCount: 8, resolutionGroupsValue: 3, maxBucketValue: 4 })
      );
    const esClient = { search } as unknown as ElasticsearchClient;

    const result = await getResolutionState(esClient, 'test-index', 'host', signal);

    expect(result).toEqual({
      resolvedEntities: 8,
      targetEntities: 3,
      resolutionGroups: 3,
      maxGroupSize: 5, // 4 aliases + 1 target
    });
  });

  it('coalesces null max_bucket value to 0 when resolution groups exist', async () => {
    const search = jest
      .fn()
      .mockResolvedValue(
        makeSearchResponse({ resolvedDocCount: 5, resolutionGroupsValue: 2, maxBucketValue: null })
      );
    const esClient = { search } as unknown as ElasticsearchClient;

    const result = await getResolutionState(esClient, 'test-index', 'service', signal);

    expect(result).toEqual({
      resolvedEntities: 5,
      targetEntities: 2,
      resolutionGroups: 2,
      maxGroupSize: 1, // (null ?? 0) + 1 = 1
    });
  });

  it('passes the abort signal to the ES search call', async () => {
    const search = jest
      .fn()
      .mockResolvedValue(
        makeSearchResponse({ resolvedDocCount: 0, resolutionGroupsValue: 0, maxBucketValue: null })
      );
    const esClient = { search } as unknown as ElasticsearchClient;
    const abortController = new AbortController();

    await getResolutionState(esClient, 'my-index', 'generic', abortController.signal);

    expect(search).toHaveBeenCalledWith(expect.any(Object), {
      signal: abortController.signal,
    });
  });

  it('queries the given index, scopes to the entity type, and requests the aggregations it parses', async () => {
    const search = jest
      .fn()
      .mockResolvedValue(
        makeSearchResponse({ resolvedDocCount: 0, resolutionGroupsValue: 0, maxBucketValue: null })
      );
    const esClient = { search } as unknown as ElasticsearchClient;

    await getResolutionState(esClient, 'my-index', 'host', signal);

    // Guards against an aggregation-key rename in the query drifting from the
    // keys the response parser reads (resolved_entities / resolution_groups / max_group_aliases).
    const [searchParams] = search.mock.calls[0];
    expect(searchParams.index).toBe('my-index');
    expect(searchParams.query).toEqual({ term: { 'entity.EngineMetadata.Type': 'host' } });
    expect(Object.keys(searchParams.aggs)).toEqual(
      expect.arrayContaining([
        'resolved_entities',
        'resolution_groups',
        'group_sizes',
        'max_group_aliases',
      ])
    );
  });
});

describe('status report task — usage, resolution state & metadata telemetry', () => {
  let logger: MockedLogger;
  let reportEvent: jest.Mock;
  let count: jest.Mock;
  let search: jest.Mock;
  let getStatus: jest.Mock;

  // Drives the task the way task-manager does: register, grab the definition,
  // build the runner and run it once.
  const runStatusReportTask = async () => {
    const taskManager = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as TaskManagerSetupContract;
    const core = { analytics: { reportEvent } } as unknown as EntityStoreCoreSetup;

    registerStatusReportTask({ taskManager, logger, core });

    const [definitions] = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls[0];
    const [taskType] = Object.keys(definitions);
    const runner = definitions[taskType].createTaskRunner({
      taskInstance: { id: `status:${NAMESPACE}`, state: { namespace: NAMESPACE } },
      fakeRequest: {},
      abortController: new AbortController(),
    });
    return runner.run();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    reportEvent = jest.fn();
    getStatus = jest.fn().mockResolvedValue({ status: ENTITY_STORE_STATUS.NOT_INSTALLED });
    // Store-usage counts carry a `query`; the metadata-datastream count does not.
    count = jest.fn(async (params: { query?: unknown }) =>
      params.query ? { count: 5 } : { count: 42 }
    );
    // Default resolution state: 3 resolved entities in 1 group, max bucket = 2 aliases
    search = jest
      .fn()
      .mockResolvedValue(
        makeSearchResponse({ resolvedDocCount: 3, resolutionGroupsValue: 1, maxBucketValue: 2 })
      );

    createAssetManagerClientMock.mockResolvedValue({
      assetManagerClient: { getStatus },
      esClient: { count, search } as unknown as ElasticsearchClient,
    });
  });

  it('reports the metadata datastream doc count when the datastream exists', async () => {
    await runStatusReportTask();

    expect(reportEvent).toHaveBeenCalledWith(ENTITY_STORE_METADATA_USAGE_EVENT.eventType, {
      namespace: NAMESPACE,
      docCount: 42,
    });
  });

  it('counts the namespace-scoped metadata datastream with the abort signal', async () => {
    await runStatusReportTask();

    const metadataCountCall = count.mock.calls.find(([params]) => !params.query);
    expect(metadataCountCall).toBeDefined();
    expect(metadataCountCall![0]).toEqual({ index: METADATA_INDEX });
    expect(metadataCountCall![1]).toEqual({ signal: expect.any(AbortSignal) });
  });

  it('does not report metadata usage and does not throw when the datastream is absent (v2 FF off)', async () => {
    count.mockImplementation(async (params: { query?: unknown }) => {
      if (params.query) return { count: 5 };
      throw new Error('index_not_found_exception');
    });

    await expect(runStatusReportTask()).resolves.toEqual({ state: { namespace: NAMESPACE } });

    const reportedMetadata = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_METADATA_USAGE_EVENT.eventType
    );
    expect(reportedMetadata).toBe(false);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Metadata datastream not present')
    );
  });

  it('fires one resolution state event per entity type with correctly computed payload', async () => {
    // storeSize = 5 (from count mock), resolvedEntities=3, targetEntities=1, resolutionGroups=1
    // standaloneEntities = max(0, 5 - 3 - 1) = 1
    // avgGroupSize = 3/1 + 1 = 4
    // maxGroupSize = 2 + 1 = 3
    await runStatusReportTask();

    const resolutionStateCalls = reportEvent.mock.calls.filter(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    );

    // Exactly one event per entity type, covering every type — a skipped or
    // duplicated type would change the count or the set of entityType values.
    expect(resolutionStateCalls).toHaveLength(ALL_ENTITY_TYPES.length);
    const reportedTypes = resolutionStateCalls.map(([, payload]) => payload.entityType);
    expect(new Set(reportedTypes)).toEqual(new Set(ALL_ENTITY_TYPES));

    resolutionStateCalls.forEach(([, payload]) => {
      expect(payload).toMatchObject({
        namespace: NAMESPACE,
        totalEntities: 5,
        resolvedEntities: 3,
        targetEntities: 1,
        standaloneEntities: 1,
        resolutionGroups: 1,
        avgGroupSize: 4,
        maxGroupSize: 3,
      });
    });
  });

  it('reports zeros for the no-resolution case and treats all entities as standalone', async () => {
    // storeSize = 5, no resolution groups → standaloneEntities = totalEntities, avgGroupSize = 0
    search.mockResolvedValue(
      makeSearchResponse({ resolvedDocCount: 0, resolutionGroupsValue: 0, maxBucketValue: null })
    );

    await runStatusReportTask();

    const [, payload] = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    )!;

    expect(payload).toMatchObject({
      totalEntities: 5,
      resolvedEntities: 0,
      targetEntities: 0,
      standaloneEntities: 5,
      resolutionGroups: 0,
      avgGroupSize: 0,
      maxGroupSize: 0,
    });
  });

  it('reports a fractional avgGroupSize when the average is non-integer', async () => {
    // resolvedEntities=5 across resolutionGroups=2 → avgGroupSize = 5/2 + 1 = 3.5 (float field)
    search.mockResolvedValue(
      makeSearchResponse({ resolvedDocCount: 5, resolutionGroupsValue: 2, maxBucketValue: 3 })
    );

    await runStatusReportTask();

    const [, payload] = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    )!;

    expect(payload.avgGroupSize).toBe(3.5);
  });

  it('collects the error, does not report resolution state, and rethrows when the aggregation fails', async () => {
    search.mockRejectedValue(new Error('boom'));

    await expect(runStatusReportTask()).rejects.toThrow('boom');

    const reportedResolutionState = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    );
    expect(reportedResolutionState).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reporting store usage for')
    );
  });

  it('clamps standaloneEntities to 0 when arithmetic would go negative', async () => {
    // storeSize = 5, resolvedEntities=4, targetEntities=3 → 5 - 4 - 3 = -2 → clamped to 0
    search.mockResolvedValue(
      makeSearchResponse({ resolvedDocCount: 4, resolutionGroupsValue: 3, maxBucketValue: 1 })
    );

    await runStatusReportTask();

    const [, payload] = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    )!;

    expect(payload.standaloneEntities).toBe(0);
  });

  it('queries the latest entities index for both the store size and the resolution state', async () => {
    await runStatusReportTask();

    const storeSizeCountCalls = count.mock.calls.filter(([params]) => params.query);
    expect(storeSizeCountCalls).toHaveLength(ALL_ENTITY_TYPES.length);
    storeSizeCountCalls.forEach(([params]) => {
      expect(params.index).toBe(LATEST_INDEX);
    });

    expect(search).toHaveBeenCalledTimes(ALL_ENTITY_TYPES.length);
    search.mock.calls.forEach(([params]) => {
      expect(params.index).toBe(LATEST_INDEX);
    });
  });

  it('collects the error and reports neither usage nor resolution state when the store-size count fails', async () => {
    // Store-size counts carry a `query`; fail those while leaving the metadata count intact.
    count.mockImplementation(async (params: { query?: unknown }) => {
      if (params.query) throw new Error('count_boom');
      return { count: 42 };
    });

    await expect(runStatusReportTask()).rejects.toThrow('count_boom');

    const usageReported = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_USAGE_EVENT.eventType
    );
    const resolutionReported = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    );
    expect(usageReported).toBe(false);
    expect(resolutionReported).toBe(false);
    // getResolutionState is never reached when getStoreSize throws first.
    expect(search).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reporting store usage for')
    );
  });

  it('isolates failures per entity type — a failure for one type still reports the others', async () => {
    const [failingType] = ALL_ENTITY_TYPES;
    search.mockImplementation(async (params: { query: { term: Record<string, unknown> } }) => {
      const requestedType = params.query.term['entity.EngineMetadata.Type'];
      if (requestedType === failingType) throw new Error('boom');
      return makeSearchResponse({
        resolvedDocCount: 3,
        resolutionGroupsValue: 1,
        maxBucketValue: 2,
      });
    });

    await expect(runStatusReportTask()).rejects.toThrow('boom');

    const resolutionStateTypes = reportEvent.mock.calls
      .filter(([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType)
      .map(([, payload]) => payload.entityType);

    // The failing type is skipped; every other type still emits its event.
    expect(resolutionStateTypes).not.toContain(failingType);
    expect(new Set(resolutionStateTypes)).toEqual(
      new Set(ALL_ENTITY_TYPES.filter((type) => type !== failingType))
    );
    // Usage events are unaffected — they fire before the resolution search for every type.
    const usageTypes = reportEvent.mock.calls
      .filter(([eventType]) => eventType === ENTITY_STORE_USAGE_EVENT.eventType)
      .map(([, payload]) => payload.entityType);
    expect(new Set(usageTypes)).toEqual(new Set(ALL_ENTITY_TYPES));
  });
});
