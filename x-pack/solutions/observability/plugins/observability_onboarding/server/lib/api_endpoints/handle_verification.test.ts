/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiEndpointId } from '../../../common/api_endpoints';
import { createVerificationStore } from './verification_store';
import { handleVerification } from './handle_verification';

const register = {
  verificationId: 'obs-onb-1',
  apiKeyId: 'key-1',
  endpointId: ApiEndpointId.Elasticsearch,
  ingestPath: 'managed_es_bulk',
  signal: 'logs',
};

describe('handleVerification', () => {
  it('returns expired for an unknown verificationId', () => {
    const store = createVerificationStore({ now: () => 0 });
    expect(handleVerification({ store, verificationId: 'missing' })).toEqual({
      status: 'expired',
      detectionActive: false,
    });
  });

  it('returns the waiting session with detectionActive', () => {
    const store = createVerificationStore({ now: () => 0 });
    store.register(register);
    store.setDetectionActive('obs-onb-1', true);
    expect(handleVerification({ store, verificationId: 'obs-onb-1' })).toEqual({
      status: 'waiting',
      detectionActive: true,
      endpointId: ApiEndpointId.Elasticsearch,
      ingestPath: 'managed_es_bulk',
      signal: 'logs',
      lastSeen: undefined,
    });
  });

  it('returns accepted with lastSeen', () => {
    const store = createVerificationStore({ now: () => 0 });
    store.register(register);
    store.markAccepted({
      verificationId: 'obs-onb-1',
      apiKeyId: 'key-1',
      endpointId: ApiEndpointId.Elasticsearch,
      ingestPath: 'managed_es_bulk',
      receivedAt: '2026-07-07T16:47:12.000Z',
    });
    const result = handleVerification({ store, verificationId: 'obs-onb-1' });
    expect(result.status).toBe('accepted');
    expect(result.lastSeen).toBe('2026-07-07T16:47:12.000Z');
  });
});
