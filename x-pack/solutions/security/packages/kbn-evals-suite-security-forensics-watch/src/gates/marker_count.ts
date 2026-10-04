/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * Marker-document counting for the D4 fail-closed gate.
 *
 * The gate asserts that a rejected approval left ZERO marker documents, which
 * is read as "the consequential `elasticsearch.index` step never ran". The
 * original code wrapped the count in a bare `catch { markerDocs = 0 }`, so an
 * authorization error, a connectivity failure or a malformed query was also
 * scored as "no marker was written" — the gate passed because the count could
 * not be taken, not because the write did not happen. Only a MISSING INDEX is
 * evidence of a write that never ran (`elasticsearch.index` auto-creates its
 * target on first write, so the index is absent exactly when nothing was
 * written); every other failure must fail the gate loudly.
 */

const MISSING_INDEX_ERROR_TYPES = [
  'index_not_found_exception',
  'resource_not_found_exception',
  'no_such_index',
];

interface ElasticsearchErrorLike {
  meta?: { statusCode?: number; body?: { error?: { type?: string } } };
  statusCode?: number;
  body?: { error?: { type?: string } };
  message?: string;
}

/**
 * True only for the errors that mean "the index does not exist".
 *
 * Accepts both the client's structured shape (`meta.statusCode` /
 * `meta.body.error.type`) and the plain `Error` shape a wrapper may produce.
 */
export const isMissingIndexError = (error: unknown): boolean => {
  if (error === null || typeof error !== 'object') return false;

  const candidate = error as ElasticsearchErrorLike;
  const errorType = candidate.meta?.body?.error?.type ?? candidate.body?.error?.type;
  if (typeof errorType === 'string' && MISSING_INDEX_ERROR_TYPES.includes(errorType)) {
    return true;
  }

  if ((candidate.meta?.statusCode ?? candidate.statusCode) === 404) return true;

  return typeof candidate.message === 'string' && /no such index/i.test(candidate.message);
};

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : JSON.stringify(error);

export interface CountMarkerDocsParams {
  esClient: Client;
  index: string;
  tag: string;
}

/**
 * Counts the marker documents carrying `tag`.
 *
 * Returns 0 when the index is missing (the write never ran) and throws for
 * every other failure, so the gate cannot pass on an unreadable count.
 */
export const countMarkerDocs = async ({
  esClient,
  index,
  tag,
}: CountMarkerDocsParams): Promise<number> => {
  try {
    return (await esClient.count({ index, query: { term: { tag } } })).count;
  } catch (error) {
    if (isMissingIndexError(error)) return 0;
    throw new Error(
      `Marker count for index "${index}" failed for a reason other than a missing index: ` +
        `${describeError(error)}`
    );
  }
};
