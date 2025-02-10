/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePerformanceContext } from '@kbn/ebt-tools';
import React, { useState, useEffect } from 'react';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { PrimaryProfilingSearchBar } from '../../components/profiling_app_page_template/primary_profiling_search_bar';
import { AsyncStatus } from '../../hooks/use_async';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { DataBreakdown } from './data_breakdown';
import { DistinctProbabilisticValuesWarning } from './distinct_probabilistic_values_warning';
import { HostBreakdown } from './host_breakdown';
import { IndexLifecyclePhaseSelect } from './index_lifecycle_phase_select';
import { Summary } from './summary';

export function StorageExplorerView() {
  const { query } = useProfilingParams('/storage-explorer');
  const { rangeFrom, rangeTo, indexLifecyclePhase } = query;
  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const [selectedTab, setSelectedTab] = useState<'host_breakdown' | 'data_breakdown'>(
    'host_breakdown'
  );
  const [loadedState, setLoadedState] = useState({
    summary: false,
    hostBreakdown: false,
  });

  const {
    services: { fetchStorageExplorerSummary },
  } = useProfilingDependencies();

  const storageExplorerSummaryState = useTimeRangeAsync(
    ({ http }) => {
      return fetchStorageExplorerSummary({
        http,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        kuery: '',
        indexLifecyclePhase,
      });
    },
    [
      fetchStorageExplorerSummary,
      timeRange.inSeconds.start,
      timeRange.inSeconds.end,
      indexLifecyclePhase,
    ]
  );

  useEffect(() => {
    if (!loadedState.summary && storageExplorerSummaryState.status === AsyncStatus.Settled) {
      setLoadedState((prevState) => ({ ...prevState, summary: true }));
    }
  }, [loadedState.summary, storageExplorerSummaryState.status, setLoadedState]);

  const totalNumberOfDistinctProbabilisticValues =
    storageExplorerSummaryState.data?.totalNumberOfDistinctProbabilisticValues || 0;
  const hasDistinctProbabilisticValues = totalNumberOfDistinctProbabilisticValues > 1;

  const handleOnReady = () => {
    if (!loadedState.hostBreakdown) {
      setLoadedState((prevState) => ({ ...prevState, hostBreakdown: true }));
    }
  };

  const { onPageReady } = usePerformanceContext();
  useEffect(() => {
    if (loadedState.hostBreakdown && loadedState.summary) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
      });
    }
  }, [loadedState, onPageReady, rangeFrom, rangeTo]);

  return (
    <ProfilingAppPageTemplate
      hideSearchBar
      pageTitle={i18n.translate('xpack.profiling.storageExplorer.title', {
        defaultMessage: 'Storage Explorer',
      })}
      showBetaBadge
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiPanel hasShadow={false} color="subdued">
            <PrimaryProfilingSearchBar />
            <EuiHorizontalRule />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IndexLifecyclePhaseSelect />
            </div>
          </EuiPanel>
        </EuiFlexItem>
        {hasDistinctProbabilisticValues && (
          <EuiFlexItem grow={false}>
            <DistinctProbabilisticValuesWarning
              totalNumberOfDistinctProbabilisticValues={totalNumberOfDistinctProbabilisticValues}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <Summary
            data={storageExplorerSummaryState.data}
            isLoading={storageExplorerSummaryState.status === AsyncStatus.Loading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTabs>
            <EuiTab
              data-test-subj="storageExplorer_hostBreakdownTab"
              onClick={() => {
                setSelectedTab('host_breakdown');
              }}
              isSelected={selectedTab === 'host_breakdown'}
            >
              {i18n.translate('xpack.profiling.storageExplorer.tabs.hostBreakdown', {
                defaultMessage: 'Host agent breakdown',
              })}
            </EuiTab>
            <EuiTab
              data-test-subj="storageExplorer_dataBreakdownTab"
              onClick={() => {
                setSelectedTab('data_breakdown');
              }}
              isSelected={selectedTab === 'data_breakdown'}
            >
              {i18n.translate('xpack.profiling.storageExplorer.tabs.dataBreakdown', {
                defaultMessage: 'Data breakdown',
              })}
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>
        {selectedTab === 'host_breakdown' ? (
          <EuiFlexItem grow={false}>
            <HostBreakdown
              hasDistinctProbabilisticValues={hasDistinctProbabilisticValues}
              onReady={handleOnReady}
            />
          </EuiFlexItem>
        ) : null}
        {selectedTab === 'data_breakdown' ? (
          <EuiFlexItem grow={false}>
            <DataBreakdown />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </ProfilingAppPageTemplate>
  );
}
