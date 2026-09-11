/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { INGEST_RECEIPTS_DATA_STREAM } from '../../../common/ingest_receipts';
import { apiEndpointsRouteRepository } from './route';

const verificationEndpoint =
  'GET /internal/observability_onboarding/api_endpoints/verification' as const;

const createEsResponseError = (statusCode: number, body: Record<string, unknown>) =>
  new errors.ResponseError({
    statusCode,
    body,
    headers: {},
    warnings: [],
    meta: {} as TransportResult['meta'],
  });

describe('verification query codec', () => {
  const { params } = apiEndpointsRouteRepository[verificationEndpoint];

  it.each(['opentelemetry', 'prometheus', 'elasticsearch'])('accepts %s', (endpointId) => {
    expect(isRight(params.decode({ query: { apiKeyId: 'key-id', endpointId } }))).toBe(true);
  });

  it.each(['supabase', 'vercel', 'netlify'])(
    'rejects %s because it never produces receipts',
    (endpointId) => {
      expect(isRight(params.decode({ query: { apiKeyId: 'key-id', endpointId } }))).toBe(false);
    }
  );

  it('requires the API key id', () => {
    expect(isRight(params.decode({ query: { endpointId: 'opentelemetry' } }))).toBe(false);
  });
});

describe('verification handler', () => {
  const { handler } = apiEndpointsRouteRepository[verificationEndpoint];

  const getApiKey = jest.fn();
  const search = jest.fn();

  const createResources = ({
    apiKeyId = 'key-id',
    endpointId = ApiEndpointId.OpenTelemetry,
  }: { apiKeyId?: string; endpointId?: ApiEndpointId } = {}) =>
    ({
      context: {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asCurrentUser: { security: { getApiKey } },
              asInternalUser: { search },
            },
          },
        }),
      },
      params: { query: { apiKeyId, endpointId } },
    } as unknown as Parameters<typeof handler>[0]);

  beforeEach(() => {
    jest.clearAllMocks();
    getApiKey.mockResolvedValue({ api_keys: [{ id: 'key-id' }] });
    search.mockResolvedValue({ hits: { hits: [] } });
  });

  it('returns 404 without searching when the caller owns no active key with that id', async () => {
    getApiKey.mockResolvedValue({ api_keys: [] });

    await expect(handler(createResources())).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('returns 404 when Elasticsearch does not know the id at all', async () => {
    getApiKey.mockRejectedValue(createEsResponseError(404, { api_keys: [] }));

    await expect(handler(createResources())).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('propagates ownership check failures other than a missing id', async () => {
    getApiKey.mockRejectedValue(createEsResponseError(503, { error: 'unavailable' }));

    await expect(handler(createResources())).rejects.toMatchObject({ statusCode: 503 });
    expect(search).not.toHaveBeenCalled();
  });

  it('checks ownership with the current user before reading receipts', async () => {
    await handler(createResources());

    expect(getApiKey).toHaveBeenCalledWith({ id: 'key-id', owner: true, active_only: true });
  });

  it('rejects an API key id longer than 64 characters with 400', async () => {
    await expect(handler(createResources({ apiKeyId: 'a'.repeat(65) }))).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
    expect(getApiKey).not.toHaveBeenCalled();
  });

  it('reports the latest receipt timestamp when a receipt exists', async () => {
    search.mockResolvedValue({
      hits: { hits: [{ _source: { '@timestamp': '2026-09-11T10:00:00.000Z' } }] },
    });

    await expect(handler(createResources())).resolves.toEqual({
      received: true,
      lastReceivedAt: '2026-09-11T10:00:00.000Z',
    });
  });

  it('reports nothing received when the search returns no hit', async () => {
    await expect(handler(createResources())).resolves.toEqual({ received: false });
  });

  it('tolerates a missing receipts stream instead of failing the request', async () => {
    await handler(createResources());

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: INGEST_RECEIPTS_DATA_STREAM,
        ignore_unavailable: true,
      })
    );
  });

  it('filters on the API key id, the endpoint id and the recency window', async () => {
    await handler(createResources({ endpointId: ApiEndpointId.Prometheus }));

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 1,
        query: {
          bool: {
            filter: [
              { term: { apiKeyId: 'key-id' } },
              { term: { endpointId: 'prometheus' } },
              { range: { '@timestamp': { gte: 'now-15m' } } },
            ],
          },
        },
      })
    );
  });

  it('propagates search failures other than a missing stream', async () => {
    search.mockRejectedValue(new Error('search_phase_execution_exception'));

    await expect(handler(createResources())).rejects.toThrow('search_phase_execution_exception');
  });
});
