/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { enableLeadGenerationRoute } from './enable_lead_generation';
import { ENABLE_LEAD_GENERATION_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockCreateIndices = jest.fn();
jest.mock('../indices/lead_index_service', () => ({
  createLeadIndexService: () => ({ createIndices: mockCreateIndices }),
}));

const mockStartTask = jest.fn();
jest.mock('../tasks', () => ({
  startLeadGenerationTask: (...args: unknown[]) => mockStartTask(...args),
}));

describe('enableLeadGenerationRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  const logger = loggingSystemMock.createLogger();
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    mockTaskManagerStart = taskManagerMock.createStart();
    getStartServicesMock = jest.fn().mockResolvedValue([{}, { taskManager: mockTaskManagerStart }]);
    enableLeadGenerationRoute(server.router, logger, getStartServicesMock);
  });

  it('returns 200, creates indices, and starts the task', async () => {
    const request = requestMock.create({
      method: 'post',
      path: ENABLE_LEAD_GENERATION_URL,
      body: { connectorId: 'test-connector-id' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ success: true });
    expect(mockCreateIndices).toHaveBeenCalled();
    expect(mockStartTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskManager: mockTaskManagerStart,
        logger,
        namespace: expect.any(String),
      })
    );
  });

  it('returns 500 when Task Manager is not available', async () => {
    getStartServicesMock.mockResolvedValueOnce([{}, { taskManager: undefined }]);
    server = serverMock.create();
    enableLeadGenerationRoute(server.router, logger, getStartServicesMock);

    const request = requestMock.create({
      method: 'post',
      path: ENABLE_LEAD_GENERATION_URL,
      body: { connectorId: 'test-connector-id' },
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(500);
  });
});
