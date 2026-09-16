/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { cleanupPrivateLocationRoute } from './cleanup_private_locations';
import { triggerCleanUpPackagePoliciesTask } from '../../../tasks/clean_up_package_policies_task';

jest.mock('../../../tasks/clean_up_package_policies_task', () => ({
  triggerCleanUpPackagePoliciesTask: jest.fn(),
}));

const triggerCleanUpPackagePoliciesTaskMock =
  triggerCleanUpPackagePoliciesTask as jest.MockedFunction<
    typeof triggerCleanUpPackagePoliciesTask
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
  });

  it('reports success once cleanup has been scheduled', async () => {
    triggerCleanUpPackagePoliciesTaskMock.mockResolvedValue(undefined);

    const { result } = await callRoute();

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(triggerCleanUpPackagePoliciesTaskMock).toHaveBeenCalledWith(server);
  });

  it('still schedules leftover cleanup when hasAlreadyDoneCleanup is true in the query', async () => {
    triggerCleanUpPackagePoliciesTaskMock.mockResolvedValue(undefined);

    const { result } = await callRoute({ hasAlreadyDoneCleanup: true });

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(triggerCleanUpPackagePoliciesTaskMock).toHaveBeenCalledWith(server);
  });

  it('fails the request when cleanup could not be scheduled', async () => {
    triggerCleanUpPackagePoliciesTaskMock.mockRejectedValue(new Error('already running'));

    const { response } = await callRoute();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Failed to schedule private location cleanup: already running',
      },
    });
  });
});
