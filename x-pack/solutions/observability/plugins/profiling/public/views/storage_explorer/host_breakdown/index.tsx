/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { AsyncStatus } from '../../../hooks/use_async';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { HostsTable } from './hosts_table';
import { HostBreakdownChart } from './host_breakdown_chart';

interface Props {
  hasDistinctProbabilisticValues: boolean;
  onReady: () => void;
}

export function HostBreakdown({ hasDistinctProbabilisticValues, onReady }: Props) {
  const { query } = useProfilingParams('/storage-explorer');
  const { rangeFrom, rangeTo, kuery, indexLifecyclePhase } = query;
  const timeRange = useTimeRange({ rangeFrom, rangeTo });
  const {
    services: { fetchStorageExplorerHostStorageDetails },
  } = useProfilingDependencies();

  const storageExplorerHostDetailsState = useTimeRangeAsync(
    ({ http }) => {
      return fetchStorageExplorerHostStorageDetails({
        http,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        kuery,
        indexLifecyclePhase,
      });
    },
    [
      fetchStorageExplorerHostStorageDetails,
      timeRange.inSeconds.start,
      timeRange.inSeconds.end,
      kuery,
      indexLifecyclePhase,
    ]
  );

  useEffect(() => {
    if (storageExplorerHostDetailsState.status === AsyncStatus.Settled) {
      onReady();
    }
  }, [storageExplorerHostDetailsState.status, onReady]);

  return (
    <>
      <EuiTitle>
        <EuiText>
          {i18n.translate('xpack.profiling.storageExplorer.hostBreakdown.title', {
            defaultMessage: 'Host agent breakdown',
          })}
          <EuiToolTip
            content={i18n.translate('xpack.profiling.storageExplorer.hostBreakdown.title.hint', {
              defaultMessage:
                'This graph shows the combined values of Universal Profiling samples and metrics. host.name[host.id].',
            })}
          >
            <EuiIcon type="questionInCircle" style={{ marginLeft: 4 }} />
          </EuiToolTip>
        </EuiText>
      </EuiTitle>
      <EuiSpacer />
      <EuiPanel hasShadow={false} hasBorder>
        <AsyncComponent size="xl" {...storageExplorerHostDetailsState} style={{ height: 400 }}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <HostBreakdownChart
                data={storageExplorerHostDetailsState.data?.hostDetailsTimeseries}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <HostsTable
                data={storageExplorerHostDetailsState.data?.hostDetails}
                hasDistinctProbabilisticValues={hasDistinctProbabilisticValues}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </AsyncComponent>
      </EuiPanel>
    </>
  );
}
