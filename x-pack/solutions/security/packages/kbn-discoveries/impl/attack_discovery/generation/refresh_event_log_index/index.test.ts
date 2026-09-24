/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';

import { refreshEventLogIndex } from '.';

describe('refreshEventLogIndex', () => {
  it('refreshes the event log index', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);

    const coreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: {
                refresh,
              },
            },
          }),
        },
      },
    } as unknown as CoreStart;

    await refreshEventLogIndex({
      coreStart,
      eventLogIndex: '.kibana-event-log-test',
      logger: {
        error: jest.fn(),
        info: jest.fn(),
      } as unknown as Logger,
      request: {} as KibanaRequest,
    });

    expect(refresh).toHaveBeenCalledWith({
      allow_no_indices: true,
      ignore_unavailable: true,
      index: '.kibana-event-log-test',
    });
  });

  it('uses the provided esClient instead of creating one from request', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const preAuthenticatedEsClient = {
      indices: { refresh },
    };

    const asScopedMock = jest.fn();
    const coreStart = {
      elasticsearch: {
        client: {
          asScoped: asScopedMock,
        },
      },
    } as unknown as CoreStart;

    await refreshEventLogIndex({
      coreStart,
      esClient: preAuthenticatedEsClient as unknown as Parameters<
        typeof refreshEventLogIndex
      >[0]['esClient'],
      eventLogIndex: '.kibana-event-log-test',
      logger: {
        error: jest.fn(),
        info: jest.fn(),
      } as unknown as Logger,
      request: {} as KibanaRequest,
    });

    expect(refresh).toHaveBeenCalledWith({
      allow_no_indices: true,
      ignore_unavailable: true,
      index: '.kibana-event-log-test',
    });

    // coreStart.elasticsearch.client.asScoped should NOT have been called
    expect(asScopedMock).not.toHaveBeenCalled();
  });

  it('logs an error when refreshing fails', async () => {
    const loggerError = jest.fn();

    const coreStart = {
      elasticsearch: {
        client: {
          asScoped: () => ({
            asCurrentUser: {
              indices: {
                refresh: jest.fn().mockRejectedValue(new Error('nope')),
              },
            },
          }),
        },
      },
    } as unknown as CoreStart;

    await refreshEventLogIndex({
      coreStart,
      eventLogIndex: '.kibana-event-log-test',
      logger: {
        error: loggerError,
        info: jest.fn(),
      } as unknown as Logger,
      request: {} as KibanaRequest,
    });

    expect(loggerError).toHaveBeenCalledWith('Failed to refresh event log index: nope');
  });
});
