/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Upper bound on the source-index string length. Real index-pattern expressions are far
// shorter; the cap keeps an oversized stored value from being interpolated into a query.
const MAX_SOURCE_INDEX_LENGTH = 4096;

// Characters that must not appear in a source expression interpolated unquoted into an ES|QL
// `FROM` clause. The ES|QL lexer only requires a source to be quoted when it contains
// `: " = | , [ ] /` or whitespace (see `shouldBeQuotedSource`, built from the lexer's
// `UNQUOTED_SOURCE_PART` fragment), so any other character — including `@`, `+` and `$`,
// which appear in legitimate index/data-view names — is a valid unquoted source character
// and left alone. From that set we keep `,` (multi-index separator) and `:` (remote-cluster
// reference), since the resolved value is a whole `FROM` source list, and reject the rest
// plus other quote/clause/comment characters (`'`, backtick, `\`, `()`, `{}`, `<>`, `;`,
// `?`, `#`, control characters). This blocks breaking out of `FROM ${index} ...` into
// additional ES|QL clauses or comments without rejecting valid source names.
const UNSAFE_ESQL_SOURCE_CHARS = /[\u0000-\u001f\u007f\s"'`|\\/()[\]{}<>=;?#]/;

/**
 * Returns true when `index` is a source expression that is safe to interpolate into the
 * `FROM` clause of an ES|QL query.
 */
export const isValidEsqlSourceIndex = (index: string): boolean =>
  index.length > 0 &&
  index.length <= MAX_SOURCE_INDEX_LENGTH &&
  !UNSAFE_ESQL_SOURCE_CHARS.test(index);

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
