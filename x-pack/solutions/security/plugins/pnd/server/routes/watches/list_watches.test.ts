/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import { registerListWatchesRoute } from './list_watches';

describe('list watches route', () => {
  it('omits empty extended privileges in mock mode', () => {
    const router = httpServiceMock.createRouter();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: jest.fn() });

    registerListWatchesRoute({
      router,
      logger: loggerMock.create(),
      config: { enabled: true, ui: { useMockData: true } },
      getSpaceId: () => 'default',
      getWatchProjection: () => undefined,
    });

    expect(router.versioned.get).toHaveBeenCalledWith(
      expect.objectContaining({
        security: {
          authz: {
            requiredPrivileges: [PND_API_PRIVILEGE_READ],
          },
        },
      })
    );
  });
});
