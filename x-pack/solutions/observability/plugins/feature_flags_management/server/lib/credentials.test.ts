/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { generateClientId, generateSdkKey, hashSdkKey, sdkKeyHint } from './credentials';

// 32 random bytes in unpadded base64url.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

describe('credentials', () => {
  it('generates prefixed, random SDK keys', () => {
    const key = generateSdkKey();
    expect(key.startsWith('ffsdk-')).toBe(true);
    expect(key.slice('ffsdk-'.length)).toMatch(TOKEN_PATTERN);
    expect(generateSdkKey()).not.toEqual(key);
  });

  it('generates prefixed, random client IDs', () => {
    const clientId = generateClientId();
    expect(clientId.startsWith('ffcli-')).toBe(true);
    expect(clientId.slice('ffcli-'.length)).toMatch(TOKEN_PATTERN);
    expect(generateClientId()).not.toEqual(clientId);
  });

  it('hashes the whole SDK key, prefix included, as SHA-256 hex', () => {
    const key = 'ffsdk-abc';
    expect(hashSdkKey(key)).toEqual(createHash('sha256').update(key).digest('hex'));
    expect(hashSdkKey(key)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps the last 4 characters as the hint', () => {
    expect(sdkKeyHint('ffsdk-abcdef')).toEqual('cdef');
  });
});
