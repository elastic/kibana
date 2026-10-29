/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VAULT_REFERENCE_CONTENT_REGEX } from '../../../common/lib/vault_reference';

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

interface VaultReference {
  connection?: string;
  path: string;
  field: string;
}

const tokenContents = (strVal: string): string[] =>
  Array.from(strVal.matchAll(new RegExp(VAULT_TOKEN_SOURCE, 'g')), (m) => m[2]);

const matchAll = (strVal: string): VaultReference[] =>
  tokenContents(strVal).flatMap((content) => {
    const m = VAULT_REFERENCE_CONTENT_REGEX.exec(content);
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
    .filter((content) => !VAULT_REFERENCE_CONTENT_REGEX.test(content))
    .map((content) => `vault://${content}`);

const MAX_TOKEN_PREVIEW = 64;

export const malformedVaultReferencesMessage = (tokens: string[]): string =>
  `${tokens
    .map((t) => `"${t.length > MAX_TOKEN_PREVIEW ? `${t.slice(0, MAX_TOKEN_PREVIEW)}…` : t}"`)
    .join(
      ', '
    )}. Use vault://<connection>@<path>#<field>, with only letters, numbers, and . _ - (and / in the path)`;
