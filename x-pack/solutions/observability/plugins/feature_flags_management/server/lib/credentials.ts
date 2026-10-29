/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, randomBytes } from 'crypto';
import { CLIENT_ID_PREFIX, SDK_KEY_HINT_LENGTH, SDK_KEY_PREFIX } from '../../common/constants';

const RANDOM_BYTES = 32;

const randomToken = (prefix: string) =>
  `${prefix}${randomBytes(RANDOM_BYTES).toString('base64url')}`;

/** A secret, server-side SDK key. Only its hash is stored. */
export const generateSdkKey = (): string => randomToken(SDK_KEY_PREFIX);

/** A public client ID for browser SDKs. Stored in clear text. */
export const generateClientId = (): string => randomToken(CLIENT_ID_PREFIX);

/**
 * Hex-encoded SHA-256 of the whole SDK key, prefix included. Fleet Server hashes the
 * bearer token the same way to look the credential up.
 */
export const hashSdkKey = (sdkKey: string): string =>
  createHash('sha256').update(sdkKey, 'utf8').digest('hex');

export const sdkKeyHint = (sdkKey: string): string => sdkKey.slice(-SDK_KEY_HINT_LENGTH);
