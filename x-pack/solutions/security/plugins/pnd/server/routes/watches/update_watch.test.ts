/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { registerUpdateWatchRoute } from './update_watch';

const registerHandler = () => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  (router.versioned.patch as jest.Mock).mockReturnValue({ addVersion });
  const update = jest.fn();
  registerUpdateWatchRoute({
    router,
    logger: loggerMock.create(),
    config: { enabled: true, ui: { useMockData: false } },
    getSpaceId: () => 'space-a',
    getWatchesService: () => ({ update } as never),
  });
  return { handler: addVersion.mock.calls[0][1], update };
};

const createContext = () => ({
  core: Promise.resolve({}),
});

describe('update watch route', () => {
  it.each([
    [{ outcome: 'conflict' }, 'conflict'],
    [{ outcome: 'rejected', what: 'an unsupported setting' }, 'badRequest'],
  ] as const)('maps %s to the expected response', async (result, responseMethod) => {
    const { handler, update } = registerHandler();
    update.mockResolvedValue(result);
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: 'system-security-watch-floor' },
      body: { autonomyLevel: 'assisted', settingsRevision: null },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(createContext(), request, response);

    expect(response[responseMethod]).toHaveBeenCalled();
  });

  it('maps a failed confirmation to 500', async () => {
    const { handler, update } = registerHandler();
    update.mockResolvedValue({ outcome: 'failed' });
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: 'system-security-watch-floor' },
      body: { autonomyLevel: 'assisted', settingsRevision: null },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(createContext(), request, response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
