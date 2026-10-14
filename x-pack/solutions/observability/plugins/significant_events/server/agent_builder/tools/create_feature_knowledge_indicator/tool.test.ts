/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../routes/types';
import {
  createMockToolContext,
  createSignificantEventsServer,
  invokeHandler,
  mockSourcesClient,
  sourceWithSlug,
} from '../../utils/test_helpers';
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
  const server = createSignificantEventsServer({ featurePrivilege: 'all' });
  const request = {} as unknown as KibanaRequest;
  const uiSettings = {} as unknown as IUiSettingsClient;
  const telemetry = {
    trackAgentBuilderKnowledgeIndicatorCreated: jest.fn(),
  } as unknown as EbtTelemetryClient;

  const featureParams = {
    slug: 'logs.test',
    id: 'feature-1',
    type: 'custom',
    description: 'desc',
    properties: {},
    confidence: 80,
  };

  // Scoped clients that let a write through, so only the privilege check can stop it.
  const createScopedClients = (kiClient: object) =>
    jest.fn(async () => {
      return {
        sourcesClient: mockSourcesClient(['logs.test']),
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
        licensing: {},
        uiSettingsClient: { get: jest.fn().mockResolvedValue(false) },
      } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

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

    const getScopedClients = createScopedClients(featureClient);

    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const context = createMockToolContext();
    await invokeHandler(tool as never, featureParams, context);

    expect(telemetry.trackAgentBuilderKnowledgeIndicatorCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        ki_kind: 'feature',
        tool_id: 'ki_feature_create',
        success: true,
        source_id: 'logs.test',
      })
    );
  });

  it('stores the feature against the source id when the slug differs', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);

    const featureClient = {
      bulk: jest.fn().mockResolvedValue(undefined),
    };

    const getScopedClients = jest.fn(async () => {
      return {
        sourcesClient: {
          list: jest.fn().mockResolvedValue({
            sources: [sourceWithSlug('nginx-errors', { id: 'source-uuid', title: 'Nginx errors' })],
            total: 1,
          }),
        },
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

    await invokeHandler(
      tool as never,
      {
        slug: 'nginx-errors',
        id: 'feature-1',
        type: 'custom',
        description: 'desc',
        properties: {},
        confidence: 80,
      },
      createMockToolContext()
    );

    expect(featureClient.bulk).toHaveBeenCalledWith('source-uuid', expect.any(Array));
    expect(telemetry.trackAgentBuilderKnowledgeIndicatorCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        source_id: 'source-uuid',
      })
    );
  });

  it('tracks failure telemetry when feature KI creation fails', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);

    const featureClient = {
      bulk: jest.fn().mockRejectedValue(new Error('write failed')),
    };

    const getScopedClients = createScopedClients(featureClient);

    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger,
      telemetry,
    });

    const context = createMockToolContext();
    await invokeHandler(tool as never, featureParams, context);

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

  it('does not let a Nightshift reader create a feature KI', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);

    const featureClient = { bulk: jest.fn() };
    const tool = createFeatureKnowledgeIndicatorTool({
      getScopedClients: createScopedClients(featureClient),
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
      logger,
      telemetry,
    });

    await invokeHandler(tool as never, featureParams, createMockToolContext());

    expect(featureClient.bulk).not.toHaveBeenCalled();
    expect(telemetry.trackAgentBuilderKnowledgeIndicatorCreated).toHaveBeenCalledWith(
      expect.objectContaining({ ki_kind: 'feature', success: false })
    );
  });
});
