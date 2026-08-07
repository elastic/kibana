/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PREBUILT_WATCH_IDS } from '@kbn/pnd-common';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import { registerSetupWatchesRoute } from './setup_watches';

describe('setup watches route', () => {
  it('requires create and update privileges and invokes explicit setup', async () => {
    const router = httpServiceMock.createRouter();
    const addVersion = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion });
    const result = { created: [...PREBUILT_WATCH_IDS], existing: [], failed: [] };
    const setup = jest.fn().mockResolvedValue(result);

    registerSetupWatchesRoute({
      router,
      logger: loggerMock.create(),
      config: { enabled: true, ui: { useMockData: false } },
      getSpaceId: () => 'default',
      getWatchProjection: () => ({ setup } as never),
    });

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        security: {
          authz: {
            requiredPrivileges: [
              PND_API_PRIVILEGE_WRITE,
              WorkflowsManagementApiActions.create,
              WorkflowsManagementApiActions.update,
            ],
          },
        },
      })
    );

    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();
    await addVersion.mock.calls[0][1]({}, request, response);

    expect(setup).toHaveBeenCalledWith(request, 'default');
    expect(response.ok).toHaveBeenCalledWith({ body: result });
  });
});
