/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A branded string type that statically prevents empty strings (`''`) from
 * being passed where a meaningful value is required.
 *
 * Plain `string` allows `''` to slip through `!= null` guards, which caused
 * EIS connectors to silently fail: an empty `action_type_id` bypassed the
 * connector-resolution lookup in `resolveConnectorDetails`, so the connector
 * type was never resolved to `.inference` and the LLM call failed silently.
 *
 * Use `asNonEmpty()` at system boundaries (workflow step inputs, parsed
 * request bodies) to convert untrusted `string | undefined` values into
 * `NonEmptyString | undefined` before passing them to functions that accept
 * this type.
 */
export type NonEmptyString = string & { readonly _brand: 'NonEmptyString' };

/**
 * Converts a `string | undefined` to `NonEmptyString | undefined`.
 *
 * Returns `undefined` for empty strings and `undefined` input, ensuring
 * that downstream consumers treat `''` the same as a missing value.
 */
export const asNonEmpty = (s: string | undefined): NonEmptyString | undefined => {
  if (!s) {
    return undefined;
  }

  return s as NonEmptyString;
};
