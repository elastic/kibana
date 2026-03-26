/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { EuiTableRowProps } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import type { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';
import { useOverviewStatus } from '../../../../hooks/use_overview_status';
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

  const { columns } = useMonitorsTableColumns({ setFlyoutConfigCallback, items: pageOfItems });

  const dispatch = useDispatch();

  const getRowProps = useCallback(
    (monitor: OverviewStatusMetaData): EuiTableRowProps => {
      const { configId, locationLabel, locationId, spaces } = monitor;
      return {
        onClick: (e) => {
          // This is a workaround to prevent the flyout from opening when clicking on the action buttons
          if (
            Array.from((e.target as HTMLElement).classList).some(
              (className) =>
                className.includes('euiTableCellContent') || className.includes('clickCellContent')
            )
          ) {
            dispatch(
              setFlyoutConfigCallback({
                configId,
                id: configId,
                location: locationLabel,
                locationId,
                spaces,
              })
            );
          }
        },
      };
    },
    [dispatch, setFlyoutConfigCallback]
  );

  return (
    <EuiBasicTable
      compressed
      items={pageOfItems}
      columns={columns}
      loading={!status || !loaded || loading}
      pagination={pagination}
      onChange={onTableChange}
      rowProps={getRowProps}
      data-test-subj="syntheticsCompactViewTable"
      tableLayout="auto"
      tableCaption={i18n.translate('xpack.synthetics.monitorsTable.tableCaption', {
        defaultMessage: 'Compact monitors list',
      })}
    />
  );
};
