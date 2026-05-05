/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiDescriptionList, EuiSkeletonText } from '@elastic/eui';
import { BadgeStatus, MonitorStatus, STATUS_LABEL } from '../common/components/monitor_status';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';

export const MonitorDetailsStatus = () => {
  const { latestPing, loading: pingsLoading } = useMonitorLatestPing();

  const { monitor, isMonitorMissing, isRemote } = useSelectedMonitor();

  if (!monitor && !isRemote) {
    return (
      <EuiDescriptionList
        align="left"
        compressed={false}
        listItems={[
          {
            title: STATUS_LABEL,
            description: isMonitorMissing ? <></> : <EuiSkeletonText lines={1} />,
          },
        ]}
      />
    );
  }

  // For remote monitors, `monitor` is null (no local saved object).
  // MonitorStatus requires a non-null monitor (accesses monitor.type).
  // Render the badge directly using the ping status and type instead.
  if (!monitor) {
    const status = latestPing?.monitor.status;
    const isBrowserType = latestPing?.monitor?.type === 'browser';
    return (
      <EuiDescriptionList
        align="left"
        compressed={false}
        listItems={[
          {
            title: STATUS_LABEL,
            description:
              pingsLoading && !latestPing ? (
                <EuiSkeletonText lines={1} />
              ) : (
                <BadgeStatus status={status} isBrowserType={isBrowserType} />
              ),
          },
        ]}
      />
    );
  }

  return (
    <MonitorStatus
      status={latestPing?.monitor.status}
      monitor={monitor}
      loading={pingsLoading}
      compressed={false}
    />
  );
};
