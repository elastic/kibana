/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVAL_SANDBOX_HOST, EVAL_SANDBOX_PORT } from './constants';

export interface SandboxConnection {
  host: string;
  port: number;
  /** `<username>:<password>`, as sandbox-api expects it after `ApiKey `. */
  apiKey: string;
}

export interface OrcaConnection {
  url: string;
  /** Encoded Elasticsearch API key, sent as `ApiKey <apiKey>`. */
  apiKey: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Parses `host:port` or `https://host:port`, the forms the evals' `sandbox.url` uses. */
export const parseSandboxUrl = (value: string): { host: string; port: number } => {
  const url = new URL(value.includes('://') ? value : `https://${value}`);
  return { host: url.hostname, port: url.port ? Number(url.port) : EVAL_SANDBOX_PORT };
};

/** The Vault value the rotate script writes: only the `sandbox` block, as in the eval secrets. */
export const buildLocalDevSecret = ({
  username,
  password,
}: {
  username: string;
  password: string;
}) => ({
  description:
    'Shared sandbox credential for local Kibana development. Written by rotate_local_dev_sandbox_credential.js.',
  owner: 'nightshift',
  sandbox: {
    url: `${EVAL_SANDBOX_HOST}:${EVAL_SANDBOX_PORT}`,
    apiKey: `${username}:${password}`,
  },
});

/** Reads the `sandbox` block. Messages name fields only, never values. */
export const parseLocalDevSecret = (value: unknown, vaultPath: string): SandboxConnection => {
  const sandbox = isRecord(value) ? value.sandbox : undefined;
  if (!isRecord(sandbox) || !nonEmptyString(sandbox.url) || !nonEmptyString(sandbox.apiKey)) {
    throw new Error(`${vaultPath} has no sandbox.url and sandbox.apiKey`);
  }
  if (!sandbox.apiKey.includes(':')) {
    throw new Error(`sandbox.apiKey in ${vaultPath} is not <username>:<password>`);
  }
  return { ...parseSandboxUrl(sandbox.url), apiKey: sandbox.apiKey };
};

/** Reads the `nightshiftOrcaEs` block of the general evals secret. */
export const parseOrcaSecret = (value: unknown, vaultPath: string): OrcaConnection => {
  const orca = isRecord(value) ? value.nightshiftOrcaEs : undefined;
  if (!isRecord(orca) || !nonEmptyString(orca.url) || !nonEmptyString(orca.apiKey)) {
    throw new Error(`${vaultPath} has no nightshiftOrcaEs.url and nightshiftOrcaEs.apiKey`);
  }
  return { url: orca.url.replace(/\/+$/, ''), apiKey: orca.apiKey };
};

/**
 * Replaces every secret, and the password half of a `<username>:<password>` key, with
 * `<redacted>`. Subprocess and HTTP errors pass through this before they are shown.
 */
export const createRedactor = () => {
  const secrets = new Set<string>();
  return {
    add: (...values: Array<string | undefined>) => {
      for (const value of values) {
        if (!value) continue;
        secrets.add(value);
        const separator = value.indexOf(':');
        if (separator > 0 && separator < value.length - 1) secrets.add(value.slice(separator + 1));
        // The base64 form that ends up in Basic headers or Vault values.
        secrets.add(Buffer.from(value).toString('base64'));
      }
    },
    redact: (text: string): string =>
      [...secrets]
        .filter((secret) => secret.length >= 4)
        .sort((a, b) => b.length - a.length)
        .reduce((result, secret) => result.split(secret).join('<redacted>'), text),
  };
};

export type Redactor = ReturnType<typeof createRedactor>;
