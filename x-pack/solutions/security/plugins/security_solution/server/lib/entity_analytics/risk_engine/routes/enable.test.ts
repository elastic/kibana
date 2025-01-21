/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { riskEngineEnableRoute } from './enable';
import { RISK_ENGINE_ENABLE_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEngineDataClientMock } from '../risk_engine_data_client.mock';
import { riskEnginePrivilegesMock } from './risk_engine_privileges.mock';

describe('risk score enable route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let mockRiskEngineDataClient: ReturnType<typeof riskEngineDataClientMock.create>;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    mockRiskEngineDataClient = riskEngineDataClientMock.create();
    context = requestContextMock.convertContext(
      requestContextMock.create({
        ...clients,
        riskEngineDataClient: mockRiskEngineDataClient,
      })
    );
    mockTaskManagerStart = taskManagerMock.createStart();
  });

  const buildRequest = () => {
    return requestMock.create({
      method: 'post',
      path: RISK_ENGINE_ENABLE_URL,
      body: {},
    });
  };

  describe('when task manager is available', () => {
    beforeEach(() => {
      getStartServicesMock = jest.fn().mockResolvedValue([
        {},
        {
          taskManager: mockTaskManagerStart,
          security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
        },
      ]);
      riskEngineEnableRoute(server.router, getStartServicesMock);
    });

    it('invokes the risk score service', async () => {
      const request = buildRequest();
      await server.inject(request, context);

      expect(mockRiskEngineDataClient.enableRiskEngine).toHaveBeenCalled();
    });

    it('returns a 200 when enablement is successful', async () => {
      // @ts-expect-error response is not used in the route nor this test
      mockRiskEngineDataClient.enableRiskEngine.mockResolvedValue({ enabled: true });
      const request = buildRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
    });

    it('returns a 500 if enabling fails', async () => {
      mockRiskEngineDataClient.enableRiskEngine.mockRejectedValue(
        new Error('something went wrong')
      );
      const request = buildRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(response.body.message).toEqual('something went wrong');
    });
  });

  describe('when task manager is unavailable', () => {
    beforeEach(() => {
      getStartServicesMock = jest.fn().mockResolvedValue([
        {},
        {
          taskManager: undefined,
          security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
        },
      ]);
      riskEngineEnableRoute(server.router, getStartServicesMock);
    });

    it('returns a 400 response', async () => {
      const request = buildRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message:
          'Task Manager is unavailable, but is required by the risk engine. Please enable the taskManager plugin and try again.',
        status_code: 400,
      });
    });
  });
});
