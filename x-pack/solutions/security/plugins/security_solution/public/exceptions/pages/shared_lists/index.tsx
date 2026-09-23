/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiSearchBarProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPopover,
  EuiScreenReaderLive,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu, AppHeaderMetadataItems } from '@kbn/app-header';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import { i18n as i18nCore } from '@kbn/i18n';
import moment from 'moment';

import type { ExceptionListFilter, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { useApi, useExceptionLists } from '@kbn/securitysolution-list-hooks';
import { EmptyViewerState, ViewerStatus } from '@kbn/securitysolution-exception-list-components';

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { useGetEndpointExceptionsPerPolicyOptIn } from '../../../management/hooks/artifacts/use_endpoint_per_policy_opt_in';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { AutoDownload } from '../../../common/components/auto_download/auto_download';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { ML_JOB_SETTINGS } from '../../../common/components/ml_popover/translations';
import { MlJobSettingsFlyout } from '../../../common/components/ml_popover/ml_job_settings_flyout';
import { useAddIntegrationsUrl } from '../../../common/hooks/use_add_integrations_url';
import { useBoolState } from '../../../common/hooks/use_bool_state';
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
import { ReferenceErrorModal } from '../../../common/components/reference_error_modal';
import { patchRule } from '../../../detection_engine/rule_management/api/api';

import { getSearchFilters } from '../../../detection_engine/rule_management_ui/components/rules_table/helpers';
import { useListsConfig } from '../../../detections/containers/detection_engine/lists/use_lists_config';
import { MissingDetectionsPrivilegesCallOut } from '../../../detections/components/callouts/missing_detections_privileges_callout';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../common/endpoint/service/artifacts/constants';

import { AddExceptionFlyout } from '../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import { useEndpointExceptionsCapability } from '../../hooks/use_endpoint_exceptions_capability';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { EndpointExceptionsMovedCallout } from '../../components/endpoint_exceptions_moved_callout';

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

interface ExceptionsHeaderProps {
  loading: boolean;
  lastUpdated: number;
  onImport: () => void;
  onCreateSharedList: () => void;
  onCreateExceptionItem: () => void;
  onOpenMlJobSettings: () => void;
}

const ExceptionsHeader: React.FC<ExceptionsHeaderProps> = ({
  loading,
  lastUpdated,
  onImport,
  onCreateSharedList,
  onCreateExceptionItem,
  onOpenMlJobSettings,
}) => {
  const {
    services: { application, docLinks },
  } = useKibana();
  const { href: addIntegrationsHref } = useAddIntegrationsUrl();
  const { navigateTo } = useNavigateTo();

  const rulesHref = application.getUrlForApp('security', { path: '/rules' });

  const metadata = useMemo<AppHeaderMetadataItems>(() => {
    if (loading) {
      return [
        {
          type: 'text',
          // Single label matches Rule Details metadata items (full phrase, no separate value).
          label: i18nCore.translate(
            'xpack.securitySolution.exceptions.sharedLists.headerUpdating',
            { defaultMessage: 'Updating...' }
          ),
          'data-test-subj': 'exceptionsHeaderUpdated',
        },
      ];
    }
    const secondsAgo = (Date.now() - lastUpdated) / 1000;
    const relative =
      secondsAgo < 10
        ? i18nCore.translate('xpack.securitySolution.exceptions.sharedLists.headerUpdatedNow', {
            defaultMessage: 'now',
          })
        : moment(lastUpdated).fromNow();
    return [
      {
        type: 'text',
        label: i18nCore.translate(
          'xpack.securitySolution.exceptions.sharedLists.headerUpdatedRelative',
          {
            defaultMessage: 'Updated {relative}',
            values: { relative },
          }
        ),
        'data-test-subj': 'exceptionsHeaderUpdated',
      },
    ];
  }, [lastUpdated, loading]);

  // Import + Create stay outside the kebab (same as Old rightSideItems).
  // ML / integrations stay in overflow with Docs / Feedback.
  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [
      {
        id: 'importExceptionList',
        label: i18n.IMPORT_EXCEPTION_LIST_BUTTON,
        iconType: 'download',
        testId: 'importSharedExceptionList',
        run: onImport,
      },
      {
        id: 'addIntegrations',
        label: i18nCore.translate(
          'xpack.securitySolution.exceptions.sharedLists.addIntegrationsMenuItem',
          { defaultMessage: 'Add integrations' }
        ),
        iconType: 'indexOpen',
        href: addIntegrationsHref,
        overflow: true,
        testId: 'exceptionsHeaderAddIntegrations',
        run: () => {
          navigateTo({ url: addIntegrationsHref });
        },
      },
      {
        id: 'mlJobSettings',
        label: ML_JOB_SETTINGS,
        iconType: 'productML',
        overflow: true,
        testId: 'exceptionsHeaderMlJobSettings',
        run: onOpenMlJobSettings,
      },
    ];

    return {
      items,
      // Dropdown chevron on the right — matches Old / Figma Create shared exception list.
      primaryActionItem: {
        id: 'createException',
        label: i18n.CREATE_BUTTON,
        iconType: 'chevronSingleDown',
        iconSide: 'right',
        testId: 'manageExceptionListCreateButton',
        items: [
          {
            id: 'createSharedList',
            label: i18n.CREATE_SHARED_LIST_BUTTON,
            testId: 'manageExceptionListCreateExceptionListButton',
            run: onCreateSharedList,
          },
          {
            id: 'createExceptionItem',
            label: i18n.CREATE_BUTTON_ITEM_BUTTON,
            testId: 'manageExceptionListCreateExceptionButton',
            run: onCreateExceptionItem,
          },
        ],
      },
    };
  }, [
    addIntegrationsHref,
    navigateTo,
    onCreateExceptionItem,
    onCreateSharedList,
    onImport,
    onOpenMlJobSettings,
  ]);

  return (
    // [Chrome Next] Migrated header — parent supplies the Figma 16px page grid via bleed.
    // Updated + subtitle sit on one row (AppHeader secondary stack is horizontal).
    <AppHeader
      title={i18n.ALL_EXCEPTIONS}
      description={{
        text: i18n.ALL_EXCEPTIONS_SUBTITLE,
        learnMoreUrl: rulesHref,
        iconOnly: true,
        learnMoreAriaLabel: i18nCore.translate(
          'xpack.securitySolution.exceptions.sharedLists.goToRulesAriaLabel',
          { defaultMessage: 'Go to rules' }
        ),
      }}
      metadata={metadata}
      menu={menu}
      docLink={docLinks.links.securitySolution.manageDetectionRules}
      spacing="bleed"
    />
  );
};

export const SharedLists = React.memo(() => {
  const { edit: canEditExceptions, read: canReadExceptions } =
    useUserPrivileges().rulesPrivileges.exceptions;

  const { loading: listsConfigLoading } = useListsConfig();
  const loading = listsConfigLoading;

  const isEndpointExceptionsMovedFFEnabled = useIsExperimentalFeatureEnabled(
    'endpointExceptionsMovedUnderManagement'
  );
  const { data: endpointPerPolicyOptIn } = useGetEndpointExceptionsPerPolicyOptIn();

  const canAccessEndpointExceptions = useEndpointExceptionsCapability('showEndpointExceptions');
  const canWriteEndpointExceptions = useEndpointExceptionsCapability('crudEndpointExceptions');

  const {
    services: { http, notifications },
  } = useKibana();
  const { exportExceptionList, deleteExceptionList, duplicateExceptionList } = useApi(http);

  const [showReferenceErrorModal, setShowReferenceErrorModal] = useState(false);
  const [referenceModalState, setReferenceModalState] = useState<ReferenceModalState>(
    exceptionReferenceModalInitialState
  );
  const [filters, setFilters] = useState<ExceptionListFilter | undefined>();
  const rawSearchInputRef = useRef('');

  const [viewerStatus, setViewStatus] = useState<ViewerStatus | null>(ViewerStatus.LOADING);

  const exceptionListTypes = useMemo(() => {
    const lists = [];
    if (canReadExceptions) {
      lists.push(ExceptionListTypeEnum.DETECTION);
    }
    if (!isEndpointExceptionsMovedFFEnabled && canAccessEndpointExceptions) {
      lists.push(ExceptionListTypeEnum.ENDPOINT);
    }
    return lists;
  }, [canAccessEndpointExceptions, canReadExceptions, isEndpointExceptionsMovedFFEnabled]);

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
    hideLists: isEndpointExceptionsMovedFFEnabled
      ? []
      : ALL_ENDPOINT_ARTIFACT_LIST_IDS.filter(
          (listId) => listId !== ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
        ),
  });
  const [loadingTableInfo, exceptionListsWithRuleRefs, exceptionsListsRef] = useAllExceptionLists({
    exceptionLists: exceptions ?? [],
  });

  const [initLoading, setInitLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const [exportDownload, setExportDownload] = useState<{ name?: string; blob?: Blob }>({});
  const [displayImportListFlyout, setDisplayImportListFlyout] = useState(false);
  const [screenReaderMessage, setScreenReaderMessage] = useState('');
  const { addError, addSuccess } = useAppToasts();

  // Loading states
  const exceptionsLoaded = !loadingTableInfo && !initLoading;
  const hasNoExceptions = !loadingExceptions && !exceptionListsWithRuleRefs.length;
  const isSearchingExceptions = viewerStatus === ViewerStatus.SEARCHING;
  const isLoadingExceptions = viewerStatus === ViewerStatus.LOADING;

  const handleDeleteSuccess = useCallback(
    (listName: string) => () => {
      notifications.toasts.addSuccess({
        title: i18n.exceptionDeleteSuccessMessage(listName),
      });
    },
    [notifications.toasts]
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
        const message = i18n.EXCEPTION_LIST_EXPORTED_SUCCESSFULLY(name);
        addSuccess(message);
        // If the same list is exported twice in a row, React won't re-render
        // since state hasn't changed, so the live region won't re-announce.
        // Clearing to '' first ensures VoiceOver sees a new change on the next frame.
        setScreenReaderMessage((current) => {
          if (current === message) {
            requestAnimationFrame(() => setScreenReaderMessage(message));
            return '';
          }
          return message;
        });
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

  const handleInputChange = useCallback((value: string): void => {
    rawSearchInputRef.current = value;
  }, []);

  const handleRefresh = useCallback((): void => {
    if (refreshExceptions != null) {
      setLastUpdated(Date.now());
      if (!rawSearchInputRef.current && filters) {
        setFilters(undefined);
      } else {
        refreshExceptions();
      }
    }
  }, [refreshExceptions, filters]);

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
    const exceptionList = exceptionsListsRef[exceptionListId];

    const relevantRules = exceptionList?.rules ?? [];
    const listName = exceptionList?.name ?? '';

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
        onSuccess: handleDeleteSuccess(listName),
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
      iconType="chevronSingleDown"
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

  const [displayAddExceptionItemFlyout, setDisplayAddExceptionItemFlyout] = useState(false);
  const [displayCreateSharedListFlyout, setDisplayCreateSharedListFlyout] = useState(false);

  const onCreateExceptionListOpenClick = useCallback(() => setDisplayCreateSharedListFlyout(true), []);
  const onCreateExceptionItemClick = useCallback(() => setDisplayAddExceptionItemFlyout(true), []);
  const onImportClick = useCallback(() => setDisplayImportListFlyout(true), []);
  const [isMlJobSettingsFlyoutOpen, showMlJobSettingsFlyout, hideMlJobSettingsFlyout] =
    useBoolState();

  const { euiTheme } = useEuiTheme();

  // Security section defaults to paddingSize "l" (24px). Figma uses 16px — same pattern as Rules.
  const chromeNextPage = css`
    margin: -${euiTheme.size.l};
    padding: ${euiTheme.size.base};
  `;

  const headerProps: ExceptionsHeaderProps = {
    loading,
    lastUpdated,
    onImport: onImportClick,
    onCreateSharedList: onCreateExceptionListOpenClick,
    onCreateExceptionItem: onCreateExceptionItemClick,
    onOpenMlJobSettings: showMlJobSettingsFlyout,
  };

  const isReadOnly = canReadExceptions && !canEditExceptions;

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

  const pageBody = (
    <div data-test-subj="allExceptionListsPanel">
      {isEndpointExceptionsMovedFFEnabled &&
        (endpointPerPolicyOptIn?.status === false ||
          endpointPerPolicyOptIn?.reason === 'userOptedIn') && (
          <EndpointExceptionsMovedCallout id="sharedListsPage" dismissable title="moved" />
        )}

      {!initLoading && (
        <ListsSearchBar onSearch={handleSearch} onInputChange={handleInputChange} />
      )}
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
                    readOnly={
                      excList.list_id === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id
                        ? !canWriteEndpointExceptions
                        : isReadOnly
                    }
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
      {viewerStatus == null && (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem>
                <EuiPopover
                  aria-label={i18n.allExceptionsRowPerPage(rowSize)}
                  button={rowSizeButton}
                  isOpen={isRowSizePopoverOpen}
                  closePopover={closeRowSizePopover}
                >
                  <EuiContextMenuPanel items={rowSizeItems} />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem css={{ alignItems: 'flex-end' }}>
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
      )}

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
  );

  return (
    <>
      <EuiScreenReaderLive aria-live="assertive" aria-atomic="true" focusRegionOnTextChange>
        {screenReaderMessage}
      </EuiScreenReaderLive>
      <MissingDetectionsPrivilegesCallOut />

      {displayCreateSharedListFlyout && (
        <CreateSharedListFlyout
          handleRefresh={handleRefresh}
          http={http}
          addSuccess={addSuccess}
          addError={addError}
          handleCloseFlyout={() => {
            setDisplayCreateSharedListFlyout(false);
          }}
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

      <MlJobSettingsFlyout
        isOpen={isMlJobSettingsFlyoutOpen}
        onClose={hideMlJobSettingsFlyout}
      />

      <SecuritySolutionPageWrapper>
        <div css={chromeNextPage}>
          <ExceptionsHeader {...headerProps} />
          <EuiSpacer size="m" />
          {pageBody}
        </div>
      </SecuritySolutionPageWrapper>
    </>
  );
});

SharedLists.displayName = 'SharedLists';
