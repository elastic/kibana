/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiTableSelectionType } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';

import { useColumns } from './use_columns';
import { useScheduleApi } from '../logic/use_schedule_api';
import { DetailsFlyout } from '../details_flyout';
import { WithMissingPrivileges } from '../missing_privileges';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../common/components/utility_bar';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_FIELD = 'name';
const DEFAULT_SORT_DIRECTION = 'asc';

/**
 * Table Component for displaying Attack Discovery Schedules
 */
export const SchedulesTable: React.FC = React.memo(() => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<keyof AttackDiscoverySchedule>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);

  const {
    useBulkDeleteSchedules,
    useBulkDisableSchedules,
    useBulkEnableSchedules,
    useDeleteSchedule,
    useDisableSchedule,
    useEnableSchedule,
    useFindSchedules,
  } = useScheduleApi();

  const {
    data: { schedules, total } = { schedules: [], total: 0 },
    isLoading: isDataLoading,
    refetch,
  } = useFindSchedules({
    page: pageIndex,
    perPage: pageSize,
    sortField,
    sortDirection,
  });

  const pagination = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      totalItemCount: total,
    };
  }, [pageIndex, pageSize, total]);

  const sorting = useMemo(() => {
    return {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };
  }, [sortDirection, sortField]);

  const onTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<AttackDiscoverySchedule>) => {
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
      if (sort) {
        const { field, direction } = sort;
        setSortField(field);
        setSortDirection(direction);
      }
    },
    []
  );

  const [isTableLoading, setTableLoading] = useState(false);
  const [scheduleDetailsId, setScheduleDetailsId] = useState<string | undefined>(undefined);
  const [selectedSchedules, setSelectedSchedules] = useState<AttackDiscoverySchedule[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{
    ids: string[];
    isBulk: boolean;
  } | null>(null);
  const deleteModalTitleId = useGeneratedHtmlId({
    prefix: 'deleteAttackDiscoverySchedulesModalTitle',
  });

  const { mutateAsync: enableAttackDiscoverySchedule } = useEnableSchedule();
  const { mutateAsync: disableAttackDiscoverySchedule } = useDisableSchedule();
  const { mutateAsync: deleteAttackDiscoverySchedule } = useDeleteSchedule();
  const { mutateAsync: bulkEnableAttackDiscoverySchedules } = useBulkEnableSchedules();
  const { mutateAsync: bulkDisableAttackDiscoverySchedules } = useBulkDisableSchedules();
  const { mutateAsync: bulkDeleteAttackDiscoverySchedules } = useBulkDeleteSchedules();

  const openScheduleDetails = useCallback((scheduleId: string) => {
    setScheduleDetailsId(scheduleId);
  }, []);
  const enableSchedule = useCallback(
    async (id: string) => {
      try {
        setTableLoading(true);
        await enableAttackDiscoverySchedule({ id });
        await refetch();
      } catch (err) {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        setTableLoading(false);
      }
    },
    [enableAttackDiscoverySchedule, refetch]
  );
  const disableSchedule = useCallback(
    async (id: string) => {
      try {
        setTableLoading(true);
        await disableAttackDiscoverySchedule({ id });
        await refetch();
      } catch (err) {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        setTableLoading(false);
      }
    },
    [disableAttackDiscoverySchedule, refetch]
  );
  const requestDeleteSchedule = useCallback(
    (id: string) => setPendingDelete({ ids: [id], isBulk: false }),
    []
  );

  const selection: EuiTableSelectionType<AttackDiscoverySchedule> = useMemo(
    () => ({
      onSelectionChange: setSelectedSchedules,
      selected: selectedSchedules,
    }),
    [selectedSchedules]
  );

  const clearSelection = useCallback(() => {
    setSelectedSchedules([]);
  }, []);

  const bulkEnableSchedules = useCallback(async () => {
    const ids = selectedSchedules.filter(({ enabled }) => !enabled).map(({ id }) => id);
    if (!ids.length) {
      clearSelection();
      return;
    }

    try {
      setTableLoading(true);
      await bulkEnableAttackDiscoverySchedules({ ids });
      await refetch();
      clearSelection();
    } catch (err) {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setTableLoading(false);
    }
  }, [bulkEnableAttackDiscoverySchedules, clearSelection, refetch, selectedSchedules]);

  const bulkDisableSchedules = useCallback(async () => {
    const ids = selectedSchedules.filter(({ enabled }) => enabled).map(({ id }) => id);
    if (!ids.length) {
      clearSelection();
      return;
    }

    try {
      setTableLoading(true);
      await bulkDisableAttackDiscoverySchedules({ ids });
      await refetch();
      clearSelection();
    } catch (err) {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setTableLoading(false);
    }
  }, [bulkDisableAttackDiscoverySchedules, clearSelection, refetch, selectedSchedules]);

  const confirmDeleteSchedules = useCallback(async () => {
    if (!pendingDelete?.ids.length) {
      return;
    }

    try {
      setTableLoading(true);
      if (pendingDelete.isBulk) {
        await bulkDeleteAttackDiscoverySchedules({ ids: pendingDelete.ids });
        clearSelection();
      } else {
        await deleteAttackDiscoverySchedule({ id: pendingDelete.ids[0] });
      }
      await refetch();
      setPendingDelete(null);
    } catch (err) {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setTableLoading(false);
    }
  }, [
    bulkDeleteAttackDiscoverySchedules,
    clearSelection,
    deleteAttackDiscoverySchedule,
    pendingDelete,
    refetch,
  ]);

  const closeDeleteConfirmation = useCallback(() => {
    setPendingDelete(null);
  }, []);

  const refreshSchedules = useCallback(() => {
    refetch();
  }, [refetch]);

  const getBulkActionsPopoverContent = useCallback(
    (closePopover: () => void) => (
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            data-test-subj="schedulesTableBulkEnableButton"
            disabled={!selectedSchedules.some(({ enabled }) => !enabled)}
            key="enable"
            onClick={() => {
              closePopover();
              bulkEnableSchedules();
            }}
          >
            {i18n.BULK_ENABLE_ACTION}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-test-subj="schedulesTableBulkDisableButton"
            disabled={!selectedSchedules.some(({ enabled }) => enabled)}
            key="disable"
            onClick={() => {
              closePopover();
              bulkDisableSchedules();
            }}
          >
            {i18n.BULK_DISABLE_ACTION}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-test-subj="schedulesTableBulkDeleteButton"
            key="delete"
            onClick={() => {
              closePopover();
              setPendingDelete({
                ids: selectedSchedules.map(({ id }) => id),
                isBulk: true,
              });
            }}
          >
            {i18n.BULK_DELETE_ACTION}
          </EuiContextMenuItem>,
        ]}
      />
    ),
    [bulkDisableSchedules, bulkEnableSchedules, selectedSchedules]
  );

  const rulesColumns = useColumns({
    isDisabled: isDataLoading,
    isLoading: isTableLoading,
    openScheduleDetails,
    enableSchedule,
    disableSchedule,
    requestDeleteSchedule,
  });

  return (
    <div data-test-subj="schedulesTableContainer">
      <div data-test-subj="schedulesTableDescription">
        {i18n.ATTACK_DISCOVER_SCHEDULES_DESCRIPTION}
      </div>
      <EuiSpacer size="m" />
      <UtilityBar border>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="schedulesTableBulkActionsSelectedCount">
              {i18n.BULK_ACTIONS_SELECTED_COUNT(selectedSchedules.length)}
            </UtilityBarText>
            <WithMissingPrivileges>
              {(canUpdateSchedule) => (
                <UtilityBarAction
                  dataTestSubj="schedulesTableBulkActions"
                  disabled={
                    isDataLoading ||
                    isTableLoading ||
                    !canUpdateSchedule ||
                    selectedSchedules.length === 0
                  }
                  iconSide="right"
                  iconType="chevronSingleDown"
                  popoverPanelPaddingSize="none"
                  popoverContent={getBulkActionsPopoverContent}
                >
                  {i18n.BULK_ACTIONS}
                </UtilityBarAction>
              )}
            </WithMissingPrivileges>
            <UtilityBarAction
              dataTestSubj="schedulesTableRefreshButton"
              disabled={isTableLoading}
              iconSide="left"
              iconType="refresh"
              onClick={refreshSchedules}
            >
              {i18n.REFRESH}
            </UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>
      <EuiSpacer size="s" />
      <EuiBasicTable<AttackDiscoverySchedule>
        tableCaption={i18n.ATTACK_DISCOVER_SCHEDULES_TABLE_CAPTION}
        loading={isTableLoading}
        items={schedules}
        pagination={pagination}
        sorting={sorting}
        onChange={onTableChange}
        itemId={'id'}
        selection={selection}
        data-test-subj={'schedulesTable'}
        columns={rulesColumns}
      />
      {pendingDelete && (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          title={
            pendingDelete.isBulk
              ? i18n.BULK_DELETE_CONFIRMATION_TITLE
              : i18n.DELETE_CONFIRMATION_TITLE
          }
          titleProps={{ id: deleteModalTitleId }}
          onCancel={closeDeleteConfirmation}
          onConfirm={confirmDeleteSchedules}
          cancelButtonText={i18n.BULK_DELETE_CONFIRMATION_CANCEL}
          confirmButtonText={i18n.BULK_DELETE_CONFIRMATION_CONFIRM}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="schedulesTableBulkDeleteConfirmationModal"
        >
          {pendingDelete.isBulk
            ? i18n.BULK_DELETE_CONFIRMATION_BODY(pendingDelete.ids.length)
            : i18n.DELETE_CONFIRMATION_BODY}
        </EuiConfirmModal>
      )}
      {scheduleDetailsId && (
        <DetailsFlyout
          scheduleId={scheduleDetailsId}
          onClose={() => setScheduleDetailsId(undefined)}
        />
      )}
    </div>
  );
});
SchedulesTable.displayName = 'SchedulesTable';
