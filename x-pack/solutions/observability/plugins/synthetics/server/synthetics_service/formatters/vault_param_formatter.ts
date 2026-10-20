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
 *     vault://<connection>@<secret-path>#<field>
 *
 * e.g. vault://staging@myapp/creds#password
 *
 * Heartbeat (`secret_stores`) resolves the same reference: `<connection>` is the `name` of
 * the `secret_stores` entry holding the connection, and is required. Kibana delivers every
 * connection a monitor references, and rejects a reference without a name or with an
 * unknown one.
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

// Heartbeat's own token pattern (its `referencePattern`): everything it will try to resolve,
// including characters it percent-decodes. Detection must be at least this broad so nothing
// it resolves goes unchecked; the match only starts at the beginning of a value or after a
// character outside [A-Za-z0-9+.-].
const VAULT_TOKEN_SOURCE = '(^|[^A-Za-z0-9+.\\-])vault://([A-Za-z0-9._~%@/#\\-]*)';

// The strict grammar a token must follow to be accepted.
const VAULT_REF_CONTENT = /^(?:([A-Za-z0-9._-]+)@)?([A-Za-z0-9._/-]+)#([A-Za-z0-9._-]+)$/;

export const VAULT_PATH_REGEX = /^[A-Za-z0-9._/-]+$/;
export const VAULT_FIELD_REGEX = /^[A-Za-z0-9._-]+$/;
export const SECRET_CONNECTION_NAME_REGEX = /^[A-Za-z0-9._-]+$/;

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
export const isValidSecretConnectionName = (c: string) => SECRET_CONNECTION_NAME_REGEX.test(c);

const PATH_ERROR = 'must contain only letters, numbers, and . _ - / (no "." or ".." segments)';
const FIELD_ERROR = 'must contain only letters, numbers, and . _ -';

/** Builds the reference stored as a vault-backed param's value: vault://<connection>@<path>#<field>. */
export const buildVaultReference = (path: string, field: string, connection: string): string => {
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
  if (!isValidSecretConnectionName(connection)) {
    throw new Error(
      `Invalid Vault connection name "${connection}": allowed characters are letters, numbers, and . _ -`
    );
  }
  return `vault://${connection}@${cleanPath}#${field}`;
};

interface VaultReference {
  connection?: string;
  path: string;
  field: string;
}

const tokenContents = (strVal: string): string[] =>
  Array.from(strVal.matchAll(new RegExp(VAULT_TOKEN_SOURCE, 'g')), (m) => m[2]);

const matchAll = (strVal: string): VaultReference[] =>
  tokenContents(strVal).flatMap((content) => {
    const m = VAULT_REF_CONTENT.exec(content);
    return m ? [{ connection: m[1] || undefined, path: m[2], field: m[3] }] : [];
  });

const toText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  return value && typeof value === 'object' ? JSON.stringify(value) : '';
};

/** Returns true if the given string contains at least one Vault reference. */
export const hasVaultReference = (strVal: string): boolean => matchAll(strVal).length > 0;

/**
 * Checks whether an arbitrary value (string, object, or array) contains anything Heartbeat
 * would treat as a Vault reference, well-formed or not. Objects/arrays are stringified.
 */
export const valueContainsVaultReference = (value: unknown): boolean =>
  tokenContents(toText(value)).length > 0;

/**
 * Extracts the { connection?, path, field } tuples referenced in a string. Used to
 * annotate the UI and to ship only the referenced connection to the agent.
 */
export const extractVaultReferences = (strVal: string): VaultReference[] => matchAll(strVal);

/**
 * The distinct connection names referenced in a value (`undefined` = a reference
 * without a name, which is invalid). Used to pick the connections delivered to an agent.
 */
export const referencedConnectionNames = (value: unknown): Set<string | undefined> =>
  new Set(extractVaultReferences(toText(value)).map(({ connection }) => connection));

/**
 * The `vault://` tokens in a value that Heartbeat would try to resolve but that do not follow
 * the strict reference grammar (for example `vault://prod@a%2Fb#c`, which Heartbeat decodes).
 * Callers must reject them: the checks that rely on {@link extractVaultReferences} cannot see
 * what they contain.
 */
export const findMalformedVaultReferences = (value: unknown): string[] =>
  tokenContents(toText(value))
    .filter((content) => !VAULT_REF_CONTENT.test(content))
    .map((content) => `vault://${content}`);

const MAX_TOKEN_PREVIEW = 64;

export const malformedVaultReferencesMessage = (tokens: string[]): string =>
  `${tokens
    .map((t) => `"${t.length > MAX_TOKEN_PREVIEW ? `${t.slice(0, MAX_TOKEN_PREVIEW)}…` : t}"`)
    .join(
      ', '
    )}. Use vault://<connection>@<path>#<field>, with only letters, numbers, and . _ - (and / in the path)`;

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
        .min(1)
        .max(MAX_REF_PART)
        .refine(isValidSecretConnectionName, { message: FIELD_ERROR })
        .describe('Name of the Vault connection to resolve the secret with.'),
    })
    .describe('Resolve the parameter value from HashiCorp Vault at runtime.')
);
