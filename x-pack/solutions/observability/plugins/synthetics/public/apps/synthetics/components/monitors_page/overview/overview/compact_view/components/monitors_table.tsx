/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CSSProperties } from 'react';
import React, { useCallback, useMemo } from 'react';
import type { Criteria, EuiBasicTableProps, EuiTableRowProps } from '@elastic/eui';
import { EuiBasicTable, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import type { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';
import { useOverviewStatusState } from '../../../../hooks/use_overview_status';
import { selectOverviewFlyoutConfig, selectOverviewPageState } from '../../../../../../state';
import type { MonitorOverviewPageState } from '../../../../../../state/overview/models';
import { setOverviewPageStateAction } from '../../../../../../state/overview';
import type { FlyoutParamProps } from '../../types';
import { useMonitorsTableColumns } from '../hooks/use_monitors_table_columns';
import { useMonitorsTablePagination } from '../hooks/use_monitors_table_pagination';
import { useOverviewTrendsRequests } from '../../../../hooks/use_overview_trends_requests';

// Maps EUI column `field` values to the redux `sortField` keys understood by
// `useMonitorsSortedByStatus`. Only columns whose data is actually sorted by
// the selector chain are listed here — other columns intentionally omit
// `sortable` so we don't expose non-functional UI. URL was folded into the
// Name cell (no header to click anymore) but the sort dropdown still drives
// the `urls` sort token via `sort_fields.tsx`.
const COLUMN_TO_SORT_FIELD: Record<string, MonitorOverviewPageState['sortField']> = {
  overallStatus: 'status',
  name: 'name.keyword',
};

const SORT_FIELD_TO_COLUMN = Object.fromEntries(
  Object.entries(COLUMN_TO_SORT_FIELD).map(([column, sortField]) => [sortField, column])
);

// Module-level stable empty list so passing it to `useOverviewTrendsRequests`
// while the flyout is open doesn't churn the effect's dependency identity.
const EMPTY_ITEMS: OverviewStatusMetaData[] = [];

export const MonitorsTable = ({
  items,
  setFlyoutConfigCallback,
}: {
  items: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const { loaded, status, loading } = useOverviewStatusState();
  const {
    pageOfItems,
    pagination,
    onTableChange: onPaginationChange,
  } = useMonitorsTablePagination({
    totalItems: items,
  });

  const flyoutConfig = useSelector(selectOverviewFlyoutConfig);
  const isFlyoutOpen = Boolean(flyoutConfig?.configId);
  const { sortField, sortOrder } = useSelector(selectOverviewPageState);

  // While the flyout is open we hide the columns that consume trend stats and
  // the down-history sparkline, so paying for those fetches just feeds caches
  // the user can't see. Pass an empty stable list to short-circuit the trends
  // dispatch; the histogram gate is plumbed via `enabled` below.
  useOverviewTrendsRequests(isFlyoutOpen ? EMPTY_ITEMS : pageOfItems);

  const { columns } = useMonitorsTableColumns({
    setFlyoutConfigCallback,
    items: pageOfItems,
    isFlyoutOpen,
  });

  const dispatch = useDispatch();

  const sorting: EuiBasicTableProps<OverviewStatusMetaData>['sorting'] = useMemo(() => {
    const sortColumn = sortField ? SORT_FIELD_TO_COLUMN[sortField] : undefined;
    if (!sortColumn) return undefined;
    return {
      sort: {
        field: sortColumn as keyof OverviewStatusMetaData,
        direction: sortOrder ?? 'asc',
      },
    };
  }, [sortField, sortOrder]);

  const onTableChange = useCallback(
    (criteria: Criteria<OverviewStatusMetaData>) => {
      onPaginationChange(criteria);
      const nextSort = criteria.sort;
      if (!nextSort) return;
      const mappedSortField = COLUMN_TO_SORT_FIELD[nextSort.field as string];
      if (!mappedSortField) return;
      if (mappedSortField === sortField && nextSort.direction === sortOrder) return;
      dispatch(
        setOverviewPageStateAction({
          sortField: mappedSortField,
          sortOrder: nextSort.direction,
        })
      );
    },
    [dispatch, onPaginationChange, sortField, sortOrder]
  );

  const getRowProps = useCallback(
    // EuiTableRowProps doesn't expose `style` directly even though EuiTableRow
    // forwards it via HTMLAttributes<HTMLTableRowElement>; widen the return so
    // we can pass `cursor: pointer` without a cast.
    (monitor: OverviewStatusMetaData): EuiTableRowProps & { style?: CSSProperties } => {
      const { configId, spaces } = monitor;
      const locationId = monitor.locations[0]?.id ?? '';
      const locationLabel = monitor.locations[0]?.label ?? '';
      return {
        style: { cursor: 'pointer' },
        onClick: (e) => {
          const target = e.target as HTMLElement;
          // Skip flyout when clicking interactive elements that have their own behavior
          if (target.closest('a, button, [role="button"]')) {
            return;
          }
          dispatch(
            setFlyoutConfigCallback({
              configId,
              id: configId,
              location: locationLabel,
              locationId,
              spaces,
            })
          );
        },
      };
    },
    [dispatch, setFlyoutConfigCallback]
  );

  const isLoading = !status || !loaded || loading;

  return (
    <EuiBasicTable
      compressed
      items={pageOfItems}
      columns={columns}
      loading={isLoading}
      pagination={pagination}
      sorting={sorting}
      onChange={onTableChange}
      rowProps={getRowProps}
      noItemsMessage={
        isLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : (
          <EuiText size="s">
            {i18n.translate('xpack.synthetics.monitorsTable.noItemsMessage', {
              defaultMessage: 'No monitors found',
            })}
          </EuiText>
        )
      }
      data-test-subj="syntheticsCompactViewTable"
      tableLayout="fixed"
      tableCaption={i18n.translate('xpack.synthetics.monitorsTable.tableCaption', {
        defaultMessage: 'Compact monitors list',
      })}
    />
  );
};
