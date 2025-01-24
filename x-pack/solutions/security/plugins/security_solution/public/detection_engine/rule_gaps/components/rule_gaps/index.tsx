/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import React, { useCallback, useState } from 'react';
import moment from 'moment';
import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  OnRefreshChangeProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiBetaBadge,
  EuiProgress,
  EuiText,
  EuiHealth,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { useUserData } from '../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';
import { BETA, BETA_TOOLTIP } from '../../../../common/translations';
import { HeaderSection } from '../../../../common/components/header_section';
import { TableHeaderTooltipCell } from '../../../rule_management_ui/components/rules_table/table_header_tooltip_cell';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { useKibana } from '../../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import * as i18n from './translations';
import type { Gap, GapStatus } from '../../types';
import { getStatusLabel } from './utils';
import { GapStatusFilter } from './status_filter';
import { useFindGapsForRule } from '../../api/hooks/use_find_gaps_for_rule';
import { FillGap } from './fill_gap';
const DatePickerEuiFlexItem = styled(EuiFlexItem)`
  max-width: 582px;
`;

const getGapsTableColumns = (hasCRUDPermissions: boolean, ruleId: string, enabled: boolean) => {
  const fillActions = {
    name: i18n.GAPS_TABLE_ACTIONS_LABEL,
    align: 'right' as const,
    render: (gap: Gap) => <FillGap isRuleEnabled={enabled} ruleId={ruleId} gap={gap} />,
    width: '15%',
  };

  const columns: Array<EuiBasicTableColumn<Gap>> = [
    {
      field: 'status',
      sortable: true,
      name: <TableHeaderTooltipCell title={i18n.GAPS_TABLE_STATUS_LABEL} tooltipContent="" />,
      render: (value: GapStatus) => getStatusLabel(value),
      width: '10%',
    },
    {
      field: '@timestamp',
      sortable: true,
      name: <TableHeaderTooltipCell title={i18n.GAPS_TABLE_EVENT_TIME_LABEL} tooltipContent="" />,
      render: (value: Gap['@timestamp']) => (
        <FormattedDate value={value} fieldName={'@timestamp'} />
      ),
      width: '15%',
    },
    {
      field: 'in_progress_intervals',
      name: (
        <TableHeaderTooltipCell title={i18n.GAPS_TABLE_MANUAL_FILL_TASKS_LABEL} tooltipContent="" />
      ),
      render: (value: Gap['in_progress_intervals']) => {
        if (!value || !value.length) return null;
        return <EuiHealth color={'primary'}>{i18n.GAPS_TABLE_IN_PROGRESS_LABEL}</EuiHealth>;
      },
      width: '10%',
    },
    {
      width: '10%',
      align: 'right',
      name: (
        <TableHeaderTooltipCell
          title={i18n.GAPS_TABLE_EVENT_TIME_COVERED_LABEL}
          tooltipContent=""
        />
      ),
      render: (item: Gap) => {
        if (!item) return null;
        const value = Math.ceil((item.filled_duration_ms * 100) / item.total_gap_duration_ms);
        return (
          <EuiFlexGroup
            alignItems="center"
            data-test-subj="rule-gaps-progress-bar"
            justifyContent="flexEnd"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <p>
                  {value}
                  {'%'}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem style={{ maxWidth: '40px' }}>
              <EuiProgress value={value} max={100} size="xs" />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'range',
      name: <TableHeaderTooltipCell title={i18n.GAPS_TABLE_GAP_RANGE_LABEL} tooltipContent={''} />,
      render: (value: Gap['range']) => (
        <>
          <FormattedDate value={value?.gte} fieldName={'start'} />
          {' - '}
          <FormattedDate value={value?.lte} fieldName={'end'} />
        </>
      ),
      width: '40%',
    },
    {
      field: 'total_gap_duration_ms',
      sortable: true,
      name: (
        <TableHeaderTooltipCell title={i18n.GAPS_TABLE_GAP_DURATION_TOOLTIP} tooltipContent={''} />
      ),
      render: (value: Gap['total_gap_duration_ms']) => (
        <> {value != null ? moment.duration(value, 'ms').humanize() : getEmptyTagValue()}</>
      ),
      width: '10%',
    },
  ];

  if (hasCRUDPermissions) {
    columns.push(fillActions);
  }

  return columns;
};

const DEFAULT_PAGE_SIZE = 10;

export const RuleGaps = ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: 'now-24h',
    end: 'now',
  });
  const [{ canUserCRUD }] = useUserData();
  const { timelines } = useKibana().services;
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);
  const [refreshInterval, setRefreshInterval] = useState(1000);
  const [isPaused, setIsPaused] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState<GapStatus[]>([]);
  const [sort, setSort] = useState<{ field: keyof Gap; direction: 'desc' | 'asc' }>({
    field: '@timestamp',
    direction: 'desc',
  });

  const getSortField = (field: keyof Gap) => {
    if (field === '@timestamp' || !field) {
      return '@timestamp';
    }
    return `kibana.alert.rule.gap.${field}`;
  };

  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useFindGapsForRule({
    ruleId,
    page: pageIndex + 1,
    perPage: pageSize,
    start: dateRange.start,
    end: dateRange.end,
    statuses: selectedStatuses,
    sortField: getSortField(sort.field),
    sortOrder: sort.direction,
  });

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
  };

  const columns = getGapsTableColumns(hasCRUDPermissions, ruleId, enabled);

  const onRefreshCallback = () => {
    refetch();
  };

  const handleTableChange: (params: CriteriaWithPagination<Gap>) => void = ({
    page,
    sort: newSort,
  }) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
    if (newSort) {
      setSort(newSort);
    }
  };

  const onTimeChangeCallback = useCallback(
    (props: OnTimeChangeProps) => {
      setDateRange({ start: props.start, end: props.end });
    },
    [setDateRange]
  );

  const onRefreshChangeCallback = useCallback(
    (props: OnRefreshChangeProps) => {
      setIsPaused(props.isPaused);
      // Only support auto-refresh >= 5s -- no current ability to limit within component
      setRefreshInterval(props.refreshInterval > 5000 ? props.refreshInterval : 5000);
    },
    [setIsPaused, setRefreshInterval]
  );

  const handleStatusChange = useCallback(
    (statuses: GapStatus[]) => {
      setSelectedStatuses(statuses);
    },
    [setSelectedStatuses]
  );

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup
        alignItems="flexStart"
        justifyContent="spaceBetween"
        gutterSize="s"
        data-test-subj="rule-gaps-info"
      >
        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize="s" alignItems="baseline">
            <HeaderSection title={'Gaps'} subtitle={'Rule gaps'} />
            <EuiBetaBadge label={BETA} tooltipContent={BETA_TOOLTIP} />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={true}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <GapStatusFilter selectedItems={selectedStatuses} onChange={handleStatusChange} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DatePickerEuiFlexItem>
                <EuiSuperDatePicker
                  data-test-subj="rule-gaps-date-picker"
                  start={dateRange.start}
                  end={dateRange.end}
                  onTimeChange={onTimeChangeCallback}
                  onRefresh={onRefreshCallback}
                  isPaused={isPaused}
                  isLoading={isFetching}
                  refreshInterval={refreshInterval}
                  onRefreshChange={onRefreshChangeCallback}
                  width="full"
                />
              </DatePickerEuiFlexItem>
            </EuiFlexItem>
          </EuiFlexGroup>
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
        data-test-subj="rule-gaps-table"
        items={data?.data ?? []}
        columns={columns}
        pagination={pagination}
        error={isError ? 'error' : undefined}
        loading={isLoading}
        onChange={handleTableChange}
        sorting={{
          sort,
        }}
      />
    </EuiPanel>
  );
};
