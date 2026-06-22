/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiButton } from '@elastic/eui';
import type {
  ScriptLibraryAllowedFileType,
  ScriptTagKey,
} from '../../../../../../common/endpoint/service/script_library/constants';
import type { SupportedHostOsType } from '../../../../../../common/endpoint/constants';
import { ManagementPageLoader } from '../../../../components/management_page_loader';
import type { AugmentedListScriptsRequestQuery } from '../../../../hooks/script_library/use_get_scripts_list';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { getScriptsLibraryPath } from '../../../../common/url_routing';
import type {
  EndpointScript,
  SortableScriptLibraryFields,
} from '../../../../../../common/endpoint/types';
import { useKibana, useToasts } from '../../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { SCRIPT_LIBRARY_LABELS as pageLabels } from '../../translations';
import { AdministrationListPage } from '../../../../components/administration_list_page';
import { useWithScriptLibraryData } from '../../../../hooks/script_library';
import { ScriptLibraryTable, type ScriptLibraryTableProps } from './script_library_table';
import { useUrlPagination } from '../../../../hooks/use_url_pagination';
import type { ScriptLibraryUrlParams } from './script_library_url_params';
import { useScriptLibraryUrlParams } from './script_library_url_params';
import { EndpointScriptFlyout } from './flyout';
import { EndpointScriptDeleteModal } from './script_delete_modal';
import { DiscardChangesModal } from './discard_changes_modal';
import { NoDataEmptyPrompt } from './no_data_empty_prompt';
import { NewPageBanner } from './new_page_banner/new_page_banner';
import { ScriptLibraryFilters } from './data_filters';

export const SCRIPT_LIBRARY_PAGE_STORAGE_KEY =
  'securitySolution.endpointManagement.scriptLibrary.showNewPageBanner';

interface ScriptLibraryProps {
  'data-test-subj'?: string;
}

export const ScriptLibrary = memo<ScriptLibraryProps>(({ 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj ?? 'ScriptLibraryPage');
  const history = useHistory();
  const toasts = useToasts();
  const { storage } = useKibana().services;

  const [showNewPageBanner, setShowNewPageBanner] = useState(
    storage.get(SCRIPT_LIBRARY_PAGE_STORAGE_KEY) ?? true
  );

  const { pagination: paginationFromUrlParams } = useUrlPagination();
  const {
    os: osFilterFromUrl,
    fileType: fileTypeFilterFromUrl,
    category: categoryFilterFromUrl,
    searchTerms: searchTermsFromUrl,
    sortDirection: sortDirectionFromUrl,
    sortField: sortFieldFromUrl,
    setPagingAndSortingParams,
    selectedScriptId,
    show: showFromUrl,
  } = useScriptLibraryUrlParams();

  const { canReadScriptsLibrary, canWriteScriptsLibrary } = useUserPrivileges().endpointPrivileges;

  const shouldShowFlyoutForm = useMemo(() => {
    return (
      (canWriteScriptsLibrary && (showFromUrl === 'create' || showFromUrl === 'edit')) ||
      showFromUrl === 'details'
    );
  }, [canWriteScriptsLibrary, showFromUrl]);

  const onBannerDismiss = useCallback(() => {
    setShowNewPageBanner(false);
    storage.set(SCRIPT_LIBRARY_PAGE_STORAGE_KEY, false);
  }, [storage]);

  const [selectedItemForFlyout, setSelectedItemForFlyout] = useState<undefined | EndpointScript>(
    undefined
  );
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<undefined | EndpointScript>(
    undefined
  );
  const [showDiscardChangesModal, setShowDiscardChangesModal] = useState(false);

  const safePaging = useMemo(
    () => ({
      // page should not be more than 1000
      // and page * pageSize should not exceed 10000 (max result window)
      page:
        paginationFromUrlParams.page > 0 && paginationFromUrlParams.page <= 1000
          ? paginationFromUrlParams.page
          : 1,
      pageSize:
        paginationFromUrlParams.pageSize > 0 && paginationFromUrlParams.pageSize <= 1000
          ? paginationFromUrlParams.pageSize
          : 10,
    }),
    [paginationFromUrlParams.page, paginationFromUrlParams.pageSize]
  );

  const [queryParams, setQueryParams] = useState<AugmentedListScriptsRequestQuery>({
    fileType: fileTypeFilterFromUrl ?? [],
    os: osFilterFromUrl ?? [],
    category: categoryFilterFromUrl ?? [],
    searchTerms: searchTermsFromUrl ?? [],
    sortField: sortFieldFromUrl as SortableScriptLibraryFields,
    sortDirection: sortDirectionFromUrl,
    page: safePaging.page,
    pageSize: safePaging.pageSize,
  });

  const {
    isPageInitializing,
    doesDataExist,
    data: scriptsData,
    isFetching,
    error: scriptsLibraryFetchError,
    refetch: reFetchEndpointScriptsList,
  } = useWithScriptLibraryData(queryParams, {
    enabled: canReadScriptsLibrary,
    retry: false,
  });

  // update query state from URL params on page re-load or URL changes
  useEffect(() => {
    setQueryParams((prevState) => ({
      ...prevState,
      os: osFilterFromUrl,
      fileType: fileTypeFilterFromUrl,
      category: categoryFilterFromUrl,
      searchTerms: searchTermsFromUrl,
      sortField: sortFieldFromUrl as SortableScriptLibraryFields,
      sortDirection: sortDirectionFromUrl,
      page: safePaging.page,
      pageSize: safePaging.pageSize,
    }));

    setSelectedItemForFlyout(
      selectedScriptId
        ? scriptsData?.data.find((script) => script.id === selectedScriptId)
        : undefined
    );
  }, [
    sortDirectionFromUrl,
    sortFieldFromUrl,
    safePaging.page,
    safePaging.pageSize,
    scriptsData?.data,
    selectedScriptId,
    setSelectedItemForFlyout,
    osFilterFromUrl,
    fileTypeFilterFromUrl,
    categoryFilterFromUrl,
    searchTermsFromUrl,
  ]);

  const totalItemCount = useMemo(() => scriptsData?.total ?? 0, [scriptsData?.total]);
  const tableItems = useMemo(() => scriptsData?.data ?? [], [scriptsData?.data]);

  const onChangePlatformFilter = useCallback(
    (selectedPlatforms: string[]) => {
      setQueryParams((prevState) => ({
        ...prevState,
        os: selectedPlatforms as SupportedHostOsType[],
      }));
    },
    [setQueryParams]
  );

  const onChangeFileTypeFilter = useCallback(
    (selectedFileTypes: string[]) => {
      setQueryParams((prevState) => ({
        ...prevState,
        fileType: selectedFileTypes as ScriptLibraryAllowedFileType[],
      }));
    },
    [setQueryParams]
  );

  const onChangeTagsFilter = useCallback(
    (selectedCategory: string[]) => {
      setQueryParams((prevState) => ({
        ...prevState,
        category: selectedCategory as ScriptTagKey[],
      }));
    },
    [setQueryParams]
  );

  const onChangeSearchTermsFilter = useCallback(
    (searchTerms: string[]) => {
      setQueryParams((prevState) => ({
        ...prevState,
        searchTerms,
      }));
    },
    [setQueryParams]
  );

  const onChangeScriptsTable = useCallback<ScriptLibraryTableProps['onChange']>(
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
      show: Required<ScriptLibraryUrlParams>['show'];
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

  const onConfirmCloseFlyout = useCallback(() => {
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

  const onCloseFlyout = useCallback(
    (hasFormChanged: boolean) => {
      if (!hasFormChanged) {
        onConfirmCloseFlyout();
      } else {
        setShowDiscardChangesModal(true);
      }
    },
    [onConfirmCloseFlyout]
  );

  const onDeleteModalSuccess = useCallback(() => {
    onConfirmCloseFlyout();
    setSelectedItemForDelete(undefined);
    reFetchEndpointScriptsList();
  }, [onConfirmCloseFlyout, reFetchEndpointScriptsList]);

  const onDeleteModalCancel = useCallback(() => {
    setSelectedItemForDelete(undefined);
  }, []);

  const onSuccessCreateOrEdit = useCallback(() => {
    onConfirmCloseFlyout();
    setSelectedItemForFlyout(undefined);
    reFetchEndpointScriptsList();
  }, [onConfirmCloseFlyout, reFetchEndpointScriptsList]);

  useEffect(() => {
    if (!isFetching && scriptsLibraryFetchError) {
      toasts.addDanger(
        pageLabels.fetchListErrorMessage(
          scriptsLibraryFetchError?.body?.message || scriptsLibraryFetchError.message
        )
      );
    }
  }, [scriptsLibraryFetchError, toasts, isFetching]);

  if (isPageInitializing) {
    return <ManagementPageLoader data-test-subj={getTestId('pageLoader')} />;
  }

  return (
    <>
      {showNewPageBanner && (
        <NewPageBanner onDismiss={onBannerDismiss} data-test-subj={getTestId()} />
      )}

      <AdministrationListPage
        data-test-subj={getTestId()}
        title={pageLabels.pageTitle}
        subtitle={pageLabels.pageAboutInfo}
        hideHeader={!doesDataExist}
        actions={
          canWriteScriptsLibrary ? (
            <EuiButton
              fill
              iconType="upload"
              onClick={() => onClickAction({ show: 'create' })}
              data-test-subj={getTestId('upload-script-button')}
            >
              {pageLabels.pageAddButtonTitle}
            </EuiButton>
          ) : null
        }
      >
        {shouldShowFlyoutForm && (
          <EndpointScriptFlyout
            queryParams={queryParams}
            onCloseFlyout={onCloseFlyout}
            onClickAction={onClickAction}
            onSuccess={onSuccessCreateOrEdit}
            show={showFromUrl as Exclude<Required<ScriptLibraryUrlParams>['show'], 'delete'>}
            scriptItem={selectedItemForFlyout}
            data-test-subj={getTestId(`endpointScriptFlyout-${showFromUrl}`)}
          />
        )}

        {showDiscardChangesModal && (
          <DiscardChangesModal
            data-test-subj={getTestId('discard-changes-modal')}
            show={
              showFromUrl as Exclude<Required<ScriptLibraryUrlParams>['show'], 'delete' | 'details'>
            }
            onCancel={() => setShowDiscardChangesModal(false)}
            onConfirm={() => {
              setShowDiscardChangesModal(false);
              onConfirmCloseFlyout();
            }}
          />
        )}

        {selectedItemForDelete && (
          <EndpointScriptDeleteModal
            scriptName={selectedItemForDelete.name}
            scriptId={selectedItemForDelete.id}
            onSuccess={onDeleteModalSuccess}
            onCancel={onDeleteModalCancel}
            data-test-subj={getTestId('delete-modal')}
          />
        )}

        {doesDataExist ? (
          <>
            <ScriptLibraryFilters
              {...{
                onChangePlatformFilter,
                onChangeFileTypeFilter,
                onChangeTagsFilter,
                onChangeSearchTermsFilter,
              }}
            />
            <ScriptLibraryTable
              data-test-subj={getTestId('table')}
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
          </>
        ) : (
          <NoDataEmptyPrompt
            onClick={() => onClickAction({ show: 'create' })}
            canCreateScript={canWriteScriptsLibrary}
            data-test-subj={getTestId('no-data-empty-prompt')}
            isAddDisabled={isFetching}
          />
        )}
      </AdministrationListPage>
    </>
  );
});

ScriptLibrary.displayName = 'ScriptLibrary';
