/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';
import {
  buildHuntProfileLocatorState,
  HUNT_PROFILE_STATE_KEY,
  HUNT_PROFILE_TOKEN_MAX_BYTES,
  HUNT_PROFILE_TOKEN_TTL_SECONDS,
} from '../../common/hunt_library_profile_state';
import { createHuntProfileTokenSigner } from './profile_token';

const KEY = 'k'.repeat(40);
const NOW_MS = Date.parse('2026-11-04T12:00:00Z');
const claims = {
  spaceId: 'default',
  definitionId: 'lsass_rare_access',
  definitionVersion: 1,
  sessionId: '0b5d6f0e-6c35-4c3a-9a8c-2f6b1d3f9c11',
  sessionExecutionId: 'a8c1d5f2-3b7e-5f4a-9d10-6e2b8c4a7f13',
};

const createSigner = (now = NOW_MS) => createHuntProfileTokenSigner({ key: KEY, now: () => now });

const resign = (payload: Record<string, unknown>) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', KEY).update(`v1.${encoded}`).digest('base64url');
  return `v1.${encoded}.${signature}`;
};

describe('createHuntProfileTokenSigner', () => {
  it('round-trips a token and sets a 12 hour expiry', () => {
    const signer = createSigner();
    const result = signer.verify(signer.issue(claims), { spaceId: 'default' });

    expect(result).toEqual({
      ok: true,
      payload: {
        v: 1,
        ...claims,
        iat: NOW_MS / 1000,
        exp: NOW_MS / 1000 + HUNT_PROFILE_TOKEN_TTL_SECONDS,
      },
    });
    expect(HUNT_PROFILE_TOKEN_TTL_SECONDS).toBe(43200);
  });

  it('carries an investigation id when one is supplied', () => {
    const signer = createSigner();
    const result = signer.verify(signer.issue({ ...claims, investigationId: 'inv-1' }), {
      spaceId: 'default',
    });

    expect(result.ok && result.payload.investigationId).toBe('inv-1');
  });

  it('issues a token well under the size limit', () => {
    expect(Buffer.byteLength(createSigner().issue(claims))).toBeLessThan(
      HUNT_PROFILE_TOKEN_MAX_BYTES
    );
  });

  it('accepts a replay of the same token until it expires', () => {
    const token = createSigner().issue(claims);

    expect(createSigner(NOW_MS + 60_000).verify(token, { spaceId: 'default' }).ok).toBe(true);
    expect(createSigner(NOW_MS + 60_000).verify(token, { spaceId: 'default' }).ok).toBe(true);
  });

  it('rejects an expired token', () => {
    const token = createSigner().issue(claims);
    const later = NOW_MS + HUNT_PROFILE_TOKEN_TTL_SECONDS * 1000;

    expect(createSigner(later).verify(token, { spaceId: 'default' })).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('rejects a token issued for another space', () => {
    const signer = createSigner();

    expect(signer.verify(signer.issue(claims), { spaceId: 'other' })).toEqual({
      ok: false,
      reason: 'wrong_space',
    });
  });

  it('rejects a token signed with another key', () => {
    const other = createHuntProfileTokenSigner({ key: 'z'.repeat(40), now: () => NOW_MS });

    expect(createSigner().verify(other.issue(claims), { spaceId: 'default' })).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects a tampered payload', () => {
    const [prefix, , signature] = createSigner().issue(claims).split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ v: 1, ...claims, definitionId: 'other', iat: 1, exp: 9_999_999_999 })
    ).toString('base64url');

    expect(
      createSigner().verify(`${prefix}.${forgedPayload}.${signature}`, { spaceId: 'default' })
    ).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a correctly signed payload with an unexpected shape', () => {
    const signer = createSigner();
    const base = { v: 1, ...claims, iat: NOW_MS / 1000, exp: NOW_MS / 1000 + 60 };

    expect(signer.verify(resign({ ...base, extra: true }), { spaceId: 'default' })).toEqual({
      ok: false,
      reason: 'malformed',
    });
    expect(signer.verify(resign({ ...base, v: 2 }), { spaceId: 'default' })).toEqual({
      ok: false,
      reason: 'malformed',
    });
    expect(signer.verify(resign({ ...base, sessionId: '' }), { spaceId: 'default' })).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it.each([undefined, null, 42, {}, '', 'abc', 'v1.a', 'v2.a.b', 'v1.a.b.c'])(
    'rejects the malformed token %p',
    (token) => {
      expect(createSigner().verify(token, { spaceId: 'default' })).toEqual({
        ok: false,
        reason: 'malformed',
      });
    }
  );

  it('rejects a token over 4 KB before doing any work', () => {
    expect(
      createSigner().verify(`v1.${'a'.repeat(HUNT_PROFILE_TOKEN_MAX_BYTES)}.b`, {
        spaceId: 'default',
      })
    ).toEqual({ ok: false, reason: 'too_large' });
  });

  it('refuses to issue a token over 4 KB', () => {
    expect(() =>
      createSigner().issue({ ...claims, investigationId: 'i'.repeat(HUNT_PROFILE_TOKEN_MAX_BYTES) })
    ).toThrow('maximum size');
  });
});

describe('buildHuntProfileLocatorState', () => {
  it('wraps the token under the Hunt profile state key', () => {
    expect(buildHuntProfileLocatorState('tok')).toEqual({
      [HUNT_PROFILE_STATE_KEY]: { token: 'tok' },
    });
    expect(HUNT_PROFILE_STATE_KEY).toBe('huntSession');
  });
});
