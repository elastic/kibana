/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';
import { MaintenanceWindowsLink } from '../../monitor_add_edit/fields/maintenance_windows/create_maintenance_windows_btn';
import { useMaintenanceWindows } from '../../monitor_add_edit/fields/maintenance_windows/use_maintenance_windows';

export const MonitorMaintenanceWindows = ({ monitorMWs }: { monitorMWs: string[] }) => {
  const { isLoading, data } = useMaintenanceWindows();

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    data?.data?.forEach((mw) => map.set(mw.id, mw.title));
    return map;
  }, [data]);

  if (isLoading && !data) {
    return <EuiSkeletonText lines={1} />;
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {monitorMWs.map((id) => (
        <EuiFlexItem grow={false} key={id}>
          <MaintenanceWindowsLink id={id} label={titleById.get(id) ?? id} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
