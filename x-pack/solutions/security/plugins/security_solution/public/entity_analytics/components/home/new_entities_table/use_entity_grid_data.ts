/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';
import { ENTITY_GRID_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import type { TimeRange, EntityGridResponse } from './constants';

export const useEntityGridData = ({
  sortField,
  sortDirection,
  pageIndex,
  pageSize,
  cursors,
  onNextCursor,
  filter,
  timeRange,
  view = 'resolved',
}: {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pageIndex: number;
  pageSize: number;
  cursors: Array<string | null>;
  onNextCursor: (pageIndex: number, cursor: string) => void;
  filter?: object;
  timeRange: TimeRange;
  view?: 'resolved' | 'raw';
}) => {
  const { http } = useKibana().services;
  const cursor = cursors[pageIndex] ?? null;
  // Keep the last known total so rowCount never collapses to 0 during page transitions.
  const [cachedTotal, setCachedTotal] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const { data, isFetching } = useQuery(
    ['entity-grid', sortField, sortDirection, pageIndex, pageSize, cursor, filter, timeRange, view],
    async () => {
      const result = await http.post<EntityGridResponse>(ENTITY_GRID_INTERNAL_URL, {
        version: '1',
        body: JSON.stringify({
          sort: { field: sortField, direction: sortDirection },
          page_size: pageSize,
          time_range: timeRange,
          view,
          ...(cursor ? { cursor } : {}),
          ...(filter ? { filter } : {}),
        }),
      });
      return result;
    },
    {
      onSuccess: (result) => {
        if (result.total != null) setCachedTotal(result.total);
        if (result.next_cursor && !cursors[pageIndex + 1]) {
          onNextCursor(pageIndex + 1, result.next_cursor);
        }
        setUpdatedAt(Date.now());
      },
    }
  );

  return {
    rows: data?.entities ?? [],
    total: cachedTotal,
    updatedAt,
    isFetching,
    // True once the current page has loaded and there is no further page.
    isLastPage: data != null && data.next_cursor == null,
  };
};
