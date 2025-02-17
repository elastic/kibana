/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useRef } from 'react';
import { Loader } from '../../../../common/components/loader';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { PrePackagedRulesPrompt } from '../../../../detections/components/rules/pre_packaged_rules/load_empty_prompt';
import type { Rule } from '../../../rule_management/logic';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import type { EuiBasicTableOnChange } from '../../../../detections/pages/detection_engine/rules/types';
import { BulkActionDryRunConfirmation } from './bulk_actions/bulk_action_dry_run_confirmation';
import { BulkEditFlyout } from './bulk_actions/bulk_edit_flyout';
import { useBulkActions } from './bulk_actions/use_bulk_actions';
import { useBulkActionsConfirmation } from './bulk_actions/use_bulk_actions_confirmation';
import { useBulkActionsDryRun } from './bulk_actions/use_bulk_actions_dry_run';
import { useBulkEditFormFlyout } from './bulk_actions/use_bulk_edit_form_flyout';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { useAsyncConfirmation } from './rules_table/use_async_confirmation';
import { RulesTableFilters } from './rules_table_filters/rules_table_filters';
import { AllRulesTabs } from './rules_table_toolbar';
import { RulesTableUtilityBar } from '../rules_table_utility_bar/rules_table_utility_bar';
import { useMonitoringColumns, useRulesColumns } from './use_columns';
import { useUserData } from '../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import { useBulkDuplicateExceptionsConfirmation } from './bulk_actions/use_bulk_duplicate_confirmation';
import { BulkActionDuplicateExceptionsConfirmation } from './bulk_actions/bulk_duplicate_exceptions_confirmation';
import { useStartMlJobs } from '../../../rule_management/logic/use_start_ml_jobs';
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from './constants';
import { useRuleManagementFilters } from '../../../rule_management/logic/use_rule_management_filters';
import type { FindRulesSortField } from '../../../../../common/api/detection_engine/rule_management';
import { useIsUpgradingSecurityPackages } from '../../../rule_management/logic/use_upgrade_security_packages';
import { useManualRuleRunConfirmation } from '../../../rule_gaps/components/manual_rule_run/use_manual_rule_run_confirmation';
import { ManualRuleRunModal } from '../../../rule_gaps/components/manual_rule_run';
import { BulkManualRuleRunLimitErrorModal } from './bulk_actions/bulk_manual_rule_run_limit_error_modal';
import { RulesWithGapsOverviewPanel } from '../../../rule_gaps/components/rules_with_gaps_overview_panel';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const INITIAL_SORT_FIELD = 'enabled';

interface RulesTableProps {
  selectedTab: AllRulesTabs;
}

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
);

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
// eslint-disable-next-line complexity
export const RulesTables = React.memo<RulesTableProps>(({ selectedTab }) => {
  const [{ canUserCRUD }] = useUserData();
  const hasPermissions = hasUserCRUDPermission(canUserCRUD);
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

  const rulesTableContext = useRulesTableContext();
  const { data: ruleManagementFilters } = useRuleManagementFilters();

  const {
    state: {
      rules,
      filterOptions,
      isPreflightInProgress,
      isAllSelected,
      isFetched,
      isLoading,
      isRefetching,
      loadingRuleIds,
      loadingRulesAction,
      pagination,
      selectedRuleIds,
      sortingOptions,
    },
    actions: { setIsAllSelected, setPage, setPerPage, setSelectedRuleIds, setSortingOptions },
  } = rulesTableContext;

  const [isDeleteConfirmationVisible, showDeleteConfirmation, hideDeleteConfirmation] =
    useBoolState();

  const [confirmDeletion, handleDeletionConfirm, handleDeletionCancel] = useAsyncConfirmation({
    onInit: showDeleteConfirmation,
    onFinish: hideDeleteConfirmation,
  });

  // If no rules are selected, we are deleting a single rule
  const rulesToDeleteCount = isAllSelected ? pagination.total : selectedRuleIds.length || 1;

  const {
    bulkActionsDryRunResult,
    bulkAction,
    isBulkActionConfirmationVisible,
    showBulkActionConfirmation,
    cancelBulkActionConfirmation,
    approveBulkActionConfirmation,
  } = useBulkActionsConfirmation();

  const {
    isBulkDuplicateConfirmationVisible,
    showBulkDuplicateConfirmation,
    cancelRuleDuplication,
    confirmRuleDuplication,
  } = useBulkDuplicateExceptionsConfirmation();

  const {
    isManualRuleRunConfirmationVisible,
    showManualRuleRunConfirmation,
    cancelManualRuleRun,
    confirmManualRuleRun,
  } = useManualRuleRunConfirmation();

  const [
    isManualRuleRunLimitErrorVisible,
    showManualRuleRunLimitError,
    hideManualRuleRunLimitError,
  ] = useBoolState();

  const {
    bulkEditActionType,
    isBulkEditFlyoutVisible,
    handleBulkEditFormConfirm,
    handleBulkEditFormCancel,
    completeBulkEditForm,
  } = useBulkEditFormFlyout();

  const { isBulkActionsDryRunLoading, executeBulkActionsDryRun } = useBulkActionsDryRun();

  const getBulkItemsPopoverContent = useBulkActions({
    filterOptions,
    confirmDeletion,
    showBulkActionConfirmation,
    showBulkDuplicateConfirmation,
    showManualRuleRunConfirmation,
    showManualRuleRunLimitError,
    completeBulkEditForm,
    executeBulkActionsDryRun,
  });

  const paginationMemo = useMemo(() => {
    return {
      pageIndex: pagination.page - 1,
      pageSize: pagination.perPage,
      totalItemCount: pagination.total,
      pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
    };
  }, [pagination.page, pagination.perPage, pagination.total]);

  const tableOnChangeCallback = useCallback(
    ({ page, sort }: EuiBasicTableOnChange) => {
      setSortingOptions({
        field: (sort?.field as FindRulesSortField) ?? INITIAL_SORT_FIELD, // Narrowing EuiBasicTable sorting types
        order: sort?.direction ?? 'desc',
      });
      setPage(page.index + 1);
      setPerPage(page.size);
    },
    [setPage, setPerPage, setSortingOptions]
  );

  const { loading: isLoadingJobs, jobs: mlJobs, startMlJobs } = useStartMlJobs();
  const rulesColumns = useRulesColumns({
    hasCRUDPermissions: hasPermissions,
    isLoadingJobs,
    mlJobs,
    startMlJobs,
    showExceptionsDuplicateConfirmation: showBulkDuplicateConfirmation,
    showManualRuleRunConfirmation,
    confirmDeletion,
  });

  const monitoringColumns = useMonitoringColumns({
    hasCRUDPermissions: hasPermissions,
    isLoadingJobs,
    mlJobs,
    startMlJobs,
    showExceptionsDuplicateConfirmation: showBulkDuplicateConfirmation,
    showManualRuleRunConfirmation,
    confirmDeletion,
  });

  const isSelectAllCalled = useRef(false);

  const isTableSelectable =
    hasPermissions &&
    (selectedTab === AllRulesTabs.management || selectedTab === AllRulesTabs.monitoring);

  const euiBasicTableSelectionProps = useMemo(
    () => ({
      selectable: (item: Rule) => !loadingRuleIds.includes(item.id),
      onSelectionChange: (selected: Rule[]) => {
        setSelectedRuleIds(selected.map(({ id }) => id));
        setIsAllSelected(false);
      },
      selected: selectedRuleIds.map((id) => ({ id } as Rule)), // EuiBasicTable only needs the itemId
    }),
    [loadingRuleIds, setIsAllSelected, setSelectedRuleIds, selectedRuleIds]
  );

  const toggleSelectAll = useCallback(() => {
    isSelectAllCalled.current = true;
    setIsAllSelected(!isAllSelected);
    setSelectedRuleIds(!isAllSelected ? rules.map(({ id }) => id) : []);
  }, [rules, isAllSelected, setIsAllSelected, setSelectedRuleIds]);

  const storeGapsInEventLogEnabled = useIsExperimentalFeatureEnabled('storeGapsInEventLogEnabled');

  const isTableEmpty =
    ruleManagementFilters?.rules_summary.custom_count === 0 &&
    ruleManagementFilters?.rules_summary.prebuilt_installed_count === 0;

  const shouldShowRulesTable = !isLoading && !isTableEmpty;

  let tableProps;
  switch (selectedTab) {
    case AllRulesTabs.management:
      tableProps = {
        'data-test-subj': 'rules-management-table',
        columns: rulesColumns,
      };
      break;
    case AllRulesTabs.monitoring:
      tableProps = {
        'data-test-subj': 'rules-monitoring-table',
        columns: monitoringColumns,
      };
      break;
    default:
      tableProps = {
        'data-test-subj': 'rules-management-table',
        columns: rulesColumns,
      };
      break;
  }

  const shouldShowLinearProgress = (isFetched && isRefetching) || isUpgradingSecurityPackages;
  const shouldShowLoadingOverlay = (!isFetched && isRefetching) || isPreflightInProgress;
  const rulesCount = Math.max(isAllSelected ? pagination.total : selectedRuleIds?.length ?? 0, 1);

  return (
    <>
      {shouldShowLinearProgress && (
        <EuiProgress
          data-test-subj="loadingRulesInfoProgress"
          size="xs"
          position="absolute"
          color="accent"
        />
      )}
      {shouldShowLoadingOverlay && (
        <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
      )}
      {isTableEmpty && <PrePackagedRulesPrompt />}
      {isDeleteConfirmationVisible && (
        <EuiConfirmModal
          title={
            rulesToDeleteCount === 1
              ? i18n.SINGLE_DELETE_CONFIRMATION_TITLE
              : i18n.BULK_DELETE_CONFIRMATION_TITLE
          }
          onCancel={handleDeletionCancel}
          onConfirm={handleDeletionConfirm}
          confirmButtonText={i18n.DELETE_CONFIRMATION_CONFIRM}
          cancelButtonText={i18n.DELETE_CONFIRMATION_CANCEL}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="deleteRulesConfirmationModal"
        >
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.components.allRules.deleteConfirmationModalBody"
            defaultMessage='This action will delete {rulesToDeleteCount, plural, one {the chosen rule} other {{rulesToDeleteCountStrong} rules}}. Click "Delete" to continue.'
            values={{
              rulesToDeleteCount,
              rulesToDeleteCountStrong: <strong>{rulesToDeleteCount}</strong>,
            }}
          />
        </EuiConfirmModal>
      )}
      {isManualRuleRunConfirmationVisible && (
        <ManualRuleRunModal onCancel={cancelManualRuleRun} onConfirm={confirmManualRuleRun} />
      )}
      {isManualRuleRunLimitErrorVisible && (
        <BulkManualRuleRunLimitErrorModal onClose={hideManualRuleRunLimitError} />
      )}
      {isBulkActionConfirmationVisible && bulkAction && (
        <BulkActionDryRunConfirmation
          bulkAction={bulkAction}
          result={bulkActionsDryRunResult}
          onCancel={cancelBulkActionConfirmation}
          onConfirm={approveBulkActionConfirmation}
        />
      )}
      {isBulkDuplicateConfirmationVisible && (
        <BulkActionDuplicateExceptionsConfirmation
          onCancel={cancelRuleDuplication}
          onConfirm={confirmRuleDuplication}
          rulesCount={rulesCount}
        />
      )}
      {isBulkEditFlyoutVisible && bulkEditActionType !== undefined && (
        <BulkEditFlyout
          rulesCount={bulkActionsDryRunResult?.succeededRulesCount ?? 0}
          editAction={bulkEditActionType}
          onClose={handleBulkEditFormCancel}
          onConfirm={handleBulkEditFormConfirm}
        />
      )}
      {shouldShowRulesTable && (
        <>
          {selectedTab === AllRulesTabs.monitoring && storeGapsInEventLogEnabled && (
            <>
              <EuiSpacer />
              <RulesWithGapsOverviewPanel />
              <EuiSpacer />
            </>
          )}
          <RulesTableFilters />
          <RulesTableUtilityBar
            canBulkEdit={hasPermissions}
            onGetBulkItemsPopoverContent={getBulkItemsPopoverContent}
            onToggleSelectAll={toggleSelectAll}
            isBulkActionInProgress={isBulkActionsDryRunLoading || loadingRulesAction != null}
          />
          <EuiBasicTable
            itemId="id"
            items={rules}
            noItemsMessage={NO_ITEMS_MESSAGE}
            onChange={tableOnChangeCallback}
            pagination={paginationMemo}
            selection={isTableSelectable ? euiBasicTableSelectionProps : undefined}
            sorting={{
              sort: {
                // EuiBasicTable has incorrect `sort.field` types which accept only `keyof Item` and reject fields in dot notation
                field: sortingOptions.field as keyof Rule,
                direction: sortingOptions.order,
              },
            }}
            {...tableProps}
          />
        </>
      )}
    </>
  );
});

RulesTables.displayName = 'RulesTables';
