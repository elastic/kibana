/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiBasicTable, EuiTableRowProps } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { OverviewStatusMetaData } from '../../../../../../../../../common/runtime_types';
import { useOverviewStatus } from '../../../../hooks/use_overview_status';
import { FlyoutParamProps } from '../../types';
import { useMonitorsTableColumns } from '../hooks/use_monitors_table_columns';
import { useMonitorsTablePagination } from '../hooks/use_monitors_table_pagination';

export const MonitorsTable = ({
  items,
  setFlyoutConfigCallback,
}: {
  items: OverviewStatusMetaData[];
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const { loaded, status } = useOverviewStatus({
    scopeStatusByLocation: true,
  });
  const { columns } = useMonitorsTableColumns({ setFlyoutConfigCallback });
  const { pageOfItems, pagination, onTableChange } = useMonitorsTablePagination({
    totalItems: items,
  });

  const dispatch = useDispatch();

  const getRowProps = useCallback(
    (monitor: OverviewStatusMetaData): EuiTableRowProps => {
      const { configId, locationLabel, locationId, spaceId } = monitor;
      return {
        onClick: (e) => {
          // This is a workaround to prevent the flyout from opening when clicking on the action buttons
          if (
            Array.from((e.target as HTMLElement).classList).some((className) =>
              className.includes('euiTableCellContent')
            )
          ) {
            dispatch(
              setFlyoutConfigCallback({
                configId,
                id: configId,
                location: locationLabel,
                locationId,
                spaceId,
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
      items={pageOfItems}
      columns={columns}
      loading={!status || !loaded}
      pagination={pagination}
      onChange={onTableChange}
      rowProps={getRowProps}
    />
  );
};
