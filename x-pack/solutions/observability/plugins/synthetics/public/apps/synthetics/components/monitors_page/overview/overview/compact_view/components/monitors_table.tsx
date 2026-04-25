/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { EuiTableRowProps } from '@elastic/eui';
import { EuiBasicTable, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import type { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';
import { useOverviewStatus } from '../../../../hooks/use_overview_status';
import { selectOverviewFlyoutConfig } from '../../../../../../state';
import type { FlyoutParamProps } from '../../types';
import { useMonitorsTableColumns } from '../hooks/use_monitors_table_columns';
import { useMonitorsTablePagination } from '../hooks/use_monitors_table_pagination';
import { useOverviewTrendsRequests } from '../../../../hooks/use_overview_trends_requests';

export const MonitorsTable = ({
  items,
  setFlyoutConfigCallback,
}: {
  items: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const { loaded, status, loading } = useOverviewStatus({
    scopeStatusByLocation: true,
  });
  const { pageOfItems, pagination, onTableChange } = useMonitorsTablePagination({
    totalItems: items,
  });

  useOverviewTrendsRequests(pageOfItems);

  const flyoutConfig = useSelector(selectOverviewFlyoutConfig);
  const isFlyoutOpen = Boolean(flyoutConfig?.configId);

  const { columns } = useMonitorsTableColumns({
    setFlyoutConfigCallback,
    items: pageOfItems,
    isFlyoutOpen,
  });

  const dispatch = useDispatch();

  const getRowProps = useCallback(
    (monitor: OverviewStatusMetaData): EuiTableRowProps => {
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
