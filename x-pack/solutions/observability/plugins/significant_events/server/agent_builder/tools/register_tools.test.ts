/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { registerAgentBuilderTools } from './register_tools';
import {
  SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
  SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
  SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID,
  NIGHTSHIFT_SOURCE_LIST_TOOL_ID,
  NIGHTSHIFT_SOURCE_GET_TOOL_ID,
  NIGHTSHIFT_SOURCE_CREATE_TOOL_ID,
  NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID,
  NIGHTSHIFT_SOURCE_DELETE_TOOL_ID,
} from './register_tools';
import { coreMock } from '@kbn/core/server/mocks';
import type { NightshiftFeaturePrivilege } from '../utils/test_helpers';
import {
  createMockGetScopedClients,
  createMockRequest,
  createSignificantEventsServer,
} from '../utils/test_helpers';
import { assertSignificantEventsAccess } from '../../routes/utils/assert_significant_events_access';
import type { SignificantEventsServer } from '../../types';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';

const createMockServer = (
  featurePrivilege: NightshiftFeaturePrivilege = 'all'
): Pick<SignificantEventsServer, 'isServerless' | 'core' | 'security'> => ({
  ...createSignificantEventsServer({ featurePrivilege }),
  isServerless: false,
  core: {
    elasticsearch: { client: { asInternalUser: {} } },
    security: {},
  } as SignificantEventsServer['core'],
});

jest.mock('../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

describe('registerAgentBuilderTools', () => {
  const telemetry = {
    trackAgentBuilderKnowledgeIndicatorCreated: jest.fn(),
  } as unknown as EbtTelemetryClient;
  const maintenanceService = { getState: jest.fn() };

  it('registers all expected tools', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const { getScopedClients } = createMockGetScopedClients();

    registerAgentBuilderTools({
      agentBuilder,
      getScopedClients,
      server: createMockServer() as SignificantEventsServer,
      logger: loggerMock.create(),
      telemetry,
      maintenanceService,
    });

    const registeredIds = agentBuilder.tools.register.mock.calls.map((call) => call[0].id);

    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID);
    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID);
    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID);
    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID);
    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID);
    expect(registeredIds).toContain(NIGHTSHIFT_SOURCE_LIST_TOOL_ID);
    expect(registeredIds).toContain(NIGHTSHIFT_SOURCE_GET_TOOL_ID);
    expect(registeredIds).toContain(NIGHTSHIFT_SOURCE_CREATE_TOOL_ID);
    expect(registeredIds).toContain(NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID);
    expect(registeredIds).toContain(NIGHTSHIFT_SOURCE_DELETE_TOOL_ID);
  });

  it('registers tools with non-empty descriptions and schemas', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const { getScopedClients } = createMockGetScopedClients();

    registerAgentBuilderTools({
      agentBuilder,
      getScopedClients,
      server: createMockServer() as SignificantEventsServer,
      logger: loggerMock.create(),
      telemetry,
      maintenanceService,
    });

    for (const [tool] of agentBuilder.tools.register.mock.calls) {
      expect(tool.description).toBeTruthy();
      expect(tool).toHaveProperty('schema');
      expect((tool as { schema: unknown }).schema).toBeDefined();
    }
  });

  it('hides every tool while the significant events feature is not accessible', async () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const { getScopedClients } = createMockGetScopedClients();

    registerAgentBuilderTools({
      agentBuilder,
      getScopedClients,
      server: createMockServer() as SignificantEventsServer,
      logger: loggerMock.create(),
      telemetry,
      maintenanceService,
    });

    const availabilityContext = {
      request: createMockRequest(),
      uiSettings: coreMock.createRequestHandlerContext().uiSettings.client,
      spaceId: 'default',
    };

    for (const [tool] of agentBuilder.tools.register.mock.calls) {
      const availability = 'availability' in tool ? tool.availability : undefined;
      expect(availability).toBeDefined();

      jest.mocked(assertSignificantEventsAccess).mockResolvedValue(undefined);
      expect(await availability?.handler(availabilityContext)).toEqual({ status: 'available' });

      jest.mocked(assertSignificantEventsAccess).mockRejectedValue(new Error('feature disabled'));
      expect(await availability?.handler(availabilityContext)).toEqual({
        status: 'unavailable',
        reason: 'feature disabled',
      });
    }
  });

  it('hides the source change tools from users without the manage privilege', async () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const { getScopedClients } = createMockGetScopedClients();
    jest.mocked(assertSignificantEventsAccess).mockResolvedValue(undefined);

    registerAgentBuilderTools({
      agentBuilder,
      getScopedClients,
      server: createMockServer('read') as SignificantEventsServer,
      logger: loggerMock.create(),
      telemetry,
      maintenanceService,
    });

    const availabilityContext = {
      request: createMockRequest(),
      uiSettings: coreMock.createRequestHandlerContext().uiSettings.client,
      spaceId: 'default',
    };
    const expectedStatusById: Record<string, string> = {
      [NIGHTSHIFT_SOURCE_LIST_TOOL_ID]: 'available',
      [NIGHTSHIFT_SOURCE_GET_TOOL_ID]: 'available',
      [NIGHTSHIFT_SOURCE_CREATE_TOOL_ID]: 'unavailable',
      [NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID]: 'unavailable',
      [NIGHTSHIFT_SOURCE_DELETE_TOOL_ID]: 'unavailable',
    };
    const statusById = Object.fromEntries(
      await Promise.all(
        agentBuilder.tools.register.mock.calls
          .map(([tool]) => tool)
          .filter(({ id }) => id in expectedStatusById)
          .map(async (tool) => {
            const availability = 'availability' in tool ? tool.availability : undefined;
            const result = await availability?.handler(availabilityContext);
            return [tool.id, result?.status];
          })
      )
    );

    expect(statusById).toEqual(expectedStatusById);
  });

  it('does not register any tools when agentBuilder is falsy', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const { getScopedClients } = createMockGetScopedClients();

    registerAgentBuilderTools({
      agentBuilder: undefined!,
      getScopedClients,
      server: createMockServer() as SignificantEventsServer,
      logger: loggerMock.create(),
      telemetry,
      maintenanceService,
    });

    expect(agentBuilder.tools.register).not.toHaveBeenCalled();
  });
});
