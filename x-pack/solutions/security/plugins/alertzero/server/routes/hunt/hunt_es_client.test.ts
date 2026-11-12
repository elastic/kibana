/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { huntEsClient } from './hunt_es_client';

describe('huntEsClient', () => {
  it('scopes the cluster client to the request with the space project routing', () => {
    const clusterClient = elasticsearchServiceMock.createClusterClient();
    const request = httpServerMock.createKibanaRequest();

    huntEsClient({ getClusterClient: () => clusterClient, request });

    expect(clusterClient.asScoped).toHaveBeenCalledWith(request, { projectRouting: 'space' });
  });

  it('returns the scoped current-user client', () => {
    const clusterClient = elasticsearchServiceMock.createClusterClient();
    const scoped = elasticsearchServiceMock.createScopedClusterClient();
    clusterClient.asScoped.mockReturnValue(scoped);

    const esClient = huntEsClient({
      getClusterClient: () => clusterClient,
      request: httpServerMock.createKibanaRequest(),
    });

    expect(esClient).toBe(scoped.asCurrentUser);
  });
});
