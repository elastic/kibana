/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ToolHandlerContext } from '@kbn/onechat-server';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { alertsTool } from './alerts_tool';
import * as runSearchToolModule from '@kbn/onechat-genai-utils/tools';
import * as helpersModule from './helpers';

jest.mock('@kbn/onechat-genai-utils/tools');
jest.mock('./helpers');

const runSearchToolMock = jest.fn();
const getSpaceIdFromRequestMock = jest.fn();

describe('alertsTool', () => {
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockEsClient: IScopedClusterClient;
  let mockModelProvider: { getDefaultModel: jest.Mock };
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockEvents: unknown;
  let mockContext: ToolHandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = httpServerMock.createKibanaRequest({
      path: '/s/default-space/app/security',
    });

    mockEsClient = {
      asCurrentUser: {} as unknown,
    } as IScopedClusterClient;

    mockModelProvider = {
      getDefaultModel: jest.fn().mockResolvedValue({}),
    };

    mockLogger = loggerMock.create();
    mockEvents = {};

    mockContext = {
      request: mockRequest,
      esClient: mockEsClient,
      modelProvider: mockModelProvider,
      logger: mockLogger,
      events: mockEvents,
    } as unknown as ToolHandlerContext;

    (runSearchToolModule.runSearchTool as jest.Mock) = runSearchToolMock;
    getSpaceIdFromRequestMock.mockReturnValue('default-space');
    (helpersModule.getSpaceIdFromRequest as jest.Mock) = getSpaceIdFromRequestMock;
  });

  it('returns a tool definition with correct properties', () => {
    const tool = alertsTool();

    expect(tool.id).toBe('core.security.alerts');
    expect(tool.tags).toEqual(['security', 'alerts']);
    expect(tool.schema).toBeDefined();
  });

  it('calls runSearchTool with correct parameters when index is not provided', async () => {
    const tool = alertsTool();
    runSearchToolMock.mockResolvedValue([{ type: 'other', data: { results: [] } }]);
    getSpaceIdFromRequestMock.mockReturnValue('default-space');

    await tool.handler({ query: 'find malware alerts' }, mockContext);

    expect(runSearchToolMock).toHaveBeenCalledTimes(1);
    expect(runSearchToolMock).toHaveBeenCalledWith({
      nlQuery: 'find malware alerts',
      index: `${DEFAULT_ALERTS_INDEX}-default-space`,
      esClient: mockEsClient.asCurrentUser,
      model: {},
      events: mockEvents,
      logger: mockLogger,
    });
  });

  it('calls runSearchTool with provided index when index is specified', async () => {
    const tool = alertsTool();
    runSearchToolMock.mockResolvedValue([{ type: 'other', data: { results: [] } }]);

    await tool.handler({ query: 'find alerts', index: '.custom-alerts-index' }, mockContext);

    expect(runSearchToolMock).toHaveBeenCalledTimes(1);
    expect(runSearchToolMock).toHaveBeenCalledWith({
      nlQuery: 'find alerts',
      index: '.custom-alerts-index',
      esClient: mockEsClient.asCurrentUser,
      model: {},
      events: mockEvents,
      logger: mockLogger,
    });
  });

  it('logs debug message with query and index', async () => {
    const tool = alertsTool();
    runSearchToolMock.mockResolvedValue([{ type: 'other', data: { results: [] } }]);
    getSpaceIdFromRequestMock.mockReturnValue('test-space');

    await tool.handler({ query: 'test query' }, mockContext);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('alerts tool called with query: test query')
    );
  });

  it('returns results from runSearchTool', async () => {
    const tool = alertsTool();
    const mockResults = [{ type: 'other', data: { hits: [{ _id: '1' }] } }];
    runSearchToolMock.mockResolvedValue(mockResults);

    const result = await tool.handler({ query: 'test' }, mockContext);

    expect(result).toEqual({ results: mockResults });
  });

  it('calls getDefaultModel from modelProvider', async () => {
    const tool = alertsTool();
    const mockModel = { id: 'test-model' };
    mockModelProvider.getDefaultModel = jest.fn().mockResolvedValue(mockModel);
    runSearchToolMock.mockResolvedValue([]);

    await tool.handler({ query: 'test' }, mockContext);

    expect(mockModelProvider.getDefaultModel).toHaveBeenCalledTimes(1);
    expect(runSearchToolMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: mockModel,
      })
    );
  });
});
