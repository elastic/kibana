/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * HashiCorp Vault reference support (POC).
 *
 * A Vault reference lets a monitor field (or a global param value) point at a
 * secret stored in HashiCorp Vault instead of embedding the secret in Kibana.
 * The reference uses the syntax:
 *
 *     ${vault/<secret-path>#<field>}
 *
 * e.g. ${vault/myapp/creds#password}
 *
 * Contract (this is the entire Kibana-side responsibility):
 *
 *   Kibana MUST NOT resolve these references. It stores and forwards the token
 *   verbatim into the generated Fleet package policy. The plaintext secret is
 *   resolved at the edge, at runtime, by Heartbeat (which authenticates to the
 *   customer's Vault and expands the token during config unpack). This keeps the
 *   secret entirely within the customer's trust boundary — it never touches
 *   Kibana or Elasticsearch.
 *
 * The `/` and `#` characters are deliberately chosen: they fall OUTSIDE the
 * global-param grammar (`SHELL_PARAMS_REGEX`), so the existing param
 * substitution in `replaceStringWithParams` already leaves Vault references
 * untouched. This module makes that behavior explicit and testable, and exposes
 * helpers the UI can use to detect/annotate Vault-backed fields.
 */

// Matches ${vault/[<connection>@]<path>#<field>} anywhere in a string.
export const VAULT_REF_REGEX = /\$\{vault\/[^#{}]+#[^{}]+\}/g;

// Charset allowlists for the parts of a ${vault/[<connection>@]<path>#<field>}
// reference. These keep the token opaque and un-injectable: without them a field
// like `f}${otherParam` would close the token early and let the trailing fragment
// match SHELL_PARAMS_REGEX (substituted with another global param's value), and
// `@`, `#`, `{`, `}` would corrupt parsing/delivery.
export const VAULT_PATH_REGEX = /^[A-Za-z0-9._/-]+$/;
export const VAULT_FIELD_REGEX = /^[A-Za-z0-9._-]+$/;
export const VAULT_CONNECTION_NAME_REGEX = /^[A-Za-z0-9._-]+$/;

// Generous upper bound for any single reference part (path/field/connection).
const MAX_REF_PART = 1024;

const stripSlashes = (p: string) => p.replace(/^\/+|\/+$/g, '');

export const isValidVaultPath = (p: string) => VAULT_PATH_REGEX.test(stripSlashes(p));
export const isValidVaultField = (f: string) => VAULT_FIELD_REGEX.test(f);
export const isValidVaultConnectionName = (c: string) => VAULT_CONNECTION_NAME_REGEX.test(c);

/**
 * Builds the edge-resolved reference token stored as a vault-backed param's
 * value. With a connection name it emits ${vault/<connection>@<path>#<field>}
 * (routes to that named Vault connection); without one it emits
 * ${vault/<path>#<field>} (the default connection). Heartbeat expands the token
 * at runtime.
 */
export const buildVaultReference = (path: string, field: string, connection?: string): string => {
  const cleanPath = stripSlashes(path);
  // Defense in depth: routes validate the same charset via config-schema, but a
  // bad token here would silently corrupt the compiled agent policy, so refuse to
  // build one rather than emit something injectable.
  if (!VAULT_PATH_REGEX.test(cleanPath)) {
    throw new Error(
      `Invalid Vault path "${path}": allowed characters are letters, numbers, and . _ - /`
    );
  }
  if (!VAULT_FIELD_REGEX.test(field)) {
    throw new Error(
      `Invalid Vault field "${field}": allowed characters are letters, numbers, and . _ -`
    );
  }
  if (connection && !VAULT_CONNECTION_NAME_REGEX.test(connection)) {
    throw new Error(
      `Invalid Vault connection name "${connection}": allowed characters are letters, numbers, and . _ -`
    );
  }
  const prefix = connection ? `vault/${connection}@` : 'vault/';
  return '${' + prefix + cleanPath + '#' + field + '}';
};

/**
 * Returns true if the given string contains at least one Vault reference.
 */
export const hasVaultReference = (strVal: string): boolean => {
  // Reset lastIndex because the regex is declared with the global flag.
  VAULT_REF_REGEX.lastIndex = 0;
  return VAULT_REF_REGEX.test(strVal);
};

/**
 * Checks whether an arbitrary value (string, object, or array) contains a Vault
 * reference. Objects/arrays are stringified before matching.
 */
export const valueContainsVaultReference = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return hasVaultReference(value);
  }
  if (typeof value === 'object') {
    return hasVaultReference(JSON.stringify(value));
  }
  return false;
};

/**
 * Extracts the { connection?, path, field } tuples referenced in a string.
 * Understands both the default form (${vault/<path>#<field>}) and the named form
 * (${vault/<connection>@<path>#<field>}). Used to annotate the UI and — crucially
 * — to ship only the referenced connections to the agent (not every connection in
 * the space). Kibana never resolves the reference.
 */
export const extractVaultReferences = (
  strVal: string
): Array<{ connection?: string; path: string; field: string }> => {
  VAULT_REF_REGEX.lastIndex = 0;
  const refs: Array<{ connection?: string; path: string; field: string }> = [];
  const matches = strVal.match(VAULT_REF_REGEX) ?? [];
  for (const match of matches) {
    // strip `${vault/` prefix and trailing `}`
    const inner = match.slice('${vault/'.length, -1);
    const hashIdx = inner.lastIndexOf('#');
    if (hashIdx <= 0 || hashIdx === inner.length - 1) {
      continue;
    }
    let spec = inner.slice(0, hashIdx);
    const field = inner.slice(hashIdx + 1);
    // Split an optional `<connection>@` prefix off the path.
    let connection: string | undefined;
    const atIdx = spec.indexOf('@');
    if (atIdx >= 0) {
      connection = spec.slice(0, atIdx) || undefined;
      spec = spec.slice(atIdx + 1);
    }
    refs.push({ connection, path: spec, field });
  }
  return refs;
};

/**
 * The distinct connection names referenced in a value (undefined = the default
 * connection). Used to scope which connections are delivered to an agent.
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
 * Shared request schema for a vault-backed param `source`, with the charset +
 * length validation the reference grammar depends on. Used by both the add and
 * edit param routes so the two never drift.
 */
export const VaultParamSourceSchema = schema.object({
  type: schema.literal('vault'),
  path: schema.string({
    minLength: 1,
    maxLength: MAX_REF_PART,
    validate: (v) =>
      isValidVaultPath(v) ? undefined : 'must contain only letters, numbers, and . _ - /',
  }),
  field: schema.string({
    minLength: 1,
    maxLength: MAX_REF_PART,
    validate: (v) =>
      VAULT_FIELD_REGEX.test(v) ? undefined : 'must contain only letters, numbers, and . _ -',
  }),
  connection: schema.maybe(
    schema.string({
      maxLength: MAX_REF_PART,
      validate: (v) =>
        v === '' || VAULT_CONNECTION_NAME_REGEX.test(v)
          ? undefined
          : 'must contain only letters, numbers, and . _ -',
    })
  ),
});
