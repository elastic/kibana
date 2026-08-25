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

const createContext = (spaceEnabled: boolean) => ({
  core: Promise.resolve({
    uiSettings: { client: { get: jest.fn().mockResolvedValue(spaceEnabled) } },
  }),
});

describe('update watch route', () => {
  it('returns 403 without writing when PND watches are disabled in the space', async () => {
    const { handler, update } = registerHandler();
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: 'system-security-watch-floor' },
      body: { autonomyLevel: 'assisted', settingsRevision: null },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(createContext(false), request, response);

    expect(response.forbidden).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('still disables a leftover watch when PND watches are disabled in the space', async () => {
    const { handler, update } = registerHandler();
    update.mockResolvedValue({ outcome: 'updated', response: {} });
    const request = httpServerMock.createKibanaRequest({
      params: { watchId: 'system-security-watch-floor' },
      body: { enabled: false },
    });
    const response = httpServerMock.createResponseFactory();

    await handler(createContext(false), request, response);

    expect(update).toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
    expect(response.forbidden).not.toHaveBeenCalled();
  });

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

    await handler(createContext(true), request, response);

    expect(response[responseMethod]).toHaveBeenCalled();
  });
});
