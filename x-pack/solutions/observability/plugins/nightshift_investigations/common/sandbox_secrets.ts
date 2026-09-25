/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SANDBOX_SECRETS_API_PATH = '/internal/nightshift/sandbox_secrets';

export const SANDBOX_SECRET_KEY_REGEX = /^[A-Z_][A-Z0-9_]*$/;
export const MAX_SANDBOX_SECRET_KEY_LENGTH = 128;
/** Shorter values could not be redacted from sandbox output without mangling unrelated text. */
export const MIN_SANDBOX_SECRET_VALUE_LENGTH = 8;
export const MAX_SANDBOX_SECRET_VALUE_LENGTH = 16384;
export const MAX_SANDBOX_SECRETS = 100;
export const MAX_SANDBOX_SECRETS_VERSION_LENGTH = 256;

const RESERVED_SANDBOX_SECRET_KEYS: ReadonlySet<string> = new Set([
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'PWD',
]);
const RESERVED_SANDBOX_SECRET_KEY_PREFIX = 'CONNECTOR_';

/** Returns a validation error message for a sandbox secret key, or `undefined` when it is valid. */
export const validateSandboxSecretKey = (key: string): string | undefined => {
  if (key.length === 0) {
    return 'must not be empty';
  }
  if (key.length > MAX_SANDBOX_SECRET_KEY_LENGTH) {
    return `must be at most ${MAX_SANDBOX_SECRET_KEY_LENGTH} characters`;
  }
  if (!SANDBOX_SECRET_KEY_REGEX.test(key)) {
    return 'must contain only upper-case letters, digits and underscores, and must not start with a digit';
  }
  if (RESERVED_SANDBOX_SECRET_KEYS.has(key) || key.startsWith(RESERVED_SANDBOX_SECRET_KEY_PREFIX)) {
    return `is reserved (PATH, HOME, USER, SHELL, PWD and ${RESERVED_SANDBOX_SECRET_KEY_PREFIX}* cannot be used)`;
  }
  return undefined;
};

/**
 * Returns a validation error message for a sandbox secret value, or `undefined` when it is
 * valid. The single source of truth for both bounds, so the API, the server client and the
 * flyout apply the same rule instead of checking the two lengths in different places.
 */
export const validateSandboxSecretValue = (value: string): string | undefined => {
  if (value.length < MIN_SANDBOX_SECRET_VALUE_LENGTH) {
    return `must be at least ${MIN_SANDBOX_SECRET_VALUE_LENGTH} characters long`;
  }
  if (value.length > MAX_SANDBOX_SECRET_VALUE_LENGTH) {
    return `must be at most ${MAX_SANDBOX_SECRET_VALUE_LENGTH} characters long`;
  }
  return undefined;
};

export interface SandboxSecretEntry {
  key: string;
  /** New value; omit to keep the currently stored value for an existing key. */
  value?: string;
}

export interface GetSandboxSecretsResponse {
  keys: string[];
  version?: string;
  canEncrypt: boolean;
}

export interface PutSandboxSecretsRequest {
  entries: SandboxSecretEntry[];
  version?: string;
}

export interface PutSandboxSecretsResponse {
  keys: string[];
  version?: string;
}
