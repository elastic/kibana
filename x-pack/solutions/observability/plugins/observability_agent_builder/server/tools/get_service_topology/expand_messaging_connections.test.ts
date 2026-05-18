/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExitSpanSample } from '../../data_registry/data_registry_types';
import {
  expandMessagingConnections,
  MAX_MESSAGING_DEPS_TO_EXPAND,
} from './expand_messaging_connections';
import type { ConnectionWithKey } from './types';
import { makeExternalConnection } from './test_helpers';

jest.mock('./get_trace_ids_from_exit_spans', () => ({
  getTraceIdsFromExitSpansTargetingDependency: jest.fn(),
}));

import { getTraceIdsFromExitSpansTargetingDependency } from './get_trace_ids_from_exit_spans';

const mockGetTraceIds = getTraceIdsFromExitSpansTargetingDependency as jest.MockedFunction<
  typeof getTraceIdsFromExitSpansTargetingDependency
>;

function makeSpan(serviceName: string, resource: string, spanType: string): ExitSpanSample {
  return {
    serviceName,
    spanDestinationServiceResource: resource,
    spanType,
    spanSubtype: spanType === 'messaging' ? 'kafka' : 'http',
  };
}

const mockLogger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } as any;
const mockApmEventClient = {} as any;
const mockRequest = {} as any;

function createMockDataRegistry(spansPerCall: Array<ExitSpanSample[] | null>) {
  let callIndex = 0;
  return {
    getData: jest.fn(async () => {
      const result = spansPerCall[callIndex] ?? null;
      callIndex++;
      return result;
    }),
  } as any;
}

function callExpand({
  messagingDeps = ['kafka/orders'],
  existingConnections = [] as ConnectionWithKey[],
  dataRegistry = createMockDataRegistry([]),
} = {}) {
  return expandMessagingConnections({
    apmEventClient: mockApmEventClient,
    dataRegistry,
    request: mockRequest,
    logger: mockLogger,
    messagingDeps,
    existingConnections,
    startMs: 0,
    endMs: 1000,
  });
}

describe('expandMessagingConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when messagingDeps is empty', async () => {
    const result = await callExpand({ messagingDeps: [] });

    expect(result).toEqual([]);
    expect(mockGetTraceIds).not.toHaveBeenCalled();
  });

  it('returns empty array when no trace IDs found for the messaging dep', async () => {
    mockGetTraceIds.mockResolvedValue([]);

    const result = await callExpand();

    expect(result).toEqual([]);
    expect(mockGetTraceIds).toHaveBeenCalledWith(
      expect.objectContaining({ dependencyName: 'kafka/orders' })
    );
  });

  it('returns empty array when dataRegistry returns null spans', async () => {
    mockGetTraceIds.mockResolvedValue(['trace-1']);

    const result = await callExpand({ dataRegistry: createMockDataRegistry([null]) });

    expect(result).toEqual([]);
  });

  it('returns new connections targeting the messaging dependency', async () => {
    mockGetTraceIds.mockResolvedValue(['trace-1']);

    const result = await callExpand({
      dataRegistry: createMockDataRegistry([
        [
          makeSpan('checkout', 'kafka/orders', 'messaging'),
          makeSpan('checkout', 'postgres:5432', 'db'),
        ],
      ]),
    });

    expect(result).toHaveLength(1);
    expect(result[0]._sourceName).toBe('checkout');
    expect(result[0]._dependencyName).toBe('kafka/orders');
  });

  it('filters out connections already in existingConnections', async () => {
    mockGetTraceIds.mockResolvedValue(['trace-1']);

    const result = await callExpand({
      dataRegistry: createMockDataRegistry([[makeSpan('checkout', 'kafka/orders', 'messaging')]]),
      existingConnections: [
        makeExternalConnection('checkout', 'kafka/orders', 'messaging', 'kafka'),
      ],
    });

    expect(result).toEqual([]);
  });

  it(`caps expansion at ${MAX_MESSAGING_DEPS_TO_EXPAND} deps and logs a warning`, async () => {
    mockGetTraceIds.mockResolvedValue([]);
    const tooManyDeps = Array.from({ length: 8 }, (_, i) => `kafka/topic-${i}`);

    await callExpand({ messagingDeps: tooManyDeps });

    expect(mockGetTraceIds).toHaveBeenCalledTimes(MAX_MESSAGING_DEPS_TO_EXPAND);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`${MAX_MESSAGING_DEPS_TO_EXPAND} of 8`)
    );
  });

  it('only returns connections matching the target dep, not unrelated spans', async () => {
    mockGetTraceIds.mockResolvedValue(['trace-1']);

    const result = await callExpand({
      dataRegistry: createMockDataRegistry([
        [
          makeSpan('checkout', 'kafka/orders', 'messaging'),
          makeSpan('checkout', 'kafka/other-topic', 'messaging'),
          makeSpan('payment', 'stripe-api:443', 'external'),
        ],
      ]),
    });

    expect(result).toHaveLength(1);
    expect(result[0]._dependencyName).toBe('kafka/orders');
  });
});
