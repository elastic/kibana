/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { Filter } from '@kbn/es-query';
import { LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY } from '../../../common/constants';
import { FindingsBaseURLQuery } from '../../../common/types';
import { useCloudPostureDataTable } from '../../../common/hooks/use_cloud_posture_data_table';
import { useLatestVulnerabilities } from './use_latest_vulnerabilities';

const columnsLocalStorageKey = 'cloudPosture:latestVulnerabilities:columns';

export const useLatestVulnerabilitiesTable = ({
  getDefaultQuery,
  nonPersistedFilters,
}: {
  getDefaultQuery: (params: FindingsBaseURLQuery) => FindingsBaseURLQuery;
  nonPersistedFilters?: Filter[];
}) => {
  const cloudPostureDataTable = useCloudPostureDataTable({
    paginationLocalStorageKey: LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY,
    columnsLocalStorageKey,
    defaultQuery: getDefaultQuery,
    nonPersistedFilters,
  });

  const { query, sort, queryError, getRowsFromPages, pageSize } = cloudPostureDataTable;

  const {
    data,
    error: fetchError,
    isFetching,
    fetchNextPage,
  } = useLatestVulnerabilities({
    query,
    sort,
    enabled: !queryError,
    pageSize,
  });

  const rows = useMemo(() => getRowsFromPages(data?.pages), [data?.pages, getRowsFromPages]);
  const total = data?.pages[0].total || 0;

  const error = fetchError || queryError;

  return {
    cloudPostureDataTable,
    rows,
    error,
    isFetching,
    fetchNextPage,
    total,
  };
};
