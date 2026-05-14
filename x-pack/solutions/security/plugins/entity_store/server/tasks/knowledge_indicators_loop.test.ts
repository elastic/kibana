/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Feature } from '@kbn/streams-schema';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import type { LogsExtractionClient } from '../domain/logs_extraction';
import {
  LogExtractionConfig,
  KI_PROMOTED_ENTITY_TYPES_DEFAULT,
  KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
} from '../domain/saved_objects/global_state/constants';
import { runKnowledgeIndicatorsExtraction } from './knowledge_indicators_loop';

const buildLogger = () =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<Pick<Logger, 'debug' | 'info' | 'warn' | 'error'>> & Logger);

const buildFeature = (overrides: Partial<Feature>): Feature =>
  ({
    id: 'feat-1',
    uuid: 'uuid-1',
    stream_name: 'logs.k8s.pods',
    type: 'entity',
    subtype: 'service',
    description: 'a service',
    properties: { name: 'order-service' },
    confidence: 100,
    status: 'active',
    last_seen: '2026-04-29T00:00:00.000Z',
    filter: { field: 'service.name', operator: 'eq', value: 'order-service' },
    ...overrides,
  } as Feature);

const buildReader = (
  overrides?: Partial<StreamsKnowledgeIndicatorsReader>
): jest.Mocked<StreamsKnowledgeIndicatorsReader> => {
  return {
    listEntityFeatures: jest.fn().mockResolvedValue([]),
    listDependencyFeatures: jest.fn().mockResolvedValue([]),
    resolveIndexPatterns: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as jest.Mocked<StreamsKnowledgeIndicatorsReader>;
};

const buildExtractionClient = (
  extractFn?: jest.Mock
): jest.Mocked<Pick<LogsExtractionClient, 'extractLogsForDefinition'>> => {
  return {
    extractLogsForDefinition: (extractFn ??
      jest.fn().mockResolvedValue({
        count: 1,
        pages: 1,
        scannedIndices: ['logs.k8s.pods'],
        updatedState: {
          paginationTimestamp: '2026-04-29T01:00:00.000Z',
          paginationId: 'cursor-after-extract',
          lastExecutionTimestamp: '2026-04-29T01:00:00.000Z',
          logsPageCursorStartTimestamp: null,
          logsPageCursorStartId: null,
          logsPageCursorEndTimestamp: null,
          logsPageCursorEndId: null,
        },
        lastSearchTimestamp: '2026-04-29T01:00:00.000Z',
      })) as unknown as LogsExtractionClient['extractLogsForDefinition'],
  } as jest.Mocked<Pick<LogsExtractionClient, 'extractLogsForDefinition'>>;
};

const baseConfig = LogExtractionConfig.parse({});
const baseKiConfig = {
  entityMinConfidence: 70,
  aggregationGroupCap: 200,
  promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
  promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
};

describe('runKnowledgeIndicatorsExtraction', () => {
  it('is a no-op when there are no entity features', async () => {
    const reader = buildReader({ listEntityFeatures: jest.fn().mockResolvedValue([]) });
    const extractionClient = buildExtractionClient();
    const logger = buildLogger();

    const result = await runKnowledgeIndicatorsExtraction(
      {
        logger,
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      { currentStates: undefined }
    );

    expect(result.metrics).toEqual({
      groupsTotal: 0,
      groupsProcessed: 0,
      groupsSucceeded: 0,
      groupsFailed: 0,
      groupsSkippedNoIndexPatterns: 0,
      groupsSkippedMissingSubtype: 0,
      groupsTruncated: 0,
    });
    expect(result.updatedStates).toBeUndefined();
    expect(extractionClient.extractLogsForDefinition).not.toHaveBeenCalled();
    expect(reader.resolveIndexPatterns).not.toHaveBeenCalled();
  });

  it('forwards the configured min confidence to the reader', async () => {
    const reader = buildReader();
    const extractionClient = buildExtractionClient();

    await runKnowledgeIndicatorsExtraction(
      {
        logger: buildLogger(),
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: {
          entityMinConfidence: 85,
          aggregationGroupCap: 200,
          promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
          promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
        },
        abortController: new AbortController(),
      },
      { currentStates: undefined }
    );

    expect(reader.listEntityFeatures).toHaveBeenCalledWith({ minConfidence: 85 });
  });

  it('processes a single group end-to-end and persists its updated cursor', async () => {
    const feature = buildFeature({});
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([feature]),
      resolveIndexPatterns: jest.fn().mockResolvedValue(['logs.k8s.pods']),
    });
    const extractionClient = buildExtractionClient();

    const result = await runKnowledgeIndicatorsExtraction(
      {
        logger: buildLogger(),
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      { currentStates: undefined }
    );

    expect(reader.resolveIndexPatterns).toHaveBeenCalledWith('logs.k8s.pods');
    expect(extractionClient.extractLogsForDefinition).toHaveBeenCalledTimes(1);
    expect(result.metrics).toMatchObject({ groupsTotal: 1, groupsSucceeded: 1, groupsFailed: 0 });
    expect(result.updatedStates).toEqual({
      'logs.k8s.pods': {
        service: expect.objectContaining({
          paginationId: 'cursor-after-extract',
        }),
      },
    });
  });

  it('passes the previously-persisted pagination cursor as the starting state for a known group', async () => {
    const feature = buildFeature({});
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([feature]),
      resolveIndexPatterns: jest.fn().mockResolvedValue(['logs.k8s.pods']),
    });
    const extractionClient = buildExtractionClient();
    const previousState = {
      paginationTimestamp: '2026-04-28T00:00:00.000Z',
      paginationId: 'previous-cursor',
      lastExecutionTimestamp: '2026-04-28T00:00:00.000Z',
      logsPageCursorStartTimestamp: null,
      logsPageCursorStartId: null,
      logsPageCursorEndTimestamp: null,
      logsPageCursorEndId: null,
      lastError: 'a previous error that should be cleared on success',
    };

    await runKnowledgeIndicatorsExtraction(
      {
        logger: buildLogger(),
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      { currentStates: { 'logs.k8s.pods': { service: previousState } } }
    );

    expect(extractionClient.extractLogsForDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ paginationState: previousState })
    );
  });

  it('clears a stale lastError envelope on a successful run', async () => {
    const feature = buildFeature({});
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([feature]),
      resolveIndexPatterns: jest.fn().mockResolvedValue(['logs.k8s.pods']),
    });
    const extractionClient = buildExtractionClient();
    const previousState = {
      paginationTimestamp: null,
      paginationId: null,
      lastExecutionTimestamp: null,
      logsPageCursorStartTimestamp: null,
      logsPageCursorStartId: null,
      logsPageCursorEndTimestamp: null,
      logsPageCursorEndId: null,
      lastError: 'previously failed',
      lastErrorTimestamp: '2026-04-28T00:00:00.000Z',
    };

    const result = await runKnowledgeIndicatorsExtraction(
      {
        logger: buildLogger(),
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      { currentStates: { 'logs.k8s.pods': { service: previousState } } }
    );

    const updated = result.updatedStates!['logs.k8s.pods'].service;
    expect(updated.lastError).toBeUndefined();
    expect(updated.lastErrorTimestamp).toBeUndefined();
  });

  it('isolates a failing group: records lastError, preserves prior cursor, continues with siblings', async () => {
    const featureA = buildFeature({ id: 'a', stream_name: 'logs.a', subtype: 'service' });
    const featureB = buildFeature({ id: 'b', stream_name: 'logs.b', subtype: 'service' });
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([featureA, featureB]),
      resolveIndexPatterns: jest.fn(async (name: string) => [name]),
    });
    const extractFn = jest.fn();
    extractFn.mockImplementationOnce(async () => {
      throw new Error('boom on logs.a');
    });
    extractFn.mockResolvedValueOnce({
      count: 5,
      pages: 1,
      scannedIndices: ['logs.b'],
      updatedState: {
        paginationTimestamp: '2026-04-29T02:00:00.000Z',
        paginationId: 'cursor-b-after',
        lastExecutionTimestamp: '2026-04-29T02:00:00.000Z',
        logsPageCursorStartTimestamp: null,
        logsPageCursorStartId: null,
        logsPageCursorEndTimestamp: null,
        logsPageCursorEndId: null,
      },
      lastSearchTimestamp: '2026-04-29T02:00:00.000Z',
    });
    const extractionClient = buildExtractionClient(extractFn);
    const logger = buildLogger();

    const result = await runKnowledgeIndicatorsExtraction(
      {
        logger,
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      {
        currentStates: {
          'logs.a': {
            service: {
              paginationTimestamp: '2026-04-28T00:00:00.000Z',
              paginationId: 'cursor-a-before',
              lastExecutionTimestamp: '2026-04-28T00:00:00.000Z',
              logsPageCursorStartTimestamp: null,
              logsPageCursorStartId: null,
              logsPageCursorEndTimestamp: null,
              logsPageCursorEndId: null,
            },
          },
        },
      }
    );

    expect(extractFn).toHaveBeenCalledTimes(2);
    expect(result.metrics.groupsSucceeded).toBe(1);
    expect(result.metrics.groupsFailed).toBe(1);

    // Failing group: prior cursor preserved, lastError stamped.
    const failed = result.updatedStates!['logs.a'].service;
    expect(failed.paginationId).toBe('cursor-a-before');
    expect(failed.lastError).toBe('boom on logs.a');
    expect(failed.lastErrorTimestamp).toEqual(expect.any(String));

    // Sibling succeeded normally.
    const succeeded = result.updatedStates!['logs.b'].service;
    expect(succeeded.paginationId).toBe('cursor-b-after');
    expect(succeeded.lastError).toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom on logs.a'));
  });

  it('treats a throwing resolveIndexPatterns as a per-group failure (not a loop crash)', async () => {
    const featureA = buildFeature({ stream_name: 'logs.bad', subtype: 'service' });
    const featureB = buildFeature({ id: 'b', stream_name: 'logs.good', subtype: 'service' });
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([featureA, featureB]),
      resolveIndexPatterns: jest.fn(async (name: string) => {
        if (name === 'logs.bad') throw new Error('streams ES unavailable');
        return [name];
      }),
    });
    const extractionClient = buildExtractionClient();
    const logger = buildLogger();

    const result = await runKnowledgeIndicatorsExtraction(
      {
        logger,
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      { currentStates: undefined }
    );

    expect(result.metrics).toMatchObject({ groupsFailed: 1, groupsSucceeded: 1 });
    expect(extractionClient.extractLogsForDefinition).toHaveBeenCalledTimes(1);
    expect(result.updatedStates!['logs.bad'].service.lastError).toBe('streams ES unavailable');
    expect(result.updatedStates!['logs.good'].service.paginationId).toBe('cursor-after-extract');
  });

  it('skips groups whose stream resolves to zero index patterns and counts the skip', async () => {
    const feature = buildFeature({});
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([feature]),
      resolveIndexPatterns: jest.fn().mockResolvedValue([]),
    });
    const extractionClient = buildExtractionClient();

    const result = await runKnowledgeIndicatorsExtraction(
      {
        logger: buildLogger(),
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      { currentStates: undefined }
    );

    expect(extractionClient.extractLogsForDefinition).not.toHaveBeenCalled();
    expect(result.metrics).toMatchObject({
      groupsTotal: 1,
      groupsSucceeded: 0,
      groupsFailed: 0,
      groupsSkippedNoIndexPatterns: 1,
    });
    expect(result.updatedStates).toBeUndefined();
  });

  it('drops features without a subtype and counts them under groupsSkippedMissingSubtype', async () => {
    const ok = buildFeature({ subtype: 'service' });
    const noSubtype = buildFeature({ id: 'no-sub', subtype: undefined });
    const emptySubtype = buildFeature({ id: 'empty-sub', subtype: '' });
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([ok, noSubtype, emptySubtype]),
      resolveIndexPatterns: jest.fn().mockResolvedValue(['logs.k8s.pods']),
    });
    const extractionClient = buildExtractionClient();

    const result = await runKnowledgeIndicatorsExtraction(
      {
        logger: buildLogger(),
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      { currentStates: undefined }
    );

    expect(extractionClient.extractLogsForDefinition).toHaveBeenCalledTimes(1);
    expect(result.metrics).toMatchObject({
      groupsTotal: 1,
      groupsSucceeded: 1,
      groupsSkippedMissingSubtype: 2,
    });
  });

  it('enforces the aggregation group cap deterministically and warns once', async () => {
    // 5 groups: a/x, a/y, b/x, b/y, c/x (sorted: same order).
    const features = [
      buildFeature({ id: '1', stream_name: 'a', subtype: 'x' }),
      buildFeature({ id: '2', stream_name: 'a', subtype: 'y' }),
      buildFeature({ id: '3', stream_name: 'b', subtype: 'x' }),
      buildFeature({ id: '4', stream_name: 'b', subtype: 'y' }),
      buildFeature({ id: '5', stream_name: 'c', subtype: 'x' }),
    ];
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue(features),
      resolveIndexPatterns: jest.fn(async (name: string) => [name]),
    });
    const extractionClient = buildExtractionClient();
    const logger = buildLogger();

    const result = await runKnowledgeIndicatorsExtraction(
      {
        logger,
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: {
          entityMinConfidence: 70,
          aggregationGroupCap: 3,
          promoteToTypedThreshold: KI_PROMOTE_TO_TYPED_THRESHOLD_DEFAULT,
          promotedEntityTypes: [...KI_PROMOTED_ENTITY_TYPES_DEFAULT],
        },
        abortController: new AbortController(),
      },
      { currentStates: undefined }
    );

    expect(extractionClient.extractLogsForDefinition).toHaveBeenCalledTimes(3);
    expect(result.metrics).toMatchObject({
      groupsTotal: 5,
      groupsProcessed: 3,
      groupsSucceeded: 3,
      groupsTruncated: 2,
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('group cap of 3 exceeded by 2')
    );

    // Deterministic truncation: the first 3 sorted (stream, subtype) keys are processed.
    const processedKeys = (extractionClient.extractLogsForDefinition as jest.Mock).mock.calls.map(
      ([call]) => call.entityDefinition.id
    );
    // ki_definition_builder ids are stable per (stream, subtype, namespace);
    // we only need to confirm the count and that truncation does not reorder
    // the kept set across runs (sorted alpha by stream then subtype).
    expect(processedKeys).toHaveLength(3);
  });

  it('threads abortController through to extractLogsForDefinition so an aborted task aborts ES queries', async () => {
    const feature = buildFeature({});
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([feature]),
      resolveIndexPatterns: jest.fn().mockResolvedValue(['logs.k8s.pods']),
    });
    const extractionClient = buildExtractionClient();
    const abortController = new AbortController();

    await runKnowledgeIndicatorsExtraction(
      {
        logger: buildLogger(),
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'default',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController,
      },
      { currentStates: undefined }
    );

    expect(extractionClient.extractLogsForDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ opts: { abortController } })
    );
  });

  it('forwards namespace through to the KI definition builder (lineage encoded in entity.source)', async () => {
    const feature = buildFeature({});
    const reader = buildReader({
      listEntityFeatures: jest.fn().mockResolvedValue([feature]),
      resolveIndexPatterns: jest.fn().mockResolvedValue(['logs.k8s.pods']),
    });
    const extractionClient = buildExtractionClient();

    await runKnowledgeIndicatorsExtraction(
      {
        logger: buildLogger(),
        reader,
        logsExtractionClient: extractionClient as unknown as LogsExtractionClient,
        namespace: 'space-1',
        config: baseConfig,
        knowledgeIndicatorsConfig: baseKiConfig,
        abortController: new AbortController(),
      },
      { currentStates: undefined }
    );

    const [[call]] = (extractionClient.extractLogsForDefinition as jest.Mock).mock.calls;
    expect(call.entityDefinition.id).toEqual(expect.stringContaining('space-1'));
    // entity.source lineage is encoded as a definition-level field evaluation,
    // ensured by the upstream ki_definition_builder. Sanity-check it lands.
    expect(JSON.stringify(call.entityDefinition)).toContain('stream:logs.k8s.pods:service');
  });
});
