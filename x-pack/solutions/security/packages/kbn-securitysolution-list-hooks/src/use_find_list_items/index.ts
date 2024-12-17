/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { findListItems, ApiParams } from '@kbn/securitysolution-list-api';
import { withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { useCursor } from '../use_cursor';

const findListItemsWithOptionalSignal = withOptionalSignal(findListItems);

const FIND_LIST_ITEMS_QUERY_KEY = 'FIND_LIST_ITEMS';

export const useInvalidateListItemQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries([FIND_LIST_ITEMS_QUERY_KEY], {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useFindListItems = ({
  pageIndex,
  pageSize,
  sortField,
  sortOrder,
  listId,
  filter,
  http,
}: {
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  listId: string;
  filter: string;
  http: ApiParams['http'];
}) => {
  const [cursor, setCursor] = useCursor({ pageIndex, pageSize });
  return useQuery(
    [FIND_LIST_ITEMS_QUERY_KEY, pageIndex, pageSize, sortField, sortOrder, listId, filter],
    async ({ signal }) => {
      const response = await findListItemsWithOptionalSignal({
        http,
        signal,
        pageIndex,
        pageSize,
        sortField,
        sortOrder,
        listId,
        cursor,
        filter,
      });
      return response;
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: false,
      onSuccess: (data) => {
        if (data?.cursor) {
          setCursor(data?.cursor);
        }
      },
    }
  );
};
