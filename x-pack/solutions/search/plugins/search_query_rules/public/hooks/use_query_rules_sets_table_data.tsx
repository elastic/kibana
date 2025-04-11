/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { Pagination } from '@elastic/eui';
import { QueryRulesListRulesetsQueryRulesetListItem } from '@elastic/elasticsearch/lib/api/types';

interface UseQueryRulesSetsTableDataProps {
  queryRulesSetsFilteredData: QueryRulesListRulesetsQueryRulesetListItem[];
  pagination: Pagination;
}

export const useQueryRulesSetsTableData = (
  data: QueryRulesListRulesetsQueryRulesetListItem[] | undefined,
  searchKey: string,
  pageIndex: number,
  pageSize: number
): UseQueryRulesSetsTableDataProps => {
  const queryRulesSetsFilteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => item.ruleset_id.toLowerCase().includes(searchKey.toLowerCase()));
  }, [data, searchKey]);

  const pagination: Pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: queryRulesSetsFilteredData.length,
      pageSizeOptions: [10, 25, 50],
    }),
    [queryRulesSetsFilteredData.length, pageIndex, pageSize]
  );

  return { queryRulesSetsFilteredData, pagination };
};
