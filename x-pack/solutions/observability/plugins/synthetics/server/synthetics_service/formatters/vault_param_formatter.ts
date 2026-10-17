/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

/**
 * HashiCorp Vault reference support.
 *
 * A Vault reference lets a monitor field (or a global param value) point at a
 * secret stored in HashiCorp Vault instead of embedding the secret in Kibana.
 * Kibana-side reference syntax:
 *
 *     vault://[<connection>@]<secret-path>#<field>
 *
 * e.g. vault://myapp/creds#password or vault://staging@myapp/creds#password
 *
 * Heartbeat (secret_stores) understands `vault://<path>#<field>` and, today, a
 * single `vault` entry per monitor. The optional `<connection>@` prefix is a Kibana
 * concept: it picks which of the space's connections is delivered to the monitor.
 * It is stripped from the policy at the Kibana/Heartbeat boundary
 * (`stripVaultConnectionNames`), so Heartbeat never sees it.
 *
 * Contract (the entire Kibana-side responsibility):
 *
 *   Kibana MUST NOT resolve these references. It stores and forwards them into the
 *   generated Fleet package policy. The plaintext secret is resolved at the edge,
 *   at runtime, by Heartbeat (which authenticates to the customer's Vault), so it
 *   never touches Kibana or Elasticsearch.
 *
 * The reference contains no `${`, so global-param substitution
 * (`replaceStringWithParams`) already leaves it untouched. The charset allowlists
 * below keep it opaque: nothing in a path/field/connection can end the token early
 * and have the remainder parsed as something else.
 */

// Heartbeat only matches a reference at the start of a value or after a character
// outside [A-Za-z0-9+.-]; mirror that so Kibana detects exactly what Heartbeat resolves.
const VAULT_REF_SOURCE =
  '(^|[^A-Za-z0-9+.\\-])vault://(?:([A-Za-z0-9._-]+)@)?([A-Za-z0-9._/-]+)#([A-Za-z0-9._-]+)';

export const VAULT_PATH_REGEX = /^[A-Za-z0-9._/-]+$/;
export const VAULT_FIELD_REGEX = /^[A-Za-z0-9._-]+$/;
export const VAULT_CONNECTION_NAME_REGEX = /^[A-Za-z0-9._-]+$/;

// Generous upper bound for any single reference part (path/field/connection).
const MAX_REF_PART = 1024;

const stripSlashes = (p: string) => p.replace(/^\/+|\/+$/g, '');

// Heartbeat rejects "." / ".." segments (the Vault client would read outside the KV mount).
const hasDotSegment = (path: string) => path.split('/').some((s) => s === '.' || s === '..');

export const isValidVaultPath = (p: string) => {
  const clean = stripSlashes(p);
  return VAULT_PATH_REGEX.test(clean) && !hasDotSegment(clean);
};
export const isValidVaultField = (f: string) => VAULT_FIELD_REGEX.test(f);
export const isValidVaultConnectionName = (c: string) => VAULT_CONNECTION_NAME_REGEX.test(c);

const PATH_ERROR = 'must contain only letters, numbers, and . _ - / (no "." or ".." segments)';
const FIELD_ERROR = 'must contain only letters, numbers, and . _ -';

/**
 * Builds the reference stored as a vault-backed param's value. With a connection
 * name it emits vault://<connection>@<path>#<field>; without one,
 * vault://<path>#<field> (the default connection).
 */
export const buildVaultReference = (path: string, field: string, connection?: string): string => {
  const cleanPath = stripSlashes(path);
  // Defense in depth: routes validate the same charset, but a bad token here would
  // silently corrupt the compiled agent policy, so refuse to build one.
  if (!isValidVaultPath(cleanPath)) {
    throw new Error(
      `Invalid Vault path "${path}": allowed characters are letters, numbers, and . _ - / (no "." or ".." segments)`
    );
  }
  if (!isValidVaultField(field)) {
    throw new Error(
      `Invalid Vault field "${field}": allowed characters are letters, numbers, and . _ -`
    );
  }
  if (connection && !isValidVaultConnectionName(connection)) {
    throw new Error(
      `Invalid Vault connection name "${connection}": allowed characters are letters, numbers, and . _ -`
    );
  }
  const prefix = connection ? `${connection}@` : '';
  return `vault://${prefix}${cleanPath}#${field}`;
};

interface VaultReference {
  connection?: string;
  path: string;
  field: string;
}

const matchAll = (strVal: string): VaultReference[] =>
  Array.from(strVal.matchAll(new RegExp(VAULT_REF_SOURCE, 'g')), (m) => ({
    connection: m[2] || undefined,
    path: m[3],
    field: m[4],
  }));

/** Returns true if the given string contains at least one Vault reference. */
export const hasVaultReference = (strVal: string): boolean =>
  new RegExp(VAULT_REF_SOURCE).test(strVal);

/**
 * Checks whether an arbitrary value (string, object, or array) contains a Vault
 * reference. Objects/arrays are stringified before matching.
 */
export const valueContainsVaultReference = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return hasVaultReference(value);
  }
  if (value && typeof value === 'object') {
    return hasVaultReference(JSON.stringify(value));
  }
  return false;
};

/**
 * Extracts the { connection?, path, field } tuples referenced in a string. Used to
 * annotate the UI and to ship only the referenced connection to the agent.
 */
export const extractVaultReferences = (strVal: string): VaultReference[] => matchAll(strVal);

/**
 * The distinct connection names referenced in a value (undefined = the default
 * connection). Used to scope which connection is delivered to an agent.
 */
export const referencedConnectionNames = (value: unknown): Set<string | undefined> => {
  const names = new Set<string | undefined>();
  const scan = (s: string) => extractVaultReferences(s).forEach((r) => names.add(r.connection));
  if (typeof value === 'string') {
    scan(value);
  } else if (value && typeof value === 'object') {
    scan(JSON.stringify(value));
  }
  return names;
};

/**
 * Removes the Kibana-only `<connection>@` prefix from every reference, leaving the
 * `vault://<path>#<field>` form Heartbeat resolves. Non-string values are rewritten
 * through JSON only when they actually contain a named reference.
 */
export const stripVaultConnectionNames = <T>(value: T): T => {
  const rewrite = (s: string) =>
    s.replace(
      new RegExp(VAULT_REF_SOURCE, 'g'),
      (_m, lead, _conn, path, field) => `${lead}vault://${path}#${field}`
    );
  if (typeof value === 'string') {
    return rewrite(value) as T;
  }
  if (value && typeof value === 'object') {
    const json = JSON.stringify(value);
    const rewritten = rewrite(json);
    return rewritten === json ? value : (JSON.parse(rewritten) as T);
  }
  return value;
};

/**
 * Shared request schema for a vault-backed param `source`, with the charset +
 * length validation the reference grammar depends on. Used by both the add and
 * edit param routes so the two never drift.
 */
export const VaultParamSourceSchema = lazySchema(() =>
  z
    .strictObject({
      type: z.literal('vault'),
      path: z
        .string()
        .min(1)
        .max(MAX_REF_PART)
        .refine(isValidVaultPath, { message: PATH_ERROR })
        .describe('Secret path under the KV mount, for example `myapp/creds`.'),
      field: z
        .string()
        .min(1)
        .max(MAX_REF_PART)
        .refine(isValidVaultField, { message: FIELD_ERROR })
        .describe('Field of the secret to read.'),
      connection: z
        .string()
        .max(MAX_REF_PART)
        .refine((v) => v === '' || isValidVaultConnectionName(v), { message: FIELD_ERROR })
        .optional()
        .describe('Name of the Vault connection to use. Omit to use the default connection.'),
    })
    .describe('Resolve the parameter value from HashiCorp Vault at runtime.')
);
