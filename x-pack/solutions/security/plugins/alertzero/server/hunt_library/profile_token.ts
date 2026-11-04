/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { schema } from '@kbn/config-schema';
import {
  HUNT_PROFILE_TOKEN_MAX_BYTES,
  HUNT_PROFILE_TOKEN_TTL_SECONDS,
  HUNT_PROFILE_TOKEN_VERSION,
  type HuntProfileTokenPayload,
} from '../../common/hunt_library_profile_state';

const TOKEN_PREFIX = `v${HUNT_PROFILE_TOKEN_VERSION}`;

const payloadSchema = schema.object({
  v: schema.literal(HUNT_PROFILE_TOKEN_VERSION),
  spaceId: schema.string({ minLength: 1, maxLength: 256 }),
  definitionId: schema.string({ minLength: 1, maxLength: 64 }),
  definitionVersion: schema.number({ min: 1, max: 1_000_000 }),
  sessionId: schema.string({ minLength: 1, maxLength: 64 }),
  sessionExecutionId: schema.string({ minLength: 1, maxLength: 64 }),
  investigationId: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
  iat: schema.number({ min: 0 }),
  exp: schema.number({ min: 0 }),
});

export type HuntProfileTokenFailure =
  | 'malformed'
  | 'too_large'
  | 'bad_signature'
  | 'expired'
  | 'wrong_space';

export type HuntProfileTokenVerification =
  | { ok: true; payload: HuntProfileTokenPayload }
  | { ok: false; reason: HuntProfileTokenFailure };

export interface HuntProfileTokenClaims {
  spaceId: string;
  definitionId: string;
  definitionVersion: number;
  sessionId: string;
  sessionExecutionId: string;
  investigationId?: string;
}

const toBase64Url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

const sign = (key: string, signingInput: string) =>
  createHmac('sha256', key).update(signingInput).digest();

/**
 * Issues and verifies the signed state that lets Discover open in Hunt mode. The key is a secret
 * dedicated to this token, separate from the occurrence fingerprint key.
 */
export const createHuntProfileTokenSigner = ({
  key,
  now = () => Date.now(),
}: {
  key: string;
  now?: () => number;
}) => {
  const nowSeconds = () => Math.floor(now() / 1000);

  const issue = (claims: HuntProfileTokenClaims): string => {
    const iat = nowSeconds();
    const payload: HuntProfileTokenPayload = {
      v: HUNT_PROFILE_TOKEN_VERSION,
      spaceId: claims.spaceId,
      definitionId: claims.definitionId,
      definitionVersion: claims.definitionVersion,
      sessionId: claims.sessionId,
      sessionExecutionId: claims.sessionExecutionId,
      ...(claims.investigationId ? { investigationId: claims.investigationId } : {}),
      iat,
      exp: iat + HUNT_PROFILE_TOKEN_TTL_SECONDS,
    };
    const signingInput = `${TOKEN_PREFIX}.${toBase64Url(JSON.stringify(payload))}`;
    const token = `${signingInput}.${toBase64Url(sign(key, signingInput))}`;

    if (Buffer.byteLength(token) > HUNT_PROFILE_TOKEN_MAX_BYTES) {
      throw new Error('Hunt profile token exceeds the maximum size');
    }
    return token;
  };

  /** Checks size, shape, signature, expiry and that the token belongs to `spaceId`. */
  const verify = (
    token: unknown,
    { spaceId }: { spaceId: string }
  ): HuntProfileTokenVerification => {
    if (typeof token !== 'string') return { ok: false, reason: 'malformed' };
    if (Buffer.byteLength(token) > HUNT_PROFILE_TOKEN_MAX_BYTES) {
      return { ok: false, reason: 'too_large' };
    }

    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return { ok: false, reason: 'malformed' };
    const [, encodedPayload, encodedSignature] = parts;

    const expected = sign(key, `${TOKEN_PREFIX}.${encodedPayload}`);
    const actual = Buffer.from(encodedSignature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return { ok: false, reason: 'bad_signature' };
    }

    let payload: HuntProfileTokenPayload;
    try {
      payload = payloadSchema.validate(
        JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
      ) as HuntProfileTokenPayload;
    } catch {
      return { ok: false, reason: 'malformed' };
    }

    if (payload.exp <= nowSeconds()) return { ok: false, reason: 'expired' };
    if (payload.spaceId !== spaceId) return { ok: false, reason: 'wrong_space' };

    return { ok: true, payload };
  };

  return { issue, verify };
};

export type HuntProfileTokenSigner = ReturnType<typeof createHuntProfileTokenSigner>;
