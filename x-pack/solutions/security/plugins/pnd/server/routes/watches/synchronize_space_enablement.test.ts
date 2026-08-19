/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PND_API_PRIVILEGE_WRITE } from '../../../common/constants';
import { registerSynchronizeSpaceEnablementRoute } from './synchronize_space_enablement';

describe('synchronize space enablement route', () => {
  it('reads the Advanced Setting and reconciles the current space behind PND write access', async () => {
    const router = httpServiceMock.createRouter();
    const addVersion = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion });
    const synchronizeSpaceEnabled = jest.fn().mockResolvedValue(undefined);
    registerSynchronizeSpaceEnablementRoute({
      router,
      logger: loggerMock.create(),
      config: { enabled: true, ui: { useMockData: false } },
      getSpaceId: () => 'space-a',
      getWatchesService: () => ({ synchronizeSpaceEnabled } as never),
    });
    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();
    const context = {
      core: Promise.resolve({
        uiSettings: { client: { get: jest.fn().mockResolvedValue(false) } },
      }),
    };

    await addVersion.mock.calls[0][1](context, request, response);

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        security: { authz: { requiredPrivileges: [PND_API_PRIVILEGE_WRITE] } },
      })
    );
    expect(synchronizeSpaceEnabled).toHaveBeenCalledWith(false, 'space-a', request);
    expect(response.ok).toHaveBeenCalledWith({ body: { enabled: false } });
  });
});
