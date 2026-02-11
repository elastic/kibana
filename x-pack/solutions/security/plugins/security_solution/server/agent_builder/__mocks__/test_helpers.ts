/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import type { ToolHandlerContext, ToolAvailabilityContext } from '@kbn/agent-builder-server/tools';
import type {
  ModelProvider,
  ToolProvider,
  ScopedRunner,
  ToolResultStore,
  ToolEventEmitter,
  ToolPromptManager,
  ToolStateManager,
} from '@kbn/agent-builder-server';

/**
 * Creates common mocks for tool tests
 */
export const createToolTestMocks = () => {
  const mockCore = coreMock.createSetup();
  const mockLogger = loggingSystemMock.createLogger();
  const mockEsClient = elasticsearchClientMock.createScopedClusterClient();
  const mockRequest = httpServerMock.createKibanaRequest({
    path: '/s/default/app/security',
  });

  return {
    mockCore,
    mockLogger,
    mockEsClient,
    mockRequest,
  };
};

/**
 * Sets up mock core start services for tools that need it
 */
export const setupMockCoreStartServices = (
  mockCore: ReturnType<typeof coreMock.createSetup>,
  mockEsClient: ReturnType<typeof elasticsearchClientMock.createScopedClusterClient>
) => {
  const mockCoreStart = coreMock.createStart();
  Object.assign(mockCoreStart.elasticsearch.client, {
    asInternalUser: mockEsClient.asInternalUser,
    asCurrentUser: mockEsClient.asCurrentUser,
  });
  mockCore.getStartServices.mockResolvedValue([mockCoreStart, {}, {}]);
};

/**
 * Creates minimal mocks for ToolHandlerContext fields
 */
const createMockModelProvider = (): ModelProvider =>
  ({
    getDefaultModel: jest.fn(),
    getModel: jest.fn(),
    getUsageStats: jest.fn().mockReturnValue({ calls: [] }),
  } as unknown as ModelProvider);

const createMockToolProvider = (): ToolProvider =>
  ({
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  } as unknown as ToolProvider);

const createMockScopedRunner = (): ScopedRunner =>
  ({
    runTools: jest.fn(),
  } as unknown as ScopedRunner);

const createMockToolResultStore = (): ToolResultStore =>
  ({
    get: jest.fn(),
  } as unknown as ToolResultStore);

const createMockToolEventEmitter = (): ToolEventEmitter =>
  ({
    reportProgress: jest.fn(),
  } as unknown as ToolEventEmitter);

const createMockToolPromptManager = (): ToolPromptManager =>
  ({
    checkConfirmationStatus: jest.fn(),
    askForConfirmation: jest.fn(),
  } as unknown as ToolPromptManager);

const createMockToolStateManager = (): ToolStateManager =>
  ({
    getState: jest.fn(),
    setState: jest.fn(),
  } as unknown as ToolStateManager);

/**
 * Creates a tool handler context object
 */
export const createToolHandlerContext = (
  mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>,
  mockEsClient: ReturnType<typeof elasticsearchClientMock.createScopedClusterClient>,
  mockLogger: ReturnType<typeof loggingSystemMock.createLogger>,
  additionalContext: Partial<Omit<ToolHandlerContext, 'request' | 'esClient' | 'logger'>> = {}
): ToolHandlerContext => {
  return {
    request: mockRequest,
    esClient: mockEsClient,
    logger: mockLogger,
    spaceId: 'default',
    modelProvider: additionalContext.modelProvider ?? createMockModelProvider(),
    toolProvider: additionalContext.toolProvider ?? createMockToolProvider(),
    runner: additionalContext.runner ?? createMockScopedRunner(),
    resultStore: additionalContext.resultStore ?? createMockToolResultStore(),
    events: additionalContext.events ?? createMockToolEventEmitter(),
    prompts: additionalContext.prompts ?? createMockToolPromptManager(),
    stateManager: additionalContext.stateManager ?? createMockToolStateManager(),
  };
};

/**
 * Creates a tool availability context object
 */
export const createToolAvailabilityContext = (
  mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>,
  spaceId: string,
  uiSettings?: ToolAvailabilityContext['uiSettings']
): ToolAvailabilityContext => {
  return {
    request: mockRequest,
    spaceId,
    uiSettings: uiSettings ?? uiSettingsServiceMock.createClient(),
  };
};
