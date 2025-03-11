/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_NUMBER = 1;

interface UsePaginationArgs {
  pageSizeOptions?: number[];
  pageSizeDefault?: number;
  pageNumberDefault?: number;
}

type TableItem = Record<string, unknown>;

export const usePagination = <T extends TableItem>(args: UsePaginationArgs) => {
  const pageSizeOptions = args.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;
  const pageSizeDefault = args.pageSizeDefault ?? pageSizeOptions[0];
  const pageNumberDefault = args.pageNumberDefault ?? DEFAULT_PAGE_NUMBER;

  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [pageNumber, setPageNumber] = useState(pageNumberDefault);
  const [totalItemCount, setTotalItemCount] = useState(0);

  const state = useMemo(() => {
    return {
      pageSizeOptions,
      pageSize,
      pageNumber,
      pageIndex: pageNumber - 1,
      totalItemCount,
    };
  }, [pageSizeOptions, pageSize, pageNumber, totalItemCount]);

  const update = useCallback(
    (criteria: CriteriaWithPagination<T>): void => {
      setPageNumber(criteria.page.index + 1);
      setPageSize(criteria.page.size);
    },
    [setPageNumber, setPageSize]
  );

  const updateTotalItemCount = useCallback(
    (count: number | null | undefined): void => {
      setTotalItemCount(count ?? 0);
    },
    [setTotalItemCount]
  );

  return useMemo(
    () => ({ state, update, updateTotalItemCount }),
    [state, update, updateTotalItemCount]
  );
};
