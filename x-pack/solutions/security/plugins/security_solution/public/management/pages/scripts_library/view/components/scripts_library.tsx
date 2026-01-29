/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getScriptsLibraryPath } from '../../../../common/url_routing';
import type {
  EndpointScript,
  SortableScriptLibraryFields,
} from '../../../../../../common/endpoint/types';
import type { ListScriptsRequestQuery } from '../../../../../../common/api/endpoint';
import { useToasts } from '../../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { SCRIPT_LIBRARY_LABELS as pageLabels } from '../../translations';
import { AdministrationListPage } from '../../../../components/administration_list_page';
import { useGetEndpointScriptsList } from '../../../../hooks/script_library';
import { ScriptsLibraryTable, type ScriptsLibraryTableProps } from './scripts_library_table';
import { useUrlPagination } from '../../../../hooks/use_url_pagination';
import type { ScriptsLibraryUrlParams } from './scripts_library_url_params';
import { useScriptsLibraryUrlParams } from './scripts_library_url_params';
import { EndpointScriptFlyout } from './flyout';
import { EndpointScriptDeleteModal } from './script_delete_modal';

export const ScriptsLibrary = memo(() => {
  const history = useHistory();
  const { addDanger } = useToasts();
  const { pagination: paginationFromUrlParams } = useUrlPagination();
  const {
    kuery: kueryFromUrl,
    sortDirection: sortDirectionFromUrl,
    sortField: sortFieldFromUrl,
    setPagingAndSortingParams,
    selectedScriptId,
    show: showFromUrl,
  } = useScriptsLibraryUrlParams();

  const shouldShowFlyoutForm = useMemo(() => {
    return showFromUrl === 'create' || showFromUrl === 'edit' || showFromUrl === 'details';
  }, [showFromUrl]);

  const { canReadScriptsLibrary } = useUserPrivileges().endpointPrivileges;

  const [selectedItemForFlyout, setSelectedItemForFlyout] = useState<undefined | EndpointScript>(
    undefined
  );
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<undefined | EndpointScript>(
    undefined
  );

  const [queryParams, setQueryParams] = useState<ListScriptsRequestQuery>({
    kuery: kueryFromUrl,
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
    refetch: reFetchEndpointScriptsList,
  } = useGetEndpointScriptsList(queryParams, {
    enabled: canReadScriptsLibrary,
    retry: false,
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
    setSelectedItemForFlyout(
      selectedScriptId
        ? scriptsData?.data.find((script) => script.id === selectedScriptId)
        : undefined
    );
  }, [
    kueryFromUrl,
    sortDirectionFromUrl,
    sortFieldFromUrl,
    paginationFromUrlParams.page,
    paginationFromUrlParams.pageSize,
    scriptsData?.data,
    selectedScriptId,
    setSelectedItemForFlyout,
  ]);

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

  const onClickAction = useCallback(
    ({
      show,
      script,
    }: {
      show: Required<ScriptsLibraryUrlParams>['show'];
      script?: EndpointScript;
    }) => {
      if (show === 'delete') {
        setSelectedItemForDelete(script);
      } else {
        setSelectedItemForFlyout(script);
        history.push(
          getScriptsLibraryPath({
            query: {
              ...queryParams,
              selectedScriptId: script?.id,
              show,
            },
          })
        );
      }
    },
    [history, queryParams]
  );

  const onCloseFlyout = useCallback(() => {
    setSelectedItemForFlyout(undefined);
    history.push(
      getScriptsLibraryPath({
        query: {
          ...queryParams,
          selectedScriptId: undefined,
          show: undefined,
        },
      })
    );
  }, [history, queryParams]);

  const onDeleteModalSuccess = useCallback(() => {
    onCloseFlyout();
    setSelectedItemForDelete(undefined);
    reFetchEndpointScriptsList();
  }, [onCloseFlyout, reFetchEndpointScriptsList]);

  const onDeleteModalCancel = useCallback(() => {
    setSelectedItemForDelete(undefined);
  }, []);

  const onSuccessCreateOrEdit = useCallback(() => {
    onCloseFlyout();
    setSelectedItemForFlyout(undefined);
    reFetchEndpointScriptsList();
  }, [onCloseFlyout, reFetchEndpointScriptsList]);

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
      {shouldShowFlyoutForm && (
        <EndpointScriptFlyout
          queryParams={queryParams}
          onCloseFlyout={onCloseFlyout}
          onClickAction={onClickAction}
          onSuccess={onSuccessCreateOrEdit}
          show={showFromUrl as Exclude<Required<ScriptsLibraryUrlParams>['show'], 'delete'>}
          scriptItem={selectedItemForFlyout}
          data-test-subj={`endpointScriptFlyout-${showFromUrl}`}
        />
      )}

      {selectedItemForDelete && (
        <EndpointScriptDeleteModal
          scriptName={selectedItemForDelete.name}
          scriptId={selectedItemForDelete.id}
          onSuccess={onDeleteModalSuccess}
          onCancel={onDeleteModalCancel}
          data-test-subj={'endpointScriptDeleteModal'}
        />
      )}
      {isFetched && (
        <ScriptsLibraryTable
          data-test-subj="scriptsLibraryTable"
          items={tableItems}
          isLoading={isFetching}
          onChange={onChangeScriptsTable}
          onClickAction={onClickAction}
          queryParams={queryParams}
          totalItemCount={totalItemCount}
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
