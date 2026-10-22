/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { cleanupPrivateLocationRoute } from './cleanup_private_locations';
import { runCleanUpTaskNow } from '../../../tasks/clean_up_package_policies_task';

jest.mock('../../../tasks/clean_up_package_policies_task', () => ({
  runCleanUpTaskNow: jest.fn(),
}));

const runCleanUpTaskNowMock = runCleanUpTaskNow as jest.MockedFunction<typeof runCleanUpTaskNow>;

describe('cleanupPrivateLocationRoute', () => {
  const server = { logger: { debug: jest.fn(), error: jest.fn() } };

  const callRoute = async (query: Record<string, unknown> = {}) => {
    const response = httpServerMock.createResponseFactory();
    const result = await cleanupPrivateLocationRoute().handler({
      server,
      request: { query },
      response,
    } as any);
    return { response, result };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports success once cleanup has been scheduled', async () => {
    runCleanUpTaskNowMock.mockResolvedValue(undefined);

    const { result } = await callRoute();

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(runCleanUpTaskNowMock).toHaveBeenCalledWith(server);
  });

  it('still schedules leftover cleanup when hasAlreadyDoneCleanup is true in the query', async () => {
    runCleanUpTaskNowMock.mockResolvedValue(undefined);

    const { result } = await callRoute({ hasAlreadyDoneCleanup: true });

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(runCleanUpTaskNowMock).toHaveBeenCalledWith(server);
  });

  it('fails the request when cleanup could not be scheduled', async () => {
    runCleanUpTaskNowMock.mockRejectedValue(new Error('already running'));

    const { response } = await callRoute();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Failed to schedule private location cleanup: already running',
      },
    });
  });
});
