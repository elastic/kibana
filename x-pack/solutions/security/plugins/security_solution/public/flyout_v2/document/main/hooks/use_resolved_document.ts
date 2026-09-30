/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { buildDataTableRecord, type DataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import type { RunTimeMappings } from '../../../../../common/api/search_strategy';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';

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
 * Resolves one document. A pinned `_index` search is the fast path; a data stream or alias misses
 * that filter, so a direct search of `indexName` runs before the document is reported missing.
 * A hit from a previous id is never returned.
 */
export const useResolvedDocument = ({
  documentId,
  indexName,
  dataView,
  skip,
}: UseResolvedDocumentParams): ResolvedDocument => {
  const [requestState, pinnedHit, refetchPinned] = useEsDocSearch({
    id: documentId ?? '',
    index: indexName,
    dataView,
    skip,
  });

  const pinnedNotFound = !skip && requestState === ElasticRequestState.NotFound;
  const runtimeMappings = useMemo(
    () =>
      (dataView && 'getRuntimeMappings' in dataView
        ? dataView.getRuntimeMappings()
        : {}) as RunTimeMappings,
    [dataView]
  );
  const [indexNameLoading, , indexNameSearchHit, , refetchIndexName] = useTimelineEventsDetails({
    indexName: indexName ?? '',
    eventId: documentId ?? '',
    runtimeMappings,
    skip: !pinnedNotFound,
  });

  // The direct search starts in an effect, one render after the pinned search reports not found.
  // Remember that this id was asked for, so that empty first render is still loading.
  const requestKey = `${documentId ?? ''}\0${indexName ?? ''}`;
  const [indexNameAttemptKey, setIndexNameAttemptKey] = useState<string | null>(null);
  useEffect(() => {
    setIndexNameAttemptKey(pinnedNotFound ? requestKey : null);
  }, [pinnedNotFound, requestKey]);
  const indexNameSettled = indexNameAttemptKey === requestKey && !indexNameLoading;

  const indexNameHit = useMemo(() => {
    if (!indexNameSettled || indexNameSearchHit?._id !== documentId) {
      return undefined;
    }
    return buildDataTableRecord(indexNameSearchHit as EsHitRecord);
  }, [documentId, indexNameSearchHit, indexNameSettled]);

  const refetch = useCallback(() => {
    refetchPinned();
    refetchIndexName();
  }, [refetchIndexName, refetchPinned]);

  const pinnedMatches =
    pinnedHit != null && pinnedHit.raw._id === documentId && pinnedHit.raw._index === indexName;

  if (
    skip ||
    requestState === ElasticRequestState.Loading ||
    (requestState === ElasticRequestState.Found && !pinnedMatches)
  ) {
    return { status: 'loading', hit: null, refetch };
  }

  if (pinnedMatches && pinnedHit) {
    return { status: 'found', hit: pinnedHit, refetch };
  }

  if (
    requestState === ElasticRequestState.Error ||
    requestState === ElasticRequestState.NotFoundDataView
  ) {
    return { status: 'error', hit: null, refetch };
  }

  if (!indexNameSettled) {
    return { status: 'loading', hit: null, refetch };
  }

  if (indexNameHit) {
    return { status: 'found', hit: indexNameHit, refetch };
  }

  return { status: 'notFound', hit: null, refetch };
};
