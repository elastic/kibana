/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Upserts `METADATA _index` onto the first FROM source list and appends `_index`
 * to any KEEP that would otherwise drop it. No-op when `_index` is already present.
 *
 * Only the FROM clause is rewritten. The rest of the pipeline (string literals,
 * comment lines, newlines) is left byte-identical aside from KEEP column lists.
 */
export const injectMetadataIndex = (query: string): string => {
  const trimmed = query.trim();
  // First pipeline pipe, with or without surrounding whitespace (FROM logs-*| WHERE …).
  const firstPipe = trimmed.search(/\|/);
  const fromRaw = firstPipe === -1 ? trimmed : trimmed.slice(0, firstPipe);
  const rest = firstPipe === -1 ? '' : trimmed.slice(firstPipe); // starts with |

  const fromPart = fromRaw.trim();
  if (!/^FROM\s+/i.test(fromPart)) {
    return trimmed;
  }

  const afterFrom = fromPart.replace(/^FROM\s+/i, '');
  const metadataMatch = afterFrom.match(/^(.*?)\s+METADATA\s+(.+)$/i);

  let nextFrom: string;
  if (metadataMatch) {
    const sources = metadataMatch[1].trim();
    const fields = metadataMatch[2]
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    nextFrom = fields.includes('_index')
      ? `FROM ${afterFrom}`
      : `FROM ${sources} METADATA ${[...fields, '_index'].join(', ')}`;
  } else {
    nextFrom = `FROM ${afterFrom} METADATA _index`;
  }

  if (!rest) {
    return nextFrom;
  }

  const withKeep = rest.replace(/(\|\s*KEEP\s+)([^|]+)/gi, (full, prefix: string, cols: string) => {
    const trailingWs = cols.match(/\s*$/)?.[0] ?? '';
    const columns = cols
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    if (columns.some((c) => c === '_index' || c === '*')) {
      return full;
    }
    return `${prefix}${[...columns, '_index'].join(', ')}${trailingWs}`;
  });

  // Keep the original whitespace (or lack of it) between FROM and the first `|`.
  const spacer = fromRaw.match(/\s*$/)?.[0] ?? '';
  return `${nextFrom}${spacer}${withKeep}`;
};

/**
 * Rewrites an existing `| LIMIT N` to `limit`, or appends one when absent.
 * Never appends a second LIMIT on top of an existing one.
 */
export const rewriteLimit = (query: string, limit: number): string => {
  const limitRe = /(\|\s*LIMIT\s+)\d+/i;
  if (limitRe.test(query)) {
    return query.replace(limitRe, `$1${limit}`);
  }
  return `${query.trimEnd()}\n| LIMIT ${limit}`;
};

/** Inject METADATA _index (when absent) and bind the row LIMIT for execute. */
export const prepareEsqlForExecute = (query: string, rowLimit: number): string =>
  rewriteLimit(injectMetadataIndex(query), rowLimit);
