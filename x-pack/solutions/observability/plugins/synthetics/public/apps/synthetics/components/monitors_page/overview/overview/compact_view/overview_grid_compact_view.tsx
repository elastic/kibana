/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable } from '@elastic/eui';
import React from 'react';
import { useSelector } from 'react-redux';
import { useMonitorsSortedByStatus } from '../../../../../hooks/use_monitors_sorted_by_status';
import { selectOverviewState } from '../../../../../state';
import { useOverviewCompactView } from './hooks/use_overview_compact_view';
import { GridItemsByGroup } from '../grid_by_group/grid_items_by_group';
import { OverviewStatusMetaData } from '../../types';

export const OverviewGridCompactView = () => {
  const {
    groupBy: { field: groupField },
  } = useSelector(selectOverviewState);
  const { setFlyoutConfigCallback } = useOverviewCompactView();
  const monitorsSortedByStatus = useMonitorsSortedByStatus();

  return groupField === 'none' ? (
    <MonitorTable items={monitorsSortedByStatus} />
  ) : (
    <GridItemsByGroup setFlyoutConfigCallback={setFlyoutConfigCallback} view="compactView" />
  );
};

export const MonitorTable = ({ items }: { items: OverviewStatusMetaData[] }) => {
  const { columns, loading, getRowProps } = useOverviewCompactView();

  return <EuiBasicTable items={items} columns={columns} loading={loading} rowProps={getRowProps} />;
};
