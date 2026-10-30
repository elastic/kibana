/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Upper bound on the source-index string length. Real index-pattern expressions are far
// shorter; the cap keeps an oversized stored value from being interpolated into a query.
const MAX_SOURCE_INDEX_LENGTH = 4096;

// Characters allowed in an ES|QL `FROM` index expression: index-name characters, the `*`
// wildcard, the `,` multi-index separator, `-` exclusions, `.` and `_`, and `:` for
// remote-cluster references. Everything else — whitespace, quotes, backticks, pipes,
// parentheses, and the `/` that forms ES|QL comments — is excluded, so a stored value
// cannot break out of `FROM ${index} ...` into additional ES|QL clauses or comments.
const SAFE_ESQL_SOURCE_INDEX = /^[a-zA-Z0-9_.\-,:*]+$/;

/**
 * Returns true when `index` is a source-index expression that is safe to interpolate into
 * the `FROM` clause of an ES|QL query.
 */
export const isValidEsqlSourceIndex = (index: string): boolean =>
  index.length > 0 && index.length <= MAX_SOURCE_INDEX_LENGTH && SAFE_ESQL_SOURCE_INDEX.test(index);

/**
 * Throws when `index` cannot be safely interpolated into an ES|QL `FROM` clause. The risk
 * scoring source index derives from the user-writable `dataViewId`, so validating it here
 * prevents ES|QL injection into queries the engine runs as the internal user.
 */
export const assertValidEsqlSourceIndex = (index: string): void => {
  if (!isValidEsqlSourceIndex(index)) {
    throw new Error(
      `Risk scoring source index ${index} is not a valid index expression and cannot be used in an ES|QL query`
    );
  }
};
