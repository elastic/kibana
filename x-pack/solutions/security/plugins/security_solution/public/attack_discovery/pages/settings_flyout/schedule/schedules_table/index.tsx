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
import { useFindAttackDiscoverySchedules } from '../logic/use_find_schedules';
import { useEnableAttackDiscoverySchedule } from '../logic/use_enable_schedule';
import { useDisableAttackDiscoverySchedule } from '../logic/use_disable_schedule';
import { useDeleteAttackDiscoverySchedule } from '../logic/use_delete_schedule';
import { useBulkEnableAttackDiscoverySchedules } from '../logic/use_bulk_enable_schedules';
import { useBulkDisableAttackDiscoverySchedules } from '../logic/use_bulk_disable_schedules';
import { useBulkDeleteAttackDiscoverySchedules } from '../logic/use_bulk_delete_schedules';
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
    data: { schedules, total } = { schedules: [], total: 0 },
    isLoading: isDataLoading,
    refetch,
  } = useFindAttackDiscoverySchedules({
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
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
  const bulkDeleteModalTitleId = useGeneratedHtmlId({
    prefix: 'bulkDeleteAttackDiscoverySchedulesModalTitle',
  });

  const { mutateAsync: enableAttackDiscoverySchedule } = useEnableAttackDiscoverySchedule();
  const { mutateAsync: disableAttackDiscoverySchedule } = useDisableAttackDiscoverySchedule();
  const { mutateAsync: deleteAttackDiscoverySchedule } = useDeleteAttackDiscoverySchedule();
  const { mutateAsync: bulkEnableAttackDiscoverySchedules } =
    useBulkEnableAttackDiscoverySchedules();
  const { mutateAsync: bulkDisableAttackDiscoverySchedules } =
    useBulkDisableAttackDiscoverySchedules();
  const { mutateAsync: bulkDeleteAttackDiscoverySchedules } =
    useBulkDeleteAttackDiscoverySchedules();

  const openScheduleDetails = useCallback((scheduleId: string) => {
    setScheduleDetailsId(scheduleId);
  }, []);
  const enableSchedule = useCallback(
    async (id: string) => {
      try {
        setTableLoading(true);
        await enableAttackDiscoverySchedule({ id });
      } catch (err) {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        setTableLoading(false);
      }
    },
    [enableAttackDiscoverySchedule]
  );
  const disableSchedule = useCallback(
    async (id: string) => {
      try {
        setTableLoading(true);
        await disableAttackDiscoverySchedule({ id });
      } catch (err) {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        setTableLoading(false);
      }
    },
    [disableAttackDiscoverySchedule]
  );
  const deleteSchedule = useCallback(
    async (id: string) => {
      try {
        setTableLoading(true);
        await deleteAttackDiscoverySchedule({ id });
      } catch (err) {
        // Error is handled by the mutation's onError callback, so no need to do anything here
      } finally {
        setTableLoading(false);
      }
    },
    [deleteAttackDiscoverySchedule]
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
      clearSelection();
    } catch (err) {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setTableLoading(false);
    }
  }, [bulkEnableAttackDiscoverySchedules, clearSelection, selectedSchedules]);

  const bulkDisableSchedules = useCallback(async () => {
    const ids = selectedSchedules.filter(({ enabled }) => enabled).map(({ id }) => id);
    if (!ids.length) {
      clearSelection();
      return;
    }

    try {
      setTableLoading(true);
      await bulkDisableAttackDiscoverySchedules({ ids });
      clearSelection();
    } catch (err) {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setTableLoading(false);
    }
  }, [bulkDisableAttackDiscoverySchedules, clearSelection, selectedSchedules]);

  const bulkDeleteSchedules = useCallback(async () => {
    const ids = selectedSchedules.map(({ id }) => id);
    if (!ids.length) {
      setIsDeleteConfirmationVisible(false);
      return;
    }

    try {
      setTableLoading(true);
      await bulkDeleteAttackDiscoverySchedules({ ids });
      clearSelection();
      setIsDeleteConfirmationVisible(false);
    } catch (err) {
      // Error is handled by the mutation's onError callback, so no need to do anything here
    } finally {
      setTableLoading(false);
    }
  }, [bulkDeleteAttackDiscoverySchedules, clearSelection, selectedSchedules]);

  const closeDeleteConfirmation = useCallback(() => {
    setIsDeleteConfirmationVisible(false);
  }, []);

  const showDeleteConfirmation = useCallback(() => {
    setIsDeleteConfirmationVisible(true);
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
              showDeleteConfirmation();
            }}
          >
            {i18n.BULK_DELETE_ACTION}
          </EuiContextMenuItem>,
        ]}
      />
    ),
    [bulkDisableSchedules, bulkEnableSchedules, selectedSchedules, showDeleteConfirmation]
  );

  const rulesColumns = useColumns({
    isDisabled: isDataLoading,
    isLoading: isTableLoading,
    openScheduleDetails,
    enableSchedule,
    disableSchedule,
    deleteSchedule,
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
      {isDeleteConfirmationVisible && (
        <EuiConfirmModal
          aria-labelledby={bulkDeleteModalTitleId}
          title={i18n.BULK_DELETE_CONFIRMATION_TITLE}
          titleProps={{ id: bulkDeleteModalTitleId }}
          onCancel={closeDeleteConfirmation}
          onConfirm={bulkDeleteSchedules}
          cancelButtonText={i18n.BULK_DELETE_CONFIRMATION_CANCEL}
          confirmButtonText={i18n.BULK_DELETE_CONFIRMATION_CONFIRM}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="schedulesTableBulkDeleteConfirmationModal"
        >
          {i18n.BULK_DELETE_CONFIRMATION_BODY(selectedSchedules.length)}
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
