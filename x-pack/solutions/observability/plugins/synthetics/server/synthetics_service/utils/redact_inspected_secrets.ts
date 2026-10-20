/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../common/runtime_types';
import { secretKeys } from '../../../common/constants/monitor_management';

export const INSPECT_SECRET_REDACTED_VALUE = '********';

/**
 * Secret config keys that must NOT be redacted in the inspect output:
 * - `params` is already masked separately via the `hideParams` toggle.
 * - the source/script fields power the "Source code" panel (and browser
 *   `decodedCode`), so they are shown intentionally rather than being credentials.
 */
const INSPECT_UNREDACTED_SECRET_KEYS = new Set<string>([
  ConfigKey.PARAMS,
  ConfigKey.SOURCE_INLINE,
  ConfigKey.SOURCE_PROJECT_CONTENT,
]);

export const INSPECT_REDACTED_SECRET_KEYS: ReadonlySet<string> = new Set(
  secretKeys.filter((key) => !INSPECT_UNREDACTED_SECRET_KEYS.has(key))
);

/**
 * Fleet policy `vars` entries have a `{ value, type }` shape. Redact those in
 * place (keep `type` and any other metadata) so the redacted output still
 * matches the `PackagePolicy` type instead of collapsing to a bare string.
 */
const isFleetVarEntry = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val) && 'value' in val;

/**
 * Deep-clones `value`, replacing any object property whose key is a monitor
 * secret with a redacted placeholder. Applied to the inspect response so
 * credentials (password, TLS key, username, request/response checks, ...) are
 * never returned in plain text — in either the public config or the private
 * location's compiled Fleet policy (`compiled_stream`/`vars`).
 */
export const redactInspectedSecrets = <T>(
  value: T,
  keysToRedact: ReadonlySet<string> = INSPECT_REDACTED_SECRET_KEYS,
  keysToPreserve: ReadonlySet<string> = INSPECT_UNREDACTED_SECRET_KEYS
): T => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      redactInspectedSecrets(item, keysToRedact, keysToPreserve)
    ) as unknown as T;
  }

  if (value && typeof value === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (keysToRedact.has(key)) {
        redacted[key] = isFleetVarEntry(val)
          ? { ...val, value: INSPECT_SECRET_REDACTED_VALUE }
          : INSPECT_SECRET_REDACTED_VALUE;
      } else if (keysToPreserve.has(key)) {
        // Leave the subtree untouched: `params` is masked by `hideParams` and the
        // source/script fields power the "Source code" panel. Recursing here would
        // clobber those values (e.g. nested `username`/`password` param keys).
        redacted[key] = val;
      } else {
        redacted[key] = redactInspectedSecrets(val, keysToRedact, keysToPreserve);
      }
    }
    return redacted as T;
  }

  return value;
};
