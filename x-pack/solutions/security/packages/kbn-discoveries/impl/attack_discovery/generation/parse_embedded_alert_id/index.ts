/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Matches the `_id,<value>` line embedded in a candidate alert string, mirroring
 * the CSV alert shape produced by the default retrieval path (`getCsvFromData`),
 * where the backing document `_id` is rendered as its own `_id,<id>` line. The
 * line is not guaranteed to be first (CSV keys are sorted, so `@timestamp` can
 * precede `_id`), so the match is anchored per-line via the multiline flag.
 */
const EMBEDDED_ID_LINE = /^_id,(.+)$/m;

/**
 * Parses the backing Elasticsearch document `_id` embedded in a candidate alert
 * string. Returns the trimmed id, or `undefined` when the alert carries no
 * recoverable `_id` (Data fidelity principle 3 — id-less alerts are rejected at
 * the retrieval→gate boundary).
 */
export const parseEmbeddedAlertId = (alert: string): string | undefined => {
  const match = alert.match(EMBEDDED_ID_LINE);

  if (match == null) {
    return undefined;
  }

  const id = match[1].trim();

  return id.length > 0 ? id : undefined;
};
