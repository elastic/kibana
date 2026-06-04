/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KibanaServices } from '../../../common/lib/kibana';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type {
  GetTimelinesResponse,
  PageInfoTimeline,
  SortTimeline,
  TimelineResponse,
} from '../../../../common/api/timeline';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import { INTERNAL_TIMELINE_BY_IDS_URL } from '../../../../common/constants';
import { getTimelineQueryTypes } from '../../../timelines/containers/helpers';
import type { OpenTimelineResult } from '../../../timelines/components/open_timeline/types';
import { TIMELINE_ERROR_TITLE } from './translations';

// Local copy of the mapper in `timelines/containers/all` so this module does not
// pull in `useGetAllTimeline` and its Redux dependency graph (keeps the bundle and
// unit-test memory footprint small).
const toOpenTimelineResults = memoizeOne(
  (_variables: string, timelines: TimelineResponse[]): OpenTimelineResult[] =>
    timelines.map((timeline) => ({
      created: timeline.created,
      description: timeline.description,
      eventIdToNoteIds:
        timeline.eventIdToNoteIds != null
          ? timeline.eventIdToNoteIds.reduce((acc, note) => {
              if (note.eventId != null) {
                const notes = getOr([], note.eventId, acc);
                return { ...acc, [note.eventId]: [...notes, note.noteId] };
              }
              return acc;
            }, {})
          : null,
      excludedRowRendererIds: timeline.excludedRowRendererIds,
      favorite: timeline.favorite,
      noteIds: timeline.noteIds,
      notes:
        timeline.notes != null
          ? timeline.notes.map((note) => ({ ...note, savedObjectId: note.noteId }))
          : null,
      pinnedEventIds:
        timeline.pinnedEventIds != null
          ? timeline.pinnedEventIds.reduce(
              (acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }),
              {}
            )
          : null,
      savedObjectId: timeline.savedObjectId,
      savedSearchId: timeline.savedSearchId,
      status: timeline.status,
      title: timeline.title,
      updated: timeline.updated,
      updatedBy: timeline.updatedBy,
      timelineType: timeline.timelineType ?? TimelineTypeEnum.default,
      templateTimelineId: timeline.templateTimelineId,
      queryType: getTimelineQueryTypes(timeline),
    }))
);

export interface UseGetTimelinesByIdsArgs {
  ids: string[];
  pageInfo: PageInfoTimeline;
  search?: string;
  sort?: SortTimeline;
}

export interface UseGetTimelinesByIdsResult {
  timelines: OpenTimelineResult[];
  totalCount: number;
  loading: boolean;
  refetch: () => void;
}

/**
 * Fetches timelines by saved-object id via the internal `POST /internal/timeline/_by_ids`
 * route. Used by the case attachments timeline tab; intentionally lighter weight than
 * `useGetAllTimeline` (no Redux/global inputs / refresh registration).
 */
const EMPTY_RESULT = {
  timelines: [] as OpenTimelineResult[],
  totalCount: 0,
  loading: false,
};

export const useGetTimelinesByIds = ({
  ids,
  pageInfo,
  search,
  sort,
}: UseGetTimelinesByIdsArgs): UseGetTimelinesByIdsResult => {
  const { addError } = useAppToasts();
  const [state, setState] = useState<{
    timelines: OpenTimelineResult[];
    totalCount: number;
    loading: boolean;
  }>(EMPTY_RESULT);

  // Track the latest request key so out-of-order responses (and stale state writes
  // when callers pass new array references for the same ids) are dropped.
  const requestKeyRef = useRef<string>('');

  // Build stable primitive keys so unstable array/object identities from callers
  // do not retrigger fetches when the actual content has not changed.
  const idsKey = ids.join(',');
  const sortField = sort?.sortField;
  const sortOrder = sort?.sortOrder;

  const fetch = useCallback(async () => {
    const idsForRequest = idsKey === '' ? [] : idsKey.split(',');

    const body = {
      ids: idsForRequest,
      pageSize: pageInfo.pageSize,
      pageIndex: pageInfo.pageIndex,
      ...(search ? { search } : {}),
      ...(sortField ? { sortField } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const key = JSON.stringify(body);
    requestKeyRef.current = key;

    if (idsForRequest.length === 0) {
      setState((prev) =>
        prev.timelines.length === 0 && prev.totalCount === 0 && !prev.loading ? prev : EMPTY_RESULT
      );
      return;
    }

    const abortCtrl = new AbortController();
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await KibanaServices.get().http.post<GetTimelinesResponse>(
        INTERNAL_TIMELINE_BY_IDS_URL,
        {
          body: JSON.stringify(body),
          version: '1',
          signal: abortCtrl.signal,
        }
      );
      if (requestKeyRef.current !== key) return;

      const timelines = toOpenTimelineResults(
        key,
        (response?.timeline ?? []) as TimelineResponse[]
      );
      setState({
        timelines,
        totalCount: response?.totalCount ?? 0,
        loading: false,
      });
    } catch (error) {
      if (requestKeyRef.current !== key) return;
      addError(error?.body?.message ? new Error(error.body.message) : error, {
        title: TIMELINE_ERROR_TITLE,
      });
      setState({ timelines: [], totalCount: 0, loading: false });
    }
  }, [idsKey, pageInfo.pageSize, pageInfo.pageIndex, search, sortField, sortOrder, addError]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
};
