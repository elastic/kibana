/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

// Matches ${vault/<path>#<field>} anywhere in a string.
export const VAULT_REF_REGEX = /\$\{vault\/[^#{}]+#[^{}]+\}/g;

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
 * Extracts the { path, field } pairs referenced in a string. Intended for UI
 * annotation / validation; not used for resolution (Kibana never resolves).
 */
export const extractVaultReferences = (strVal: string): Array<{ path: string; field: string }> => {
  VAULT_REF_REGEX.lastIndex = 0;
  const refs: Array<{ path: string; field: string }> = [];
  const matches = strVal.match(VAULT_REF_REGEX) ?? [];
  for (const match of matches) {
    // strip `${vault/` prefix and trailing `}`
    const inner = match.slice('${vault/'.length, -1);
    const hashIdx = inner.lastIndexOf('#');
    if (hashIdx <= 0 || hashIdx === inner.length - 1) {
      continue;
    }
    refs.push({ path: inner.slice(0, hashIdx), field: inner.slice(hashIdx + 1) });
  }
  return refs;
};
