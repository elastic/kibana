/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { MOCK_WATCHES } from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import { registerUpdateWatchRoute } from './update_watch';

describe('update watch route', () => {
  it('round-trips shared watch settings through the projection service', async () => {
    const router = httpServiceMock.createRouter();
    const addVersion = jest.fn();
    (router.versioned.put as jest.Mock).mockReturnValue({ addVersion });
    const updateSettings = jest.fn().mockResolvedValue({ watch: MOCK_WATCHES[1] });
    const settings = {
      enabled: false,
      description: 'Customer-owned description',
      autonomyLevel: 'supervised' as const,
      scheduleInterval: '15m',
    };

    registerUpdateWatchRoute({
      router,
      logger: loggerMock.create(),
      config: { enabled: true, ui: { useMockData: false } },
      getSpaceId: () => 'default',
      getWatchProjection: () => ({ updateSettings } as never),
    });

    expect(router.versioned.put).toHaveBeenCalledWith(
      expect.objectContaining({
        security: {
          authz: {
            requiredPrivileges: [
              PND_API_PRIVILEGE_WRITE,
              WorkflowsManagementApiActions.update,
              WorkflowsManagementApiActions.read,
            ],
          },
        },
      })
    );
    const bodyValidator = addVersion.mock.calls[0][0].validate.request.body as {
      _sourceSchema: {
        safeParse: (value: unknown) => { success: boolean };
      };
    };
    expect(bodyValidator._sourceSchema.safeParse(settings).success).toBe(true);
    expect(
      bodyValidator._sourceSchema.safeParse({ ...settings, scheduleInterval: '0m' }).success
    ).toBe(false);
    expect(
      bodyValidator._sourceSchema.safeParse({ ...settings, scheduleInterval: '90s' }).success
    ).toBe(true);

    const handler = addVersion.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: MOCK_WATCHES[1].id },
      body: settings,
    });
    const response = httpServerMock.createResponseFactory();

    await handler({}, request, response);

    expect(updateSettings).toHaveBeenCalledWith(request, MOCK_WATCHES[1].id, 'default', settings);
    expect(response.ok).toHaveBeenCalledWith({ body: { watch: MOCK_WATCHES[1] } });
  });
});
