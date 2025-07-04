/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import { useFindBackfillsForRules } from '../../api/hooks/use_find_backfills_for_rules';
import { StopBackfill } from './stop_backfill';
import { BackfillStatusInfo } from './backfill_status';
import { FormattedDate } from '../../../../common/components/formatted_date';
import type { BackfillRow, BackfillStatus } from '../../types';
import * as i18n from '../../translations';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import { useUserData } from '../../../../detections/components/user_info';
import { getBackfillRowsFromResponse } from './utils';
import { HeaderSection } from '../../../../common/components/header_section';
import { TableHeaderTooltipCell } from '../../../rule_management_ui/components/rules_table/table_header_tooltip_cell';
import { useKibana } from '../../../../common/lib/kibana';

const DEFAULT_PAGE_SIZE = 10;

const getBackfillsTableColumns = (hasCRUDPermissions: boolean) => {
  const stopAction = {
    name: i18n.BACKFILLS_TABLE_COLUMN_ACTION,
    render: (item: BackfillRow) => <StopBackfill backfill={item} />,
    width: '10%',
  };

  const columns: Array<EuiBasicTableColumn<BackfillRow>> = [
    {
      field: 'status',
      name: (
        <TableHeaderTooltipCell
          title={i18n.BACKFILLS_TABLE_COLUMN_STATUS}
          tooltipContent={i18n.BACKFILLS_TABLE_COLUMN_STATUS_TOOLTIP}
        />
      ),
      render: (value: BackfillStatus) => <BackfillStatusInfo status={value} />,
      width: '10%',
    },
    {
      field: 'created_at',
      name: (
        <TableHeaderTooltipCell
          title={i18n.BACKFILLS_TABLE_COLUMN_CREATED_AT}
          tooltipContent={i18n.BACKFILLS_TABLE_COLUMN_CREATED_AT_TOOLTIP}
        />
      ),
      render: (value: 'string') => <FormattedDate value={value} fieldName={'created_at'} />,
      width: '20%',
    },
    {
      name: (
        <TableHeaderTooltipCell
          title={i18n.BACKFILLS_TABLE_COLUMN_SOURCE_TIME_RANGE}
          tooltipContent={i18n.BACKFILLS_TABLE_COLUMN_SOURCE_TIME_RANGE_TOOLTIP}
        />
      ),
      render: (value: BackfillRow) => (
        <>
          <FormattedDate value={value.start} fieldName={'start'} />
          {' - '}
          <FormattedDate value={value.end} fieldName={'end'} />
        </>
      ),
      width: '30%',
    },
    {
      field: 'error',
      align: 'right',
      name: (
        <TableHeaderTooltipCell
          title={i18n.BACKFILLS_TABLE_COLUMN_ERROR}
          tooltipContent={i18n.BACKFILLS_TABLE_COLUMN_ERROR_TOOLTIP}
        />
      ),
      'data-test-subj': 'rule-backfills-column-error',
    },
    {
      field: 'pending',
      align: 'right',
      name: (
        <TableHeaderTooltipCell
          title={i18n.BACKFILLS_TABLE_COLUMN_PENDING}
          tooltipContent={i18n.BACKFILLS_TABLE_COLUMN_PENDING_TOOLTIP}
        />
      ),
      'data-test-subj': 'rule-backfills-column-pending',
    },
    {
      field: 'running',
      align: 'right',
      name: (
        <TableHeaderTooltipCell
          title={i18n.BACKFILLS_TABLE_COLUMN_RUNNING}
          tooltipContent={i18n.BACKFILLS_TABLE_COLUMN_RUNNING_TOOLTIP}
        />
      ),
      'data-test-subj': 'rule-backfills-column-running',
    },
    {
      field: 'complete',
      align: 'right',
      name: (
        <TableHeaderTooltipCell
          title={i18n.BACKFILLS_TABLE_COLUMN_COMPLETED}
          tooltipContent={i18n.BACKFILLS_TABLE_COLUMN_COMPLETED_TOOLTIP}
        />
      ),
      'data-test-subj': 'rule-backfills-column-completed',
    },
    {
      field: 'total',
      align: 'right',
      name: (
        <TableHeaderTooltipCell
          title={i18n.BACKFILLS_TABLE_COLUMN_TOTAL}
          tooltipContent={i18n.BACKFILLS_TABLE_COLUMN_TOTAL_TOOLTIP}
        />
      ),
      'data-test-subj': 'rule-backfills-column-total',
    },
  ];

  if (hasCRUDPermissions) {
    columns.push(stopAction);
  }

  return columns;
};

export const RuleBackfillsInfo = React.memo<{ ruleId: string }>(({ ruleId }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [{ canUserCRUD }] = useUserData();
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);
  const { timelines } = useKibana().services;
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useFindBackfillsForRules({
    ruleIds: [ruleId],
    page: pageIndex + 1,
    perPage: pageSize,
  });

  const backfills: BackfillRow[] = getBackfillRowsFromResponse(data?.data ?? []);

  const columns = getBackfillsTableColumns(hasCRUDPermissions);

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
  };

  const handleTableChange: (params: CriteriaWithPagination<BackfillRow>) => void = ({
    page,
    sort,
  }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" data-test-subj="rule-backfills-info">
        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize="s" alignItems="baseline">
            <HeaderSection
              title={i18n.BACKFILL_TABLE_TITLE}
              subtitle={i18n.BACKFILL_TABLE_SUBTITLE}
            />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton iconType="refresh" fill onClick={handleRefresh}>
            {i18n.BACKFILL_TABLE_REFRESH}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {timelines.getLastUpdated({
            showUpdating: isLoading,
            updatedAt: dataUpdatedAt,
          })}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiBasicTable
        data-test-subj="rule-backfills-table"
        items={backfills}
        columns={columns}
        pagination={pagination}
        error={isError ? 'error' : undefined}
        loading={isLoading}
        onChange={handleTableChange}
      />
    </EuiPanel>
  );
});

RuleBackfillsInfo.displayName = 'RuleBackfillsInfo';
