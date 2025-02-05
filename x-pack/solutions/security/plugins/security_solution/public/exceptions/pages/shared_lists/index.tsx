/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiSearchBarProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageHeader,
  EuiPagination,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import styled from '@emotion/styled';

import type { ExceptionListFilter, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { useApi, useExceptionLists } from '@kbn/securitysolution-list-hooks';
import { EmptyViewerState, ViewerStatus } from '@kbn/securitysolution-exception-list-components';

import { AutoDownload } from '../../../common/components/auto_download/auto_download';
import { useKibana } from '../../../common/lib/kibana';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

import * as i18n from '../../translations/shared_list';
import {
  CreateSharedListFlyout,
  ExceptionsListCard,
  ExceptionsTableUtilityBar,
  ImportExceptionListFlyout,
  ListsSearchBar,
} from '../../components';
import { useAllExceptionLists } from '../../hooks/use_all_exception_lists';
import { ReferenceErrorModal } from '../../../detections/components/value_lists_management_flyout/reference_error_modal';
import { patchRule } from '../../../detection_engine/rule_management/api/api';

import { getSearchFilters } from '../../../detection_engine/rule_management_ui/components/rules_table/helpers';
import { useUserData } from '../../../detections/components/user_info';
import { useListsConfig } from '../../../detections/containers/detection_engine/lists/use_lists_config';
import { MissingPrivilegesCallOut } from '../../../detections/components/callouts/missing_privileges_callout';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../common/endpoint/service/artifacts/constants';

import { AddExceptionFlyout } from '../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import { useEndpointExceptionsCapability } from '../../hooks/use_endpoint_exceptions_capability';

export type Func = () => Promise<void>;

interface ReferenceModalState {
  contentText: string;
  rulesReferences: string[];
  isLoading: boolean;
  listId: string;
  listNamespaceType: NamespaceType;
}

const exceptionReferenceModalInitialState: ReferenceModalState = {
  contentText: '',
  rulesReferences: [],
  isLoading: false,
  listId: '',
  listNamespaceType: 'single',
};

const SORT_FIELDS: Array<{ field: string; label: string; defaultOrder: 'asc' | 'desc' }> = [
  {
    field: 'created_at',
    label: i18n.SORT_BY_CREATE_AT,
    defaultOrder: 'desc',
  },
];

const ExceptionsTable = styled(EuiFlexGroup)`
  padding: ${({ theme }) => theme.euiTheme.size.l} 0;
`;

export const SharedLists = React.memo(() => {
  const [{ loading: userInfoLoading, canUserCRUD, canUserREAD }] = useUserData();

  const { loading: listsConfigLoading } = useListsConfig();
  const loading = userInfoLoading || listsConfigLoading;

  const canAccessEndpointExceptions = useEndpointExceptionsCapability('showEndpointExceptions');
  const {
    services: {
      http,
      notifications,
      timelines,
      application: { navigateToApp },
    },
  } = useKibana();
  const { exportExceptionList, deleteExceptionList, duplicateExceptionList } = useApi(http);

  const [showReferenceErrorModal, setShowReferenceErrorModal] = useState(false);
  const [referenceModalState, setReferenceModalState] = useState<ReferenceModalState>(
    exceptionReferenceModalInitialState
  );
  const [filters, setFilters] = useState<ExceptionListFilter | undefined>();

  const [viewerStatus, setViewStatus] = useState<ViewerStatus | null>(ViewerStatus.LOADING);

  const exceptionListTypes = useMemo(() => {
    const lists = [ExceptionListTypeEnum.DETECTION];
    if (canAccessEndpointExceptions) {
      lists.push(ExceptionListTypeEnum.ENDPOINT);
    }
    return lists;
  }, [canAccessEndpointExceptions]);
  const [
    loadingExceptions,
    exceptions,
    pagination,
    setPagination,
    refreshExceptions,
    sort,
    setSort,
  ] = useExceptionLists({
    errorMessage: i18n.ERROR_EXCEPTION_LISTS,
    filterOptions: {
      ...filters,
      types: exceptionListTypes,
    },
    http,
    namespaceTypes: ['single', 'agnostic'],
    notifications,
    hideLists: ALL_ENDPOINT_ARTIFACT_LIST_IDS,
  });
  const [loadingTableInfo, exceptionListsWithRuleRefs, exceptionsListsRef] = useAllExceptionLists({
    exceptionLists: exceptions ?? [],
  });

  const [initLoading, setInitLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const [exportDownload, setExportDownload] = useState<{ name?: string; blob?: Blob }>({});
  const [displayImportListFlyout, setDisplayImportListFlyout] = useState(false);
  const { addError, addSuccess } = useAppToasts();

  // Loading states
  const exceptionsLoaded = !loadingTableInfo && !initLoading;
  const hasNoExceptions = !loadingExceptions && !exceptionListsWithRuleRefs.length;
  const isSearchingExceptions = viewerStatus === ViewerStatus.SEARCHING;
  const isLoadingExceptions = viewerStatus === ViewerStatus.LOADING;

  const handleDeleteSuccess = useCallback(
    (listId?: string) => () => {
      notifications.toasts.addSuccess({
        title: i18n.exceptionDeleteSuccessMessage(listId ?? referenceModalState.listId),
      });
    },
    [notifications.toasts, referenceModalState.listId]
  );

  const handleDeleteError = useCallback(
    (err: Error & { body?: { message: string } }): void => {
      addError(err, {
        title: i18n.EXCEPTION_DELETE_ERROR,
      });
    },
    [addError]
  );

  const handleDelete = useCallback(
    ({ id, namespaceType }: { id: string; namespaceType: NamespaceType }) =>
      async () => {
        try {
          if (exceptionsListsRef[id] != null) {
            setReferenceModalState({
              contentText:
                exceptionsListsRef[id].rules.length > 0
                  ? i18n.referenceErrorMessage(exceptionsListsRef[id].rules.length)
                  : i18n.defaultDeleteListMessage(exceptionsListsRef[id].name),
              rulesReferences: exceptionsListsRef[id].rules.map(({ name }) => name),
              isLoading: true,
              listId: id,
              listNamespaceType: namespaceType,
            });
            setShowReferenceErrorModal(true);
          }
          // route to patch rules with associated exception list
        } catch (error) {
          handleDeleteError(error);
        }
      },
    [exceptionsListsRef, handleDeleteError]
  );

  const handleExportSuccess = useCallback(
    (listId: string, name: string) =>
      (blob: Blob): void => {
        addSuccess(i18n.EXCEPTION_LIST_EXPORTED_SUCCESSFULLY(name));
        setExportDownload({ name: listId, blob });
      },
    [addSuccess]
  );

  const handleExportError = useCallback(
    (err: Error) => {
      addError(err, { title: i18n.EXCEPTION_EXPORT_ERROR });
    },
    [addError]
  );

  const handleExport = useCallback(
    ({
        id,
        listId,
        name,
        namespaceType,
        includeExpiredExceptions,
      }: {
        id: string;
        listId: string;
        name: string;
        namespaceType: NamespaceType;
        includeExpiredExceptions: boolean;
      }) =>
      async () => {
        await exportExceptionList({
          id,
          includeExpiredExceptions,
          listId,
          namespaceType,
          onError: handleExportError,
          onSuccess: handleExportSuccess(listId, name),
        });
      },
    [exportExceptionList, handleExportError, handleExportSuccess]
  );

  const handleRefresh = useCallback((): void => {
    if (refreshExceptions != null) {
      setLastUpdated(Date.now());
      refreshExceptions();
    }
  }, [refreshExceptions]);

  useEffect(() => {
    if (initLoading && !loading && !loadingExceptions && !loadingTableInfo) {
      setInitLoading(false);
    }
  }, [initLoading, loading, loadingExceptions, loadingTableInfo]);

  const handleSearch = useCallback(
    async ({
      query,
      queryText,
    }: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]): Promise<void> => {
      setViewStatus(ViewerStatus.SEARCHING);
      const filterOptions = {
        name: null,
        list_id: null,
        created_by: null,
        type: null,
        tags: null,
      };
      const searchTerms = getSearchFilters({
        defaultSearchTerm: 'name',
        filterOptions,
        query,
        searchValue: queryText,
      });
      setFilters(searchTerms);
    },
    []
  );

  const handleDuplicationError = useCallback(
    (err: Error) => {
      addError(err, { title: i18n.EXCEPTION_DUPLICATE_ERROR });
    },
    [addError]
  );

  const handleDuplicateSuccess = useCallback(
    (name: string) => (): void => {
      addSuccess(i18n.EXCEPTION_LIST_DUPLICATED_SUCCESSFULLY(name));
      handleRefresh();
    },
    [addSuccess, handleRefresh]
  );

  const handleDuplicate = useCallback(
    ({
        listId,
        name,
        namespaceType,
        includeExpiredExceptions,
      }: {
        listId: string;
        name: string;
        namespaceType: NamespaceType;
        includeExpiredExceptions: boolean;
      }) =>
      async () => {
        await duplicateExceptionList({
          includeExpiredExceptions,
          listId,
          namespaceType,
          onError: handleDuplicationError,
          onSuccess: handleDuplicateSuccess(name),
        });
      },
    [duplicateExceptionList, handleDuplicateSuccess, handleDuplicationError]
  );

  const handleCloseReferenceErrorModal = useCallback((): void => {
    setShowReferenceErrorModal(false);
    setReferenceModalState({
      contentText: '',
      rulesReferences: [],
      isLoading: false,
      listId: '',
      listNamespaceType: 'single',
    });
  }, []);

  const handleReferenceDelete = useCallback(async (): Promise<void> => {
    const exceptionListId = referenceModalState.listId;
    const exceptionListNamespaceType = referenceModalState.listNamespaceType;
    const relevantRules = exceptionsListsRef[exceptionListId].rules;

    try {
      await Promise.all(
        relevantRules.map((rule) => {
          const abortCtrl = new AbortController();
          const exceptionLists = (rule.exceptions_list ?? []).filter(
            ({ id }) => id !== exceptionListId
          );

          return patchRule({
            ruleProperties: {
              rule_id: rule.rule_id,
              exceptions_list: exceptionLists,
            },
            signal: abortCtrl.signal,
          });
        })
      );

      await deleteExceptionList({
        id: exceptionListId,
        namespaceType: exceptionListNamespaceType,
        onError: handleDeleteError,
        onSuccess: handleDeleteSuccess(),
      });
    } catch (err) {
      handleDeleteError(err);
    } finally {
      setReferenceModalState(exceptionReferenceModalInitialState);
      setShowReferenceErrorModal(false);
      if (refreshExceptions != null) {
        refreshExceptions();
      }
    }
  }, [
    referenceModalState.listId,
    referenceModalState.listNamespaceType,
    exceptionsListsRef,
    deleteExceptionList,
    handleDeleteError,
    handleDeleteSuccess,
    refreshExceptions,
  ]);

  const handleOnDownload = useCallback(() => {
    setExportDownload({});
  }, []);

  const [activePage, setActivePage] = useState(0);
  const [rowSize, setRowSize] = useState(5);
  const [isRowSizePopoverOpen, setIsRowSizePopoverOpen] = useState(false);
  const onRowSizeButtonClick = () => setIsRowSizePopoverOpen((val) => !val);
  const closeRowSizePopover = () => setIsRowSizePopoverOpen(false);

  const rowSizeButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onClick={onRowSizeButtonClick}
    >
      {i18n.allExceptionsRowPerPage(rowSize)}
    </EuiButtonEmpty>
  );

  const getIconType = (size: number) => {
    return size === rowSize ? 'check' : 'empty';
  };

  const onPerPageClick = useCallback((size: number) => {
    closeRowSizePopover();
    setRowSize(size);
    setActivePage(0);
  }, []);

  const rowSizeItems = [
    <EuiContextMenuItem key="5 rows" icon={getIconType(5)} onClick={() => onPerPageClick(5)}>
      {'5 rows'}
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="10 rows" icon={getIconType(10)} onClick={() => onPerPageClick(10)}>
      {'10 rows'}
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="25 rows" icon={getIconType(25)} onClick={() => onPerPageClick(25)}>
      {'25 rows'}
    </EuiContextMenuItem>,
  ];

  useEffect(() => {
    setPagination({
      // off-by-one error
      // we should really update the api to be zero-index based
      // the same way the pagination component in EUI is zero based.
      page: activePage + 1,
      perPage: rowSize,
      total: 0,
    });
  }, [activePage, rowSize, setPagination]);

  const goToPage = (pageNumber: number) => setActivePage(pageNumber);

  const [isCreatePopoverOpen, setIsCreatePopoverOpen] = useState(false);
  const [displayAddExceptionItemFlyout, setDisplayAddExceptionItemFlyout] = useState(false);
  const [displayCreateSharedListFlyout, setDisplayCreateSharedListFlyout] = useState(false);

  const onCreateButtonClick = () => setIsCreatePopoverOpen((isOpen) => !isOpen);
  const onCloseCreatePopover = () => {
    setDisplayAddExceptionItemFlyout(false);
    setIsCreatePopoverOpen(false);
  };
  const onCreateExceptionListOpenClick = () => setDisplayCreateSharedListFlyout(true);

  const isReadOnly = useMemo(() => {
    return (canUserREAD && !canUserCRUD) ?? true;
  }, [canUserREAD, canUserCRUD]);

  useEffect(() => {
    if (isSearchingExceptions && hasNoExceptions) {
      setViewStatus(ViewerStatus.EMPTY_SEARCH);
    } else if (!exceptionsLoaded) {
      setViewStatus(ViewerStatus.LOADING);
    } else if (isLoadingExceptions && hasNoExceptions) {
      setViewStatus(ViewerStatus.EMPTY);
    } else if (isLoadingExceptions && exceptionsLoaded) {
      setViewStatus(null);
    }
  }, [isSearchingExceptions, hasNoExceptions, exceptionsLoaded, isLoadingExceptions]);

  return (
    <>
      <MissingPrivilegesCallOut />
      <EuiPageHeader
        pageTitle={i18n.ALL_EXCEPTIONS}
        description={
          <EuiFlexGroup gutterSize="xs" direction="column">
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="none" direction="row">
                <EuiFlexItem grow={false}>
                  <EuiText>{i18n.ALL_EXCEPTIONS_SUBTITLE}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonIcon
                    iconType="popout"
                    aria-label="go-to-rules"
                    color="primary"
                    onClick={() =>
                      navigateToApp('security', { openInNewTab: true, path: '/rules' })
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              {timelines.getLastUpdated({
                showUpdating: loading,
                updatedAt: lastUpdated,
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        rightSideItems={[
          <EuiPopover
            data-test-subj="manageExceptionListCreateButton"
            button={
              <EuiButton iconType={'arrowDown'} onClick={onCreateButtonClick}>
                {i18n.CREATE_BUTTON}
              </EuiButton>
            }
            isOpen={isCreatePopoverOpen}
            closePopover={onCloseCreatePopover}
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key={'createList'}
                  data-test-subj="manageExceptionListCreateExceptionListButton"
                  onClick={() => {
                    onCloseCreatePopover();
                    onCreateExceptionListOpenClick();
                  }}
                >
                  {i18n.CREATE_SHARED_LIST_BUTTON}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key={'createItem'}
                  data-test-subj="manageExceptionListCreateExceptionButton"
                  onClick={() => {
                    onCloseCreatePopover();
                    setDisplayAddExceptionItemFlyout(true);
                  }}
                >
                  {i18n.CREATE_BUTTON_ITEM_BUTTON}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>,
          <EuiButton
            data-test-subj="importSharedExceptionList"
            iconType={'importAction'}
            onClick={() => setDisplayImportListFlyout(true)}
          >
            {i18n.IMPORT_EXCEPTION_LIST_BUTTON}
          </EuiButton>,
        ]}
      />

      {displayCreateSharedListFlyout && (
        <CreateSharedListFlyout
          handleRefresh={handleRefresh}
          http={http}
          addSuccess={addSuccess}
          addError={addError}
          handleCloseFlyout={() => setDisplayCreateSharedListFlyout(false)}
        />
      )}

      {displayAddExceptionItemFlyout && (
        <AddExceptionFlyout
          rules={null}
          isEndpointItem={false}
          isBulkAction={false}
          showAlertCloseOptions
          onCancel={() => setDisplayAddExceptionItemFlyout(false)}
          onConfirm={(didRuleChange: boolean) => {
            setDisplayAddExceptionItemFlyout(false);
            if (didRuleChange) handleRefresh();
          }}
        />
      )}

      {displayImportListFlyout && (
        <ImportExceptionListFlyout
          handleRefresh={handleRefresh}
          http={http}
          addSuccess={addSuccess}
          addError={addError}
          setDisplayImportListFlyout={setDisplayImportListFlyout}
        />
      )}

      <EuiHorizontalRule />
      <div data-test-subj="allExceptionListsPanel">
        {!initLoading && <ListsSearchBar onSearch={handleSearch} />}
        <EuiSpacer size="m" />
        {viewerStatus != null ? (
          <EmptyViewerState
            isReadOnly={isReadOnly}
            title={i18n.NO_EXCEPTION_LISTS}
            viewerStatus={viewerStatus}
            buttonText={i18n.CREATE_SHARED_LIST_BUTTON}
            body={i18n.NO_LISTS_BODY}
            onEmptyButtonStateClick={onCreateExceptionListOpenClick}
          />
        ) : (
          <>
            <ExceptionsTableUtilityBar
              totalExceptionLists={exceptionListsWithRuleRefs.length}
              onRefresh={handleRefresh}
              setSort={setSort}
              sort={sort}
              sortFields={SORT_FIELDS}
            />
            {exceptionListsWithRuleRefs.length > 0 && (
              <ExceptionsTable data-test-subj="exceptionsTable" direction="column">
                {exceptionListsWithRuleRefs.map((excList) => (
                  <EuiFlexItem key={excList.list_id}>
                    <ExceptionsListCard
                      data-test-subj="exceptionsListCard"
                      readOnly={isReadOnly}
                      exceptionsList={excList}
                      handleDelete={handleDelete}
                      handleExport={handleExport}
                      handleDuplicate={handleDuplicate}
                    />
                  </EuiFlexItem>
                ))}
              </ExceptionsTable>
            )}
          </>
        )}
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem>
                <EuiPopover
                  button={rowSizeButton}
                  isOpen={isRowSizePopoverOpen}
                  closePopover={closeRowSizePopover}
                >
                  <EuiContextMenuPanel items={rowSizeItems} />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem style={{ alignItems: 'flex-end' }}>
            <EuiFlexGroup alignItems="flexEnd">
              <EuiFlexItem>
                <EuiPagination
                  aria-label={'Custom pagination example'}
                  pageCount={pagination.total ? Math.ceil(pagination.total / rowSize) : 0}
                  activePage={activePage}
                  onPageClick={goToPage}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <AutoDownload
          blob={exportDownload.blob}
          name={`${exportDownload.name}.ndjson`}
          onDownload={handleOnDownload}
        />
        <ReferenceErrorModal
          cancelText={i18n.REFERENCE_MODAL_CANCEL_BUTTON}
          confirmText={i18n.REFERENCE_MODAL_CONFIRM_BUTTON}
          contentText={referenceModalState.contentText}
          onCancel={handleCloseReferenceErrorModal}
          onClose={handleCloseReferenceErrorModal}
          onConfirm={handleReferenceDelete}
          references={referenceModalState.rulesReferences}
          showModal={showReferenceErrorModal}
          titleText={i18n.REFERENCE_MODAL_TITLE}
        />
      </div>
    </>
  );
});

SharedLists.displayName = 'SharedLists';
