/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiSpacer, EuiBasicTable } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';

import { useColumns } from './use_columns';
import { useFindAttackDiscoverySchedules } from '../logic/use_find_schedules';
import { useEnableAttackDiscoverySchedule } from '../logic/use_enable_schedule';
import { useDisableAttackDiscoverySchedule } from '../logic/use_disable_schedule';
import { useDeleteAttackDiscoverySchedule } from '../logic/use_delete_schedule';
import { DetailsFlyout } from '../details_flyout';

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

  const { data: { schedules, total } = { schedules: [], total: 0 }, isLoading: isDataLoading } =
    useFindAttackDiscoverySchedules({
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

  const { mutateAsync: enableAttackDiscoverySchedule } = useEnableAttackDiscoverySchedule();
  const { mutateAsync: disableAttackDiscoverySchedule } = useDisableAttackDiscoverySchedule();
  const { mutateAsync: deleteAttackDiscoverySchedule } = useDeleteAttackDiscoverySchedule();

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
      <EuiBasicTable<AttackDiscoverySchedule>
        loading={isTableLoading}
        items={schedules}
        pagination={pagination}
        sorting={sorting}
        onChange={onTableChange}
        itemId={'id'}
        data-test-subj={'schedulesTable'}
        columns={rulesColumns}
      />
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
