/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { createVerificationStore } from '../../lib/api_endpoints/verification_store';
import { apiEndpointsRouteRepository } from './route';

const RECEIPT = 'POST /internal/observability_onboarding/api_endpoints/receipt';

const receiptHandler = () =>
  (apiEndpointsRouteRepository as Record<string, { handler: (r: unknown) => Promise<unknown> }>)[
    RECEIPT
  ].handler;

const buildResources = ({
  store,
  token,
  authorization,
  body,
}: {
  store: ReturnType<typeof createVerificationStore>;
  token?: string;
  authorization?: string;
  body: Record<string, unknown>;
}) => ({
  config: { apiEndpoints: { collectorToKibanaToken: token } },
  logger: loggerMock.create(),
  request: { headers: { authorization } },
  services: { verificationStore: store },
  params: { body },
});

const seed = () => {
  const store = createVerificationStore({ now: () => 0 });
  store.register({
    verificationId: 'obs-onb-1',
    apiKeyId: 'key-1',
    endpointId: ApiEndpointId.Elasticsearch,
    ingestPath: 'managed_es_bulk',
    signal: 'logs',
  });
  return store;
};

const body = {
  verificationId: 'obs-onb-1',
  apiKeyId: 'key-1',
  endpointId: 'elasticsearch',
  ingestPath: 'managed_es_bulk',
  status: 'accepted',
  signal: 'logs',
};

describe('api endpoints receipt route', () => {
  it('exposes the receipt and verification endpoints', () => {
    expect(apiEndpointsRouteRepository[RECEIPT]).toBeDefined();
    expect(
      apiEndpointsRouteRepository[
        'GET /internal/observability_onboarding/api_endpoints/verification/{verificationId}'
      ]
    ).toBeDefined();
  });

  it('throws 503 when the token is not configured', async () => {
    const store = seed();
    await expect(
      receiptHandler()(
        buildResources({ store, token: undefined, authorization: 'Bearer c2k', body })
      )
    ).rejects.toMatchObject({ output: { statusCode: 503 } });
  });

  it('throws 401 for a wrong bearer token', async () => {
    const store = seed();
    await expect(
      receiptHandler()(buildResources({ store, token: 'c2k', authorization: 'Bearer nope', body }))
    ).rejects.toMatchObject({ output: { statusCode: 401 } });
  });

  it('marks the session accepted for a valid receipt', async () => {
    const store = seed();
    await receiptHandler()(
      buildResources({ store, token: 'c2k', authorization: 'Bearer c2k', body })
    );
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('accepted');
  });
});
