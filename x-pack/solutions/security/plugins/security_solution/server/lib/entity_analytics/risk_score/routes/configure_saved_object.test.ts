/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { RISK_ENGINE_CONFIGURE_SO_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEnginePrivilegesMock } from './risk_engine_privileges.mock';
import { riskEngineConfigureSavedObjectRoute } from './configure_saved_object';
import {
  getConfiguration,
  initSavedObjects,
  updateSavedObjectAttribute,
} from '../configuration/saved_object_configuration';

jest.mock('../configuration/saved_object_configuration');

const mockGetConfiguration = getConfiguration as jest.MockedFunction<typeof getConfiguration>;
const mockInitSavedObjects = initSavedObjects as jest.MockedFunction<typeof initSavedObjects>;
const mockUpdateSavedObjectAttribute = updateSavedObjectAttribute as jest.MockedFunction<
  typeof updateSavedObjectAttribute
>;

describe('riskEngineConfigureSavedObjectRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    server = serverMock.create();
    context = requestContextMock.convertContext(requestContextMock.create());
    mockTaskManagerStart = taskManagerMock.createStart();
    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        taskManager: mockTaskManagerStart,
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
      },
    ]);
    mockGetConfiguration.mockResolvedValue({ enabled: true } as Awaited<
      ReturnType<typeof getConfiguration>
    >);
    mockInitSavedObjects.mockResolvedValue({} as Awaited<ReturnType<typeof initSavedObjects>>);
    mockUpdateSavedObjectAttribute.mockResolvedValue(
      {} as Awaited<ReturnType<typeof updateSavedObjectAttribute>>
    );
    riskEngineConfigureSavedObjectRoute(
      server.router,
      getStartServicesMock,
      loggingSystemMock.createLogger()
    );
  });

  const buildRequest = (body: {}) => {
    return requestMock.create({
      method: 'put',
      path: RISK_ENGINE_CONFIGURE_SO_URL,
      body,
    });
  };

  it('updates the saved object through the shared configuration module', async () => {
    const request = buildRequest({});
    await server.inject(request, context);
    expect(mockUpdateSavedObjectAttribute).toHaveBeenCalled();
    expect(mockInitSavedObjects).not.toHaveBeenCalled();
  });

  it('returns a 200 when the saved object is updated successfully', async () => {
    const request = buildRequest({
      exclude_alert_statuses: ['open'],
      range: { start: 'now-30d', end: 'now' },
      exclude_alert_tags: ['tag1'],
    });
    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ risk_engine_saved_object_configured: true });
    expect(mockUpdateSavedObjectAttribute).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'default',
        attributes: {
          excludeAlertStatuses: ['open'],
          range: { start: 'now-30d', end: 'now' },
          excludeAlertTags: ['tag1'],
        },
      })
    );
  });

  it('passes page_size to the configuration update', async () => {
    const request = buildRequest({
      page_size: 5000,
    });
    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(mockUpdateSavedObjectAttribute).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          pageSize: 5000,
        }),
      })
    );
  });
});
