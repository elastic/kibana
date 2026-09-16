/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { cleanupPrivateLocationRoute } from './cleanup_private_locations';
import { resetSyncPrivateCleanUpState } from '../../../tasks/sync_private_locations_monitors_task';

jest.mock('../../../tasks/sync_private_locations_monitors_task', () => ({
  resetSyncPrivateCleanUpState: jest.fn(),
}));

const resetSyncPrivateCleanUpStateMock = resetSyncPrivateCleanUpState as jest.MockedFunction<
  typeof resetSyncPrivateCleanUpState
>;

describe('cleanupPrivateLocationRoute', () => {
  const server = { logger: { debug: jest.fn(), error: jest.fn() } };

  const callRoute = async () => {
    const response = httpServerMock.createResponseFactory();
    const result = await cleanupPrivateLocationRoute().handler({
      server,
      request: { query: {} },
      response,
    } as any);
    return { response, result };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports success once cleanup has been scheduled', async () => {
    resetSyncPrivateCleanUpStateMock.mockResolvedValue(undefined);

    const { result } = await callRoute();

    expect(result).toEqual(expect.objectContaining({ success: true }));
  });

  it('fails the request when cleanup could not be scheduled', async () => {
    // Reporting success here would claim cleanup was scheduled when it was not,
    // leaving the caller polling for work that only happens whenever the periodic
    // sync next runs.
    resetSyncPrivateCleanUpStateMock.mockRejectedValue(new Error('already running'));

    const { response } = await callRoute();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Failed to schedule private location cleanup: already running',
      },
    });
  });
});
