/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { cleanupPrivateLocationRoute } from './cleanup_private_locations';
import {
  runCleanUpTaskNow,
  setLeftoverCleanUpDisabled,
} from '../../../tasks/clean_up_package_policies_task';

jest.mock('../../../tasks/clean_up_package_policies_task', () => ({
  runCleanUpTaskNow: jest.fn(),
  setLeftoverCleanUpDisabled: jest.fn(),
}));

const runCleanUpTaskNowMock = runCleanUpTaskNow as jest.MockedFunction<typeof runCleanUpTaskNow>;
const setLeftoverCleanUpDisabledMock = setLeftoverCleanUpDisabled as jest.MockedFunction<
  typeof setLeftoverCleanUpDisabled
>;

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
    runCleanUpTaskNowMock.mockResolvedValue(undefined);
    setLeftoverCleanUpDisabledMock.mockResolvedValue(undefined);
  });

  it('re-enables the daily clean up and runs it now', async () => {
    const { result } = await callRoute();

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(setLeftoverCleanUpDisabledMock).toHaveBeenCalledWith(server, false);
    expect(runCleanUpTaskNowMock).toHaveBeenCalledWith(server);
    expect(setLeftoverCleanUpDisabledMock.mock.invocationCallOrder[0]).toBeLessThan(
      runCleanUpTaskNowMock.mock.invocationCallOrder[0]
    );
  });

  it('disables the daily clean up without running it when disable is true', async () => {
    const { result } = await callRoute({ disable: true });

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(setLeftoverCleanUpDisabledMock).toHaveBeenCalledWith(server, true);
    expect(runCleanUpTaskNowMock).not.toHaveBeenCalled();
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

  it('fails the request when cleanup could not be disabled', async () => {
    setLeftoverCleanUpDisabledMock.mockRejectedValue(new Error('version conflict'));

    const { response } = await callRoute({ disable: true });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Failed to disable private location cleanup: version conflict',
      },
    });
  });
});
