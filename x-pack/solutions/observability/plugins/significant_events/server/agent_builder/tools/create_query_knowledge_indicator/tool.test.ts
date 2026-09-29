/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../routes/types';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import {
  createQueryKnowledgeIndicatorTool,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID,
} from './tool';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';

vi.mock('../../../routes/utils/assert_significant_events_access', () => {
  const mocked = {
    assertSignificantEventsAccess: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('ki_query_create tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = {} as unknown as SignificantEventsServer;
  const request = {} as unknown as KibanaRequest;
  const uiSettings = {} as unknown as IUiSettingsClient;
  const telemetry = {
    trackAgentBuilderKnowledgeIndicatorCreated: vi.fn(),
  } as unknown as EbtTelemetryClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the expected tool id', () => {
    const getScopedClients = vi.fn() as unknown as MockedFunction<GetScopedClients>;
    const tool = createQueryKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID);
    expect(tool.id).toBe('platform.sig_events.ki_query_create');
  });

  it('uses always confirmation policy with custom prompt', async () => {
    const getScopedClients = vi.fn() as unknown as MockedFunction<GetScopedClients>;
    const tool = createQueryKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    expect(tool.confirmation?.askUser).toBe('always');

    const confirmation = await tool.confirmation?.getConfirmation?.({
      toolParams: {
        stream_name: 'logs.test',
        title: 'Checkout 5xx burst detector',
        description: 'Detects 5xx bursts',
        esql: {
          query: 'FROM logs.test, logs.test.* | WHERE http.response.status_code >= 500',
        },
      },
      context: createMockToolContext(),
    });

    expect(confirmation).toEqual(
      expect.objectContaining({
        title: 'Save Query KI',
        confirm_text: 'Save',
        cancel_text: 'Cancel',
      })
    );
    expect(confirmation?.message).toContain('stream "logs.test"');
    expect(confirmation?.message).toContain('title: "Checkout 5xx burst detector"');
    expect(confirmation?.message).toContain(
      'esql: "FROM logs.test, logs.test.* | WHERE http.response.status_code >= 500"'
    );
  });

  it('availability returns available when access check succeeds', async () => {
    (assertSignificantEventsAccess as Mock).mockResolvedValueOnce(undefined);

    const getScopedClients = vi.fn(async () => {
      return { licensing: {}, uiSettingsClient: {} } as unknown as RouteHandlerScopedClients;
    }) as unknown as MockedFunction<GetScopedClients>;

    const tool = createQueryKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const res = await tool.availability!.handler({ request, uiSettings, spaceId: 'default' });
    expect(res).toEqual({ status: 'available' });
  });

  it('availability returns unavailable when access check throws', async () => {
    (assertSignificantEventsAccess as Mock).mockRejectedValueOnce(new Error('nope'));

    const getScopedClients = vi.fn(async () => {
      return { licensing: {}, uiSettingsClient: {} } as unknown as RouteHandlerScopedClients;
    }) as unknown as MockedFunction<GetScopedClients>;

    const tool = createQueryKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const res = await tool.availability!.handler({ request, uiSettings, spaceId: 'default' });
    expect(res.status).toBe('unavailable');
  });

  it('tracks success telemetry when query KI is created', async () => {
    (assertSignificantEventsAccess as Mock).mockResolvedValue(undefined);

    const queryClient = {
      upsertQuery: vi.fn().mockResolvedValue(undefined),
    };

    const getScopedClients = vi.fn(async () => {
      return {
        streamsClient: {
          getStream: vi.fn().mockResolvedValue({
            name: 'logs.test',
            ingest: {
              classic: { field_overrides: {} },
              processing: [],
              lifecycle: { inherit: {} },
              failure_store: { inherit: {} },
            },
          }),
        },
        getKnowledgeIndicatorClient: vi.fn().mockResolvedValue(queryClient),
        licensing: {},
        uiSettingsClient: { get: vi.fn().mockResolvedValue(false) },
      } as unknown as RouteHandlerScopedClients;
    }) as unknown as MockedFunction<GetScopedClients>;

    const tool = createQueryKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const context = createMockToolContext();
    await invokeHandler(
      tool as never,
      {
        stream_name: 'logs.test',
        title: 'suspicious query',
        description: 'desc',
        esql: { query: 'FROM logs.test | stats c = count()' },
      },
      context
    );

    expect(telemetry.trackAgentBuilderKnowledgeIndicatorCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        ki_kind: 'query',
        tool_id: 'ki_query_create',
        success: true,
        stream_name: 'logs.test',
        stream_type: 'classic',
      })
    );
  });

  it('tracks failure telemetry when query KI creation fails', async () => {
    (assertSignificantEventsAccess as Mock).mockResolvedValue(undefined);

    const queryClient = {
      upsertQuery: vi.fn().mockRejectedValue(new Error('upsert failed')),
    };

    const getScopedClients = vi.fn(async () => {
      return {
        streamsClient: {
          getStream: vi.fn().mockResolvedValue({
            name: 'logs.test',
            ingest: {
              classic: { field_overrides: {} },
              processing: [],
              lifecycle: { inherit: {} },
              failure_store: { inherit: {} },
            },
          }),
        },
        getKnowledgeIndicatorClient: vi.fn().mockResolvedValue(queryClient),
        licensing: {},
        uiSettingsClient: { get: vi.fn().mockResolvedValue(false) },
      } as unknown as RouteHandlerScopedClients;
    }) as unknown as MockedFunction<GetScopedClients>;

    const tool = createQueryKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const context = createMockToolContext();
    await invokeHandler(
      tool as never,
      {
        stream_name: 'logs.test',
        title: 'suspicious query',
        description: 'desc',
        esql: { query: 'FROM logs.test | stats c = count()' },
      },
      context
    );

    expect(telemetry.trackAgentBuilderKnowledgeIndicatorCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        ki_kind: 'query',
        tool_id: 'ki_query_create',
        success: false,
        stream_name: 'logs.test',
        stream_type: 'classic',
        error_message: 'upsert failed',
      })
    );
  });
});
