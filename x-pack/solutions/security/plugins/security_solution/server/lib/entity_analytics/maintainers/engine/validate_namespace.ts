/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Conservative pattern for namespaces that the engine substitutes into
 * `FROM logs-…-${namespace}` ES|QL fragments and the eight `indexPattern`
 * callbacks. We constrain the charset to an alnum-leading subset that
 * Elasticsearch index names allow, which incidentally rejects every
 * character that could break out of the FROM clause (whitespace,
 * backticks, quotes, commas, semicolons, parentheses, asterisks, etc.).
 *
 * Intentionally narrower than Kibana's user-facing space ID rules — namespace
 * is a task-supplied value with no user-controlled vector today, so the
 * tradeoff favours a tight allowlist over user-friendly error messages.
 */
export const NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,99}$/;

export class InvalidNamespaceError extends Error {
  constructor(namespace: string) {
    super(
      `Invalid namespace ${JSON.stringify(namespace)}: must match ${NAMESPACE_PATTERN.source} ` +
        `(lowercase alnum-leading, plus '_' or '-', max 100 chars).`
    );
    this.name = 'InvalidNamespaceError';
  }
}

/**
 * Validate the namespace at the engine boundary, before it flows into
 * any `indexPattern(namespace)` callback or override-supplied ES|QL
 * fragment. Throws on rejection so the caller fails fast with an
 * actionable error rather than producing a malformed query.
 *
 * Defense-in-depth: callers (scheduled task, etc.) already constrain
 * namespace upstream, but trusting a single validator at the engine
 * boundary is cheaper and stronger than auditing every caller plus the
 * eight `indexPattern` callbacks plus the Azure override fn.
 */
export function assertValidNamespace(namespace: string): void {
  if (!NAMESPACE_PATTERN.test(namespace)) {
    throw new InvalidNamespaceError(namespace);
  }
}
