/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { RegisterServicesParams } from '../../../services/register_services';
import { hasOtelProfilingData } from './has_otel_profiling_data';
import { createGetOtelStatusService } from '.';

jest.mock('./has_otel_profiling_data', () => ({
  hasOtelProfilingData: jest.fn(),
}));

const mockedHasOtelProfilingData = jest.mocked(hasOtelProfilingData);

describe('createGetOtelStatusService', () => {
  const currentUserEsClient = {} as IScopedClusterClient['asCurrentUser'];
  const esClient = {
    asInternalUser: {},
    asCurrentUser: currentUserEsClient,
  } as IScopedClusterClient;
  const profilingClient = { name: 'current-user-profiling-client' };
  const createProfilingEsClient = jest.fn().mockReturnValue(profilingClient);
  const params = { createProfilingEsClient } as unknown as RegisterServicesParams;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])('reports OTel as available with hasData %s', async (hasData) => {
    mockedHasOtelProfilingData.mockResolvedValue(hasData);

    const getOtelStatus = createGetOtelStatusService(params);

    await expect(getOtelStatus({ esClient })).resolves.toEqual({ isAvailable: true, hasData });
    expect(mockedHasOtelProfilingData).toHaveBeenCalledWith({ client: profilingClient });
  });

  it('queries as the current user and passes the abort signal', async () => {
    mockedHasOtelProfilingData.mockResolvedValue(false);
    const abortSignal = new AbortController().signal;

    const getOtelStatus = createGetOtelStatusService(params);
    await getOtelStatus({ esClient, abortSignal });

    expect(createProfilingEsClient).toHaveBeenCalledWith({
      esClient: currentUserEsClient,
      abortSignal,
    });
  });

  it('rethrows errors from the data check', async () => {
    const error = new Error('security_exception');
    mockedHasOtelProfilingData.mockRejectedValue(error);

    const getOtelStatus = createGetOtelStatusService(params);

    await expect(getOtelStatus({ esClient })).rejects.toBe(error);
  });
});
