/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { SortableScriptLibraryFields } from '../../../../../../common/endpoint/types';
import type { ListScriptsRequestQuery } from '../../../../../../common/api/endpoint';
import { useToasts } from '../../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { scriptsLibraryLabels as pageLabels } from '../../translations';
import { AdministrationListPage } from '../../../../components/administration_list_page';
import { useGetEndpointScriptsList } from '../../../../hooks/script_library';
import { ScriptsLibraryTable, type ScriptsLibraryTableProps } from './scripts_library_table';
import { useUrlPagination } from '../../../../hooks/use_url_pagination';
import { useScriptsLibraryUrlParams } from './scripts_library_url_params';

export const ScriptsLibrary = memo(() => {
  const { addDanger } = useToasts();
  const { pagination: paginationFromUrlParams } = useUrlPagination();
  const {
    kuery: kueryFromUrl,
    sortDirection: sortDirectionFromUrl,
    sortField: sortFieldFromUrl,
    setPagingAndSortingParams,
  } = useScriptsLibraryUrlParams();

  const { canReadScriptsLibrary } = useUserPrivileges().endpointPrivileges;
  const { search: searchParams } = useLocation();

  const [queryParams, setQueryParams] = useState<ListScriptsRequestQuery>({
    kuery: kueryFromUrl,
    sortField: sortFieldFromUrl as SortableScriptLibraryFields,
    sortDirection: sortDirectionFromUrl,
    page: paginationFromUrlParams.page,
    pageSize: paginationFromUrlParams.pageSize,
  });

  // update query state from URL params on page re-load or URL changes
  useEffect(() => {
    setQueryParams({
      kuery: kueryFromUrl,
      sortField: sortFieldFromUrl as SortableScriptLibraryFields,
      sortDirection: sortDirectionFromUrl,
      page: paginationFromUrlParams.page,
      pageSize: paginationFromUrlParams.pageSize,
    });
  }, [
    kueryFromUrl,
    sortDirectionFromUrl,
    sortFieldFromUrl,
    paginationFromUrlParams.page,
    paginationFromUrlParams.pageSize,
  ]);

  const {
    data: scriptsData,
    isFetching,
    isFetched,
    error: scriptsLibraryFetchError,
  } = useGetEndpointScriptsList(queryParams, {
    enabled: canReadScriptsLibrary,
    retry: false,
  });

  const totalItemCount = useMemo(() => scriptsData?.total ?? 0, [scriptsData?.total]);
  const tableItems = useMemo(() => scriptsData?.data ?? [], [scriptsData?.data]);

  const onChangeScriptsTable = useCallback<ScriptsLibraryTableProps['onChange']>(
    ({ page, sort }) => {
      const { index, size } = page;
      const pagingAndSortingArgs = {
        page: index + 1,
        pageSize: size,
        sortField: (sort?.field as SortableScriptLibraryFields) ?? 'name',
        sortDirection: sort?.direction ?? 'asc',
      };

      setQueryParams((prevState) => ({ ...prevState, ...pagingAndSortingArgs }));
      setPagingAndSortingParams({ ...pagingAndSortingArgs });
    },
    [setPagingAndSortingParams]
  );

  useEffect(() => {
    if (!isFetching && scriptsLibraryFetchError) {
      addDanger(scriptsLibraryFetchError?.body?.message || scriptsLibraryFetchError.message);
    }
  }, [scriptsLibraryFetchError, addDanger, isFetching]);

  return (
    <AdministrationListPage
      data-test-subj="scriptsLibraryPage"
      title={pageLabels.pageTitle}
      subtitle={pageLabels.pageAboutInfo}
      hideHeader={false}
    >
      {isFetched && (
        <ScriptsLibraryTable
          data-test-subj="scriptsLibraryTable"
          items={tableItems}
          isLoading={isFetching}
          onChange={onChangeScriptsTable}
          queryParams={queryParams}
          totalItemCount={totalItemCount}
          searchParams={searchParams}
          sort={{
            field: scriptsData?.sortField as SortableScriptLibraryFields,
            direction: scriptsData?.sortDirection,
          }}
        />
      )}
    </AdministrationListPage>
  );
});

ScriptsLibrary.displayName = 'ScriptsLibrary';
