/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiEndpointId } from '../../../common/api_endpoints';
import { createVerificationStore } from './verification_store';
import { handleReceipt } from './handle_receipt';

const body = {
  verificationId: 'obs-onb-1',
  apiKeyId: 'key-1',
  endpointId: ApiEndpointId.Elasticsearch as string,
  ingestPath: 'managed_es_bulk',
  status: 'accepted' as const,
  signal: 'logs',
};

const seededStore = () => {
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

describe('handleReceipt', () => {
  it('returns 503 when the token is not configured', () => {
    const store = seededStore();
    expect(
      handleReceipt({
        store,
        collectorToKibanaToken: undefined,
        authorizationHeader: 'Bearer c2k',
        body,
      })
    ).toEqual({ statusCode: 503 });
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('waiting');
  });

  it('returns 503 when the configured token is empty and does not mutate the store', () => {
    const store = seededStore();
    expect(
      handleReceipt({ store, collectorToKibanaToken: '', authorizationHeader: 'Bearer c2k', body })
    ).toEqual({ statusCode: 503 });
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('waiting');
  });

  it('returns 401 when the bearer token is missing or wrong', () => {
    const store = seededStore();
    expect(
      handleReceipt({ store, collectorToKibanaToken: 'c2k', authorizationHeader: undefined, body })
    ).toEqual({ statusCode: 401 });
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('waiting');

    expect(
      handleReceipt({
        store,
        collectorToKibanaToken: 'c2k',
        authorizationHeader: 'Bearer nope',
        body,
      })
    ).toEqual({ statusCode: 401 });
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('waiting');
  });

  it('returns 401 when the bearer prefix is missing and does not mutate the store', () => {
    const store = seededStore();
    expect(
      handleReceipt({ store, collectorToKibanaToken: 'c2k', authorizationHeader: 'c2k', body })
    ).toEqual({ statusCode: 401 });
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('waiting');
  });

  it('returns 200 and marks the session accepted on a full match', () => {
    const store = seededStore();
    expect(
      handleReceipt({
        store,
        collectorToKibanaToken: 'c2k',
        authorizationHeader: 'Bearer c2k',
        body,
      })
    ).toEqual({ statusCode: 200 });
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('accepted');
  });

  it('returns 200 no-op when the session does not match', () => {
    const store = seededStore();
    expect(
      handleReceipt({
        store,
        collectorToKibanaToken: 'c2k',
        authorizationHeader: 'Bearer c2k',
        body: { ...body, ingestPath: 'wrong' },
      })
    ).toEqual({ statusCode: 200 });
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('waiting');
  });

  it('returns 200 no-op when the verificationId is unknown', () => {
    const store = seededStore();
    expect(
      handleReceipt({
        store,
        collectorToKibanaToken: 'c2k',
        authorizationHeader: 'Bearer c2k',
        body: { ...body, verificationId: 'obs-onb-unknown' },
      })
    ).toEqual({ statusCode: 200 });
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('waiting');
    expect(store.getByVerificationId('obs-onb-unknown')).toBeUndefined();
  });
});
