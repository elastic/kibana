/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type {
  EntityURLStateResult,
  URLQuery,
} from '../../../../../entity_analytics/components/home/entities_table';

type SortOrder = [string, string];

interface UseEntityLocalTableStateArgs {
  /**
   * Pinned ES query container injected into `state.query.bool.filter`. Treated as
   * the *only* filter — the local-state hook intentionally exposes no UI for
   * adding filters from inside the case attachments accordion.
   */
  pinnedFilter: estypes.QueryDslQueryContainer;
  initialPageSize?: number;
  initialSort?: SortOrder[];
}

/**
 * Local-state replacement for `useEntityURLState`, intended for embedding the
 * entity analytics `EntitiesTableSection` inside surfaces that *must not*
 * touch the host page's URL / Redux global query / `filterManager` — most
 * notably the cases attachment "Entities" accordion, which would otherwise
 * hijack the case view's URL and filter pills.
 *
 * Returns the same `EntityURLStateResult` shape so it's a drop-in substitute
 * at the call site.
 *
 * --
 * POC NOTE — this is a fork (Option C in the design discussion). The
 * long-term home for this is **Option A**: extract a `useEntityTableBaseState`
 * primitive from `useEntityURLState` that both hooks compose. Once that
 * refactor lands in `entity_analytics/components/home/entities_table/hooks/`,
 * delete this file and import the base hook directly.
 *
 * @see x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/home/entities_table/hooks/use_entity_url_state.ts
 */
export const useEntityLocalTableState = ({
  pinnedFilter,
  initialPageSize = 25,
  initialSort = [['@timestamp', 'desc']],
}: UseEntityLocalTableStateArgs): EntityURLStateResult => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [sort, setSort] = useState<SortOrder[]>(initialSort);

  const query = useMemo(
    () => ({
      bool: {
        must: [],
        should: [],
        must_not: [],
        filter: [pinnedFilter],
      },
    }),
    [pinnedFilter]
  );

  const onChangeItemsPerPage = useCallback((next: number) => {
    setPageSize(next);
    setPageIndex(0);
  }, []);

  const onSort = useCallback((next: string[][]) => setSort(next as SortOrder[]), []);

  // No URL/Redux/filterManager backing here on purpose; `EntitiesDataTable`
  // and `useEntityGrouping` invoke `setUrlQuery` for sort/page/groupBy/filter
  // echoes. Page/sort already flow through dedicated callbacks; the rest are
  // intentionally dropped so accordion interactions stay local.
  const setUrlQuery = useCallback(() => undefined, []);
  const handleUpdateQuery = useCallback(() => undefined, []);
  const setTableOptions = useCallback(() => undefined, []);
  // No filter bar to reset inside the accordion.
  const onResetFilters = useCallback(() => undefined, []);

  const getRowsFromPages = useCallback(
    (data: Array<{ page: DataTableRecord[] }> | undefined): DataTableRecord[] =>
      data?.flatMap((p) => p.page) ?? [],
    []
  );

  // `urlQuery` is exposed on `EntityURLStateResult` for downstream consumers
  // that round-trip URL state; the table itself doesn't read it, so a stable
  // empty shape is sufficient.
  const urlQuery = useMemo<URLQuery>(
    () => ({
      query: { query: '', language: 'kuery' },
      filters: [],
      pageFilters: [],
    }),
    []
  );

  return {
    setUrlQuery,
    sort,
    filters: [],
    pageFilters: [],
    query,
    pageIndex,
    urlQuery,
    setTableOptions,
    handleUpdateQuery,
    pageSize,
    setPageSize: setPageSize as Dispatch<SetStateAction<number | undefined>>,
    onChangeItemsPerPage,
    onChangePage: setPageIndex,
    onSort,
    onResetFilters,
    // Column persistence is overridden via the `EntitiesTableConfig` we pass
    // to `EntitiesTableSection`, so this field exists only to satisfy the
    // shared `EntityURLStateResult` shape.
    columnsLocalStorageKey: '',
    getRowsFromPages,
  };
};
