/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';

export interface UseResolvedDocumentParams {
  /**
   * The `_id` of the document to resolve.
   */
  documentId: string | undefined;
  /**
   * Index, data stream, or alias the document was opened with.
   */
  indexName: string | undefined;
  /**
   * Data view the pinned document search runs against.
   */
  dataView: DataView;
  /**
   * `true` when the document cannot be fetched yet (no id/index, or the data view isn't usable).
   */
  skip: boolean;
}

export type ResolvedDocument =
  | { status: 'loading'; hit: null; refetch: () => void }
  | { status: 'found'; hit: DataTableRecord; refetch: () => void }
  | { status: 'notFound'; hit: null; refetch: () => void }
  | { status: 'error'; hit: null; refetch: () => void };

/**
 * Resolves one document by id.
 *
 * `useEsDocSearch` keeps returning the previously fetched hit while a new `id` is loading, so this
 * hook must be mounted once per document (the wrapper keys it by id and index) rather than reused
 * across ids. The hit's own `_index` is not compared with `indexName`: that one may be an alias or
 * data stream, in which case the hit reports the concrete backing index.
 */
export const useResolvedDocument = ({
  documentId,
  indexName,
  dataView,
  skip,
}: UseResolvedDocumentParams): ResolvedDocument => {
  const [requestState, hit, refetch] = useEsDocSearch({
    id: documentId ?? '',
    index: indexName,
    dataView,
    skip,
  });

  // A skipped search reports `Found` without a hit until it starts.
  if (
    skip ||
    requestState === ElasticRequestState.Loading ||
    (!hit && requestState === ElasticRequestState.Found)
  ) {
    return { status: 'loading', hit: null, refetch };
  }

  if (hit && requestState === ElasticRequestState.Found) {
    return { status: 'found', hit, refetch };
  }

  if (requestState === ElasticRequestState.NotFound) {
    return { status: 'notFound', hit: null, refetch };
  }

  return { status: 'error', hit: null, refetch };
};
