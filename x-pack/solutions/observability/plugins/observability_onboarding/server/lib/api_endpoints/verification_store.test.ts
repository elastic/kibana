/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiEndpointId } from '../../../common/api_endpoints';
import { createVerificationId, createVerificationStore } from './verification_store';

const baseRegister = {
  verificationId: 'obs-onb-1',
  apiKeyId: 'key-1',
  endpointId: ApiEndpointId.Elasticsearch,
  ingestPath: 'managed_es_bulk',
  signal: 'logs',
};

describe('createVerificationId', () => {
  it('produces an opaque obs-onb prefixed id', () => {
    expect(createVerificationId()).toMatch(/^obs-onb-[0-9a-f-]{36}$/);
  });
});

describe('createVerificationStore', () => {
  it('registers a waiting session and reads it back by verificationId', () => {
    const store = createVerificationStore({ now: () => 0, ttlMs: 1000 });
    store.register(baseRegister);
    const session = store.getByVerificationId('obs-onb-1');
    expect(session?.status).toBe('waiting');
    expect(session?.detectionActive).toBe(false);
    expect(session?.expiresAt).toBe(new Date(1000).toISOString());
  });

  it('treats an expired session as absent', () => {
    let nowMs = 0;
    const store = createVerificationStore({ now: () => nowMs, ttlMs: 1000 });
    store.register(baseRegister);
    nowMs = 1000;
    expect(store.getByVerificationId('obs-onb-1')).toBeUndefined();
  });

  it('sweeps expired sessions on register to bound idle memory growth', () => {
    let nowMs = 0;
    const store = createVerificationStore({ now: () => nowMs, ttlMs: 1000 });
    store.register({ ...baseRegister, verificationId: 'obs-onb-1' });
    expect(store.size()).toBe(1);
    nowMs = 1000;
    store.register({ ...baseRegister, verificationId: 'obs-onb-2' });
    expect(store.size()).toBe(1);
    expect(store.getByVerificationId('obs-onb-1')).toBeUndefined();
    expect(store.getByVerificationId('obs-onb-2')?.status).toBe('waiting');
  });

  it('setDetectionActive updates the flag', () => {
    const store = createVerificationStore({ now: () => 0, ttlMs: 1000 });
    store.register(baseRegister);
    store.setDetectionActive('obs-onb-1', true);
    expect(store.getByVerificationId('obs-onb-1')?.detectionActive).toBe(true);
  });

  it('marks accepted only on full match of apiKeyId, endpointId and ingestPath', () => {
    const store = createVerificationStore({ now: () => 0, ttlMs: 1000 });
    store.register(baseRegister);
    expect(
      store.markAccepted({
        verificationId: 'obs-onb-1',
        apiKeyId: 'key-1',
        endpointId: ApiEndpointId.Elasticsearch,
        ingestPath: 'managed_es_bulk',
      })
    ).toBe('accepted');
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('accepted');
  });

  it('no_match when ingestPath differs', () => {
    const store = createVerificationStore({ now: () => 0, ttlMs: 1000 });
    store.register(baseRegister);
    expect(
      store.markAccepted({
        verificationId: 'obs-onb-1',
        apiKeyId: 'key-1',
        endpointId: ApiEndpointId.Elasticsearch,
        ingestPath: 'wrong',
      })
    ).toBe('no_match');
    expect(store.getByVerificationId('obs-onb-1')?.status).toBe('waiting');
  });

  it('no_match on unknown or expired session', () => {
    let nowMs = 0;
    const store = createVerificationStore({ now: () => nowMs, ttlMs: 1000 });
    store.register(baseRegister);
    nowMs = 1000;
    expect(
      store.markAccepted({
        verificationId: 'obs-onb-1',
        apiKeyId: 'key-1',
        endpointId: ApiEndpointId.Elasticsearch,
        ingestPath: 'managed_es_bulk',
      })
    ).toBe('no_match');
  });

  it('is idempotent and coalesced on a repeat matching receipt', () => {
    let nowMs = 0;
    const store = createVerificationStore({ now: () => nowMs, ttlMs: 1000 });
    store.register(baseRegister);
    const match = {
      verificationId: 'obs-onb-1',
      apiKeyId: 'key-1',
      endpointId: ApiEndpointId.Elasticsearch,
      ingestPath: 'managed_es_bulk',
      receivedAt: '2026-07-07T09:00:00.000Z',
      signal: 'metrics',
    };
    expect(store.markAccepted(match)).toBe('accepted');
    const afterFirstAccept = store.getByVerificationId('obs-onb-1');
    expect(afterFirstAccept?.receivedAt).toBe('2026-07-07T09:00:00.000Z');
    expect(afterFirstAccept?.signal).toBe('metrics');

    nowMs = 500;
    expect(
      store.markAccepted({
        ...match,
        receivedAt: '2026-07-07T10:00:00.000Z',
        signal: 'logs',
      })
    ).toBe('accepted');
    const afterRepeatAccept = store.getByVerificationId('obs-onb-1');
    expect(afterRepeatAccept?.receivedAt).toBe('2026-07-07T09:00:00.000Z');
    expect(afterRepeatAccept?.signal).toBe('metrics');
  });
});
