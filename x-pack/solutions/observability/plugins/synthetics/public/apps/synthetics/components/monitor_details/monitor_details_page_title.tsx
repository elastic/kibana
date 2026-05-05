/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { MonitorSelector } from './monitor_selector/monitor_selector';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';
import { SyntheticsRemoteBadge } from '../common/components/synthetics_remote_badge';
import { useGetUrlParams } from '../../hooks';

export const MonitorDetailsPageTitle = () => {
  const { monitor, isRemote } = useSelectedMonitor();
  const { latestPing } = useMonitorLatestPing();
  const { monitorId } = useParams<{ monitorId: string }>();
  const { remoteName } = useGetUrlParams();

  // For remote monitors, use the name from the latest ping since there's no saved object
  const name = monitor?.name ?? latestPing?.monitor?.name ?? monitorId;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} data-test-subj="monitorNameTitle">
        {name}
      </EuiFlexItem>
      {isRemote && remoteName && (
        <EuiFlexItem grow={false}>
          <SyntheticsRemoteBadge remote={{ remoteName }} />
        </EuiFlexItem>
      )}
      {!isRemote && (
        <EuiFlexItem>
          <MonitorSelector />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
