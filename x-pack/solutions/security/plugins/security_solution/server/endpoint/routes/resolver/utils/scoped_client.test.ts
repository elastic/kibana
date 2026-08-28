/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import { getResolverClusterClient } from './scoped_client';

describe('getResolverClusterClient', () => {
  const request = httpServerMock.createKibanaRequest();
  const originClient = elasticsearchServiceMock.createScopedClusterClient();
  let clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let getClusterClient: jest.Mock<Promise<IClusterClient>>;
  let context: SecuritySolutionRequestHandlerContext;

  beforeEach(() => {
    clusterClient = elasticsearchServiceMock.createClusterClient();
    getClusterClient = jest.fn().mockResolvedValue(clusterClient);
    context = {
      core: Promise.resolve({ elasticsearch: { client: originClient } }),
    } as unknown as SecuritySolutionRequestHandlerContext;
  });

  it('returns the origin-only client and does not fan out when platform CPS is off', async () => {
    const { client, cpsRead } = await getResolverClusterClient({
      context,
      request,
      getClusterClient,
      platformCpsEnabled: false,
    });

    expect(cpsRead).toBe(false);
    expect(client).toBe(originClient);
    expect(getClusterClient).not.toHaveBeenCalled();
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
  });

  it('returns a space-routed current-user client when platform CPS is on', async () => {
    const { client, cpsRead } = await getResolverClusterClient({
      context,
      request,
      getClusterClient,
      platformCpsEnabled: true,
    });

    expect(cpsRead).toBe(true);
    expect(getClusterClient).toHaveBeenCalledTimes(1);
    expect(clusterClient.asScoped).toHaveBeenCalledWith(request, { projectRouting: 'space' });
    expect(client).toBe(clusterClient.asScoped.mock.results[0].value);
  });
});
