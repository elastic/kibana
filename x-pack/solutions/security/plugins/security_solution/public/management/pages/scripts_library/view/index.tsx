/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import type {
  EndpointScript,
  SortableScriptLibraryFields,
} from '../../../../../common/endpoint/types';
import type { ListScriptsRequestQuery } from '../../../../../common/api/endpoint';
import { useToasts } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { scriptsLibraryLabels as i18n } from '../translations';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { useGetEndpointScriptsLibrary } from './hooks/use_get_scripts_library';
import {
  ScriptsLibraryTable,
  type ScriptsLibraryTableProps,
} from './components/scripts_library_table';
import { useUrlPagination } from '../../../hooks/use_url_pagination';
import { useScriptsLibraryUrlParams } from './components/scripts_library_url_params';
import { ScriptDeleteModal } from './components/script_delete_modal';

export const ScriptsLibrary = () => {
  const { addDanger } = useToasts();
  const { pagination: paginationFromUrlParams } = useUrlPagination();

  const {
    kuery: kueryFromUrl,
    sortDirection: sortDirectionFromUrl,
    sortField: sortFieldFromUrl,
    setScriptsLibraryUrlParams,
  } = useScriptsLibraryUrlParams();
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<undefined | EndpointScript>(
    undefined
  );

  const { canReadScriptsLibrary } = useUserPrivileges().endpointPrivileges;

  const [queryParams, setQueryParams] = useState<ListScriptsRequestQuery>({
    kuery: kueryFromUrl?.length ? kueryFromUrl : '',
    sortField: sortFieldFromUrl as SortableScriptLibraryFields,
    sortDirection: sortDirectionFromUrl,
    page: paginationFromUrlParams.page,
    pageSize: paginationFromUrlParams.pageSize,
  });

  const {
    data: scriptsData,
    isFetching,
    isFetched,
    error: scriptsLibraryFetchError,
    refetch: reFetchEndpointScriptsLibrary,
  } = useGetEndpointScriptsLibrary(queryParams, { enabled: canReadScriptsLibrary, retry: false });

  const totalItemCount = useMemo(() => scriptsData?.total ?? 0, [scriptsData?.total]);
  const tableItems = useMemo(() => scriptsData?.data ?? [], [scriptsData?.data]);

  const onChangeScriptsTable = useCallback<ScriptsLibraryTableProps['onChange']>(
    ({ page, sort }) => {
      const pagingArgs = {
        page: page?.index ? page.index + 1 : 1,
        pageSize: page?.size ? page.size : 10,
      };

      const sortingArgs = {
        sortField: sort?.field as SortableScriptLibraryFields,
        sortDirection: sort?.direction,
      };
      setQueryParams((prevState) => ({ ...prevState, ...pagingArgs, ...sortingArgs }));
      setScriptsLibraryUrlParams({ ...pagingArgs, ...sortingArgs });

      reFetchEndpointScriptsLibrary();
    },
    [reFetchEndpointScriptsLibrary, setQueryParams, setScriptsLibraryUrlParams]
  );
  const onClickDelete = useCallback(
    (script: EndpointScript) => {
      setSelectedItemForDelete(script);
    },
    [setSelectedItemForDelete]
  );

  const onDeleteModalSuccess = useCallback(() => {
    setSelectedItemForDelete(undefined);
    reFetchEndpointScriptsLibrary();
  }, [reFetchEndpointScriptsLibrary]);

  const onDeleteModalCancel = useCallback(() => {
    setSelectedItemForDelete(undefined);
  }, []);

  useEffect(() => {
    if (!isFetching && scriptsLibraryFetchError) {
      addDanger(scriptsLibraryFetchError?.body?.message || scriptsLibraryFetchError.message);
    }
  }, [scriptsLibraryFetchError, addDanger, isFetching]);

  return (
    <AdministrationListPage
      data-test-subj="scriptsLibraryPage"
      title={i18n.pageTitle}
      subtitle={i18n.pageAboutInfo}
      hideHeader={false}
    >
      {selectedItemForDelete && (
        <ScriptDeleteModal
          scriptName={selectedItemForDelete.name}
          scriptId={selectedItemForDelete.id}
          onSuccess={onDeleteModalSuccess}
          onCancel={onDeleteModalCancel}
          data-test-subj={'scriptDeleteModal'}
        />
      )}
      {isFetched && (
        <ScriptsLibraryTable
          data-test-subj="scriptsLibraryTable"
          items={tableItems}
          isLoading={isFetching}
          onChange={onChangeScriptsTable}
          onClickDelete={onClickDelete}
          queryParams={queryParams}
          totalItemCount={totalItemCount}
        />
      )}
    </AdministrationListPage>
  );
};

ScriptsLibrary.displayName = 'ScriptsLibrary';
