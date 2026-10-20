/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { ProfilingSchemasStatus } from '@kbn/profiling-utils';
import type { InfraRequestHandlerContext } from '../../../types';
import { fetchProfilingStatus } from './fetch_profiling_status';

describe('fetchProfilingStatus', () => {
  it('returns the profiling status of both schemas in the space', async () => {
    const status: ProfilingSchemasStatus = {
      isEnabled: true,
      otel: { isAvailable: true, hasData: true },
      universalProfiling: {
        isAvailable: true,
        hasSetup: false,
        hasData: false,
        hasLegacyData: false,
      },
    };
    const getStatus = jest.fn().mockResolvedValue(status);
    const esClient = {};
    const soClient = {};

    await expect(
      fetchProfilingStatus(
        { services: { getStatus } } as unknown as ProfilingDataAccessPluginStart,
        {
          elasticsearch: { client: esClient },
          savedObjects: { client: soClient },
        } as unknown as CoreRequestHandlerContext,
        { spaceId: 'my-space' } as InfraRequestHandlerContext
      )
    ).resolves.toBe(status);

    expect(getStatus).toHaveBeenCalledWith({ esClient, soClient, spaceId: 'my-space' });
  });
});
