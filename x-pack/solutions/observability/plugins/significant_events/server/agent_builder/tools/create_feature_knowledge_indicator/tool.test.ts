/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { SignificantEventsServer } from '../../../types';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../routes/types';
import { createMockToolContext, invokeHandler, mockSourcesClient } from '../../utils/test_helpers';
import {
  createFeatureKnowledgeIndicatorTool,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_FEATURE_TOOL_ID,
} from './tool';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

describe('ki_feature_create tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = {} as unknown as SignificantEventsServer;
  const request = {} as unknown as KibanaRequest;
  const uiSettings = {} as unknown as IUiSettingsClient;
  const telemetry = {
    trackAgentBuilderKnowledgeIndicatorCreated: jest.fn(),
  } as unknown as EbtTelemetryClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the expected tool id', () => {
    const getScopedClients = jest.fn() as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_FEATURE_TOOL_ID);
    expect(tool.id).toBe('platform.sig_events.ki_feature_create');
  });

  it('uses always confirmation policy with custom prompt', async () => {
    const getScopedClients = jest.fn() as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    expect(tool.confirmation?.askUser).toBe('always');

    const confirmation = await tool.confirmation?.getConfirmation?.({
      toolParams: {
        slug: 'logs.test',
        id: 'feature-1',
        type: 'error_pattern',
        description: 'Recurring timeout pattern',
        properties: {},
        confidence: 80,
      },
      context: createMockToolContext(),
    });

    expect(confirmation).toEqual(
      expect.objectContaining({
        title: 'Save Feature KI',
        confirm_text: 'Save',
        cancel_text: 'Cancel',
      })
    );
    expect(confirmation?.message).toContain('source "logs.test"');
    expect(confirmation?.message).toContain('id: "feature-1"');
    expect(confirmation?.message).toContain('type: "error_pattern"');
  });

  it('availability returns available when access check succeeds', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValueOnce(undefined);

    const getScopedClients = jest.fn(async () => {
      return { licensing: {}, uiSettingsClient: {} } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const res = await tool.availability!.handler({ request, uiSettings, spaceId: 'default' });
    expect(res).toEqual({ status: 'available' });
  });

  it('availability returns unavailable when access check throws', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockRejectedValueOnce(new Error('nope'));

    const getScopedClients = jest.fn(async () => {
      return { licensing: {}, uiSettingsClient: {} } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const res = await tool.availability!.handler({ request, uiSettings, spaceId: 'default' });
    expect(res.status).toBe('unavailable');
  });

  it('tracks success telemetry when feature KI is created', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);

    const featureClient = {
      bulk: jest.fn().mockResolvedValue(undefined),
    };

    const getScopedClients = jest.fn(async () => {
      return {
        sourcesClient: mockSourcesClient(['logs.test']),
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(featureClient),
        licensing: {},
        uiSettingsClient: { get: jest.fn().mockResolvedValue(false) },
      } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const context = createMockToolContext();
    await invokeHandler(
      tool as never,
      {
        slug: 'logs.test',
        id: 'feature-1',
        type: 'custom',
        description: 'desc',
        properties: {},
        confidence: 80,
      },
      context
    );

    expect(telemetry.trackAgentBuilderKnowledgeIndicatorCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        ki_kind: 'feature',
        tool_id: 'ki_feature_create',
        success: true,
        source_id: 'logs.test',
      })
    );
  });

  it('tracks failure telemetry when feature KI creation fails', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);

    const featureClient = {
      bulk: jest.fn().mockRejectedValue(new Error('write failed')),
    };

    const getScopedClients = jest.fn(async () => {
      return {
        sourcesClient: mockSourcesClient(['logs.test']),
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(featureClient),
        licensing: {},
        uiSettingsClient: { get: jest.fn().mockResolvedValue(false) },
      } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const context = createMockToolContext();
    await invokeHandler(
      tool as never,
      {
        slug: 'logs.test',
        id: 'feature-1',
        type: 'custom',
        description: 'desc',
        properties: {},
        confidence: 80,
      },
      context
    );

    expect(telemetry.trackAgentBuilderKnowledgeIndicatorCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        ki_kind: 'feature',
        tool_id: 'ki_feature_create',
        success: false,
        source_id: 'logs.test',
        error_message: 'write failed',
      })
    );
  });

  it('returns a tool error for an unknown slug and does not call the knowledge indicator client', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);

    const getKnowledgeIndicatorClient = jest.fn();
    const getScopedClients = jest.fn(async () => {
      return {
        sourcesClient: mockSourcesClient(['logs.test']),
        getKnowledgeIndicatorClient,
        licensing: {},
        uiSettingsClient: { get: jest.fn().mockResolvedValue(false) },
      } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const result = await invokeHandler(
      tool as never,
      {
        slug: 'missing',
        id: 'feature-1',
        type: 'custom',
        description: 'desc',
        properties: {},
        confidence: 80,
      },
      createMockToolContext()
    );

    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }
    expect(result.results[0]).toEqual({
      type: 'error',
      data: {
        message:
          'Failed to create feature knowledge indicator: Source not found in this space: missing',
      },
    });
  });
});
