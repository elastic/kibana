/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { useMonitorsSortedByStatus } from '../../../../../hooks/use_monitors_sorted_by_status';
import { selectOverviewState } from '../../../../../state';
import { GridItemsByGroup } from '../grid_by_group/grid_items_by_group';
import { FlyoutParamProps } from '../types';
import { MonitorsTable } from './components/monitors_table';

export const OverviewGridCompactView = ({
  setFlyoutConfigCallback,
}: {
  setFlyoutConfigCallback: (params: FlyoutParamProps) => void;
}) => {
  const {
    groupBy: { field: groupField },
  } = useSelector(selectOverviewState);
  const monitorsSortedByStatus = useMonitorsSortedByStatus();

  return groupField === 'none' ? (
    <MonitorsTable
      items={monitorsSortedByStatus}
      setFlyoutConfigCallback={setFlyoutConfigCallback}
    />
  ) : (
    <GridItemsByGroup setFlyoutConfigCallback={setFlyoutConfigCallback} view="compactView" />
  );
};
