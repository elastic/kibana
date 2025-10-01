/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiSwitch,
  EuiLoadingSpinner,
  EuiErrorBoundary,
  htmlIdGenerator,
  EuiTable,
  EuiTableHeaderCell,
  EuiTableBody,
  EuiTableRow,
  EuiTableHeader,
  EuiTableRowCell,
  EuiLink,
  EuiIcon,
  EuiButtonIcon,
} from '@elastic/eui';

import { Chart, Settings, Partition, PartitionLayout, type PartialTheme } from '@elastic/charts';
import moment from 'moment';

import { useGetGapsSummaryForAllRules } from '../../api/hooks/use_get_gaps_summary_for_all_rules';
import { GapRangeValue } from '../../constants';

import { useKibana } from '../../../../common/lib/kibana';
import { AutoFillSchedulerFlyoutTrigger } from './auto_fill_scheduler_flyout_trigger';
import {
  useGetGapAutoFillScheduler,
  useCreateGapAutoFillScheduler,
  useUpdateGapAutoFillScheduler,
} from '../../api/hooks/use_gap_auto_fill_scheduler';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

// Mock data for execution summary
const mockExecutionData = {
  success: 85,
  failed: 15,
  total: 100,
};

const formatDuration = (ms: number): string => {
  if (ms === 0) return '-';

  const duration = moment.duration(ms, 'ms');
  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

const ExecutionSummaryPanel = () => {
  const htmlId = htmlIdGenerator();
  const executionChartId = htmlId();

  const executionData = [
    {
      status: 'Success',
      count: mockExecutionData.success,
    },
    {
      status: 'Failed',
      count: mockExecutionData.failed,
    },
  ];

  const colors = ['#24C292', '#EE4C48']; // Success green, Danger red

  const themeOverrides: PartialTheme = {
    partition: { emptySizeRatio: 0.6 },
  };

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xxs">
        <h4 id={executionChartId}>{'Execution Summary'}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m" alignItems="center">
        {/* Left Column - Chart */}
        <EuiFlexItem grow={false}>
          <Chart size={{ height: 150, width: 150 }}>
            <Settings theme={themeOverrides} ariaLabelledBy={executionChartId} />
            <Partition
              id="execution-summary"
              data={executionData}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d) => d.count}
              valueFormatter={() => ''}
              layers={[
                {
                  groupByRollup: (d: (typeof executionData)[0]) => d.status,
                  shape: {
                    fillColor: (_, sortIndex) => colors[sortIndex % colors.length],
                  },
                },
              ]}
              clockwiseSectors={false}
            />
          </Chart>
        </EuiFlexItem>

        {/* Right Column - Table */}
        <EuiFlexItem grow={1}>
          <EuiTable>
            <EuiTableHeader>
              <EuiTableHeaderCell width="60%">{'Status'}</EuiTableHeaderCell>
              <EuiTableHeaderCell width="40%">{'Count'}</EuiTableHeaderCell>
            </EuiTableHeader>
            <EuiTableBody>
              {executionData.map((item, index) => (
                <EuiTableRow key={item.status}>
                  <EuiTableRowCell width="60%">
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: colors[index % colors.length],
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">{item.status}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiTableRowCell>
                  <EuiTableRowCell width="40%">
                    <EuiText size="s">{item.count}</EuiText>
                  </EuiTableRowCell>
                </EuiTableRow>
              ))}
            </EuiTableBody>
          </EuiTable>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const GapSummaryPanel = () => {
  const htmlId = htmlIdGenerator();
  const gapChartId = htmlId();

  const {
    data: gapData,
    isLoading,
    error,
    refetch,
  } = useGetGapsSummaryForAllRules({
    gapRange: GapRangeValue.LAST_90_D,
  });

  if (isLoading) {
    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiLoadingSpinner size="m" />
          <EuiText>{'Loading gap summary...'}</EuiText>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiText color="danger">{'Failed to load gap summary'}</EuiText>
      </EuiPanel>
    );
  }

  const totalGapMs = gapData?.total_gap_duration_ms || 0;
  const unfilledMs = gapData?.total_unfilled_duration_ms || 0;
  const inProgressMs = gapData?.total_in_progress_duration_ms || 0;
  const filledMs = gapData?.total_filled_duration_ms || 0;
  const unfilledRules = gapData?.total_unfilled_rules || 0;
  const inProgressRules = gapData?.total_in_progress_rules || 0;
  const filledRules = gapData?.total_filled_rules || 0;

  const gapDataForChart = [
    {
      status: 'Filled',
      count: filledMs,
      color: '#16C5C0',
      rules: filledRules,
    },
    {
      status: 'In Progress',
      count: inProgressMs,
      color: '#61A2FF',
      rules: inProgressRules,
    },
    {
      status: 'Unfilled',
      count: unfilledMs,
      color: '#F6726A',
      rules: unfilledRules,
    },
  ].filter((item) => item.count > 0); // Only show segments with data

  const themeOverrides: PartialTheme = {
    partition: { emptySizeRatio: 0.6 },
  };

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4 id={gapChartId}>{'Gap Summary'}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            onClick={() => refetch()}
            aria-label="Refresh gap data"
            isLoading={isLoading}
            data-test-subj="refresh-gap-data-button"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {gapDataForChart.filter((item) => item.count > 0).length > 0 ? (
        <EuiFlexGroup gutterSize="m" alignItems="center">
          {/* Left Column - Chart */}
          <EuiFlexItem grow={false}>
            <Chart size={{ height: 150, width: 150 }}>
              <Settings theme={themeOverrides} ariaLabelledBy={gapChartId} />
              <Partition
                id="gap-summary"
                data={gapDataForChart}
                layout={PartitionLayout.sunburst}
                valueAccessor={(d) => d.count}
                valueFormatter={() => ''}
                layers={[
                  {
                    groupByRollup: (d: (typeof gapDataForChart)[0]) => d.status,
                    shape: {
                      fillColor: (_, sortIndex) =>
                        gapDataForChart[sortIndex % gapDataForChart.length].color,
                    },
                  },
                ]}
                clockwiseSectors={false}
              />
            </Chart>
          </EuiFlexItem>

          {/* Right Column - Table */}
          <EuiFlexItem grow={1}>
            <EuiTable>
              <EuiTableHeader>
                <EuiTableHeaderCell width="60%">{'Status'}</EuiTableHeaderCell>
                <EuiTableHeaderCell width="15%">{'Rules'}</EuiTableHeaderCell>
                <EuiTableHeaderCell width="25%">{'Duration'}</EuiTableHeaderCell>
              </EuiTableHeader>
              <EuiTableBody>
                {gapDataForChart.map((item, index) => (
                  <EuiTableRow key={item.status}>
                    <EuiTableRowCell width="60%">
                      <EuiFlexGroup alignItems="center" gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: item.color,
                            }}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s">{item.status}</EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiTableRowCell>

                    <EuiTableRowCell width="15%">
                      <EuiText size="s">{item.rules}</EuiText>
                    </EuiTableRowCell>
                    <EuiTableRowCell width="25%">
                      <EuiText size="s">{formatDuration(item.count)}</EuiText>
                    </EuiTableRowCell>
                  </EuiTableRow>
                ))}
              </EuiTableBody>
            </EuiTable>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiText color="subdued" textAlign="center">
          {'No gap data available for the selected time range'}
        </EuiText>
      )}
    </EuiPanel>
  );
};

export const RulesWithGapsOverviewPanel = () => {
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const telemetry = useKibana().services.telemetry;

  // Gap auto fill scheduler hooks
  const { data: scheduler, isLoading: isSchedulerLoading } = useGetGapAutoFillScheduler();
  const createMutation = useCreateGapAutoFillScheduler();
  const updateMutation = useUpdateGapAutoFillScheduler();
  const { addSuccess, addError } = useAppToasts();

  // Initialize auto fill enabled state from scheduler data
  React.useEffect(() => {
    if (scheduler) {
      setAutoFillEnabled(scheduler.enabled);
    }
  }, [scheduler]);

  const handleAutoFillToggle = async (enabled: boolean) => {
    try {
      if (!scheduler) {
        // Create new scheduler with default 1h interval
        await createMutation.mutateAsync({
          enabled,
          schedule: { interval: '1m' },
        });
      } else {
        // Update existing scheduler
        await updateMutation.mutateAsync({
          enabled,
          schedule: scheduler.schedule,
        });
      }
      setAutoFillEnabled(enabled);
      addSuccess({
        title: enabled ? 'Auto Gap Fill enabled' : 'Auto Gap Fill disabled',
        text: enabled
          ? 'Gap auto fill scheduler has been enabled'
          : 'Gap auto fill scheduler has been disabled',
      });
    } catch (err) {
      addError(err, {
        title: enabled ? 'Failed to enable Auto Gap Fill' : 'Failed to disable Auto Gap Fill',
      });
    }
  };

  return (
    <EuiErrorBoundary>
      <EuiPanel hasBorder>
        {/* Header */}
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="m"
          data-test-subj="rule-with-gaps_overview-panel"
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>{'Rule Execution and Gap Summary'}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              {scheduler && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    onClick={() => setIsFlyoutOpen(true)}
                    data-test-subj="view-scheduler-logs-link"
                  >
                    <EuiIcon type="list" size="s" style={{ marginRight: '4px' }} />
                    {'View scheduler logs'}
                  </EuiLink>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label="Auto gap fill"
                  checked={autoFillEnabled}
                  onChange={(e) => handleAutoFillToggle(e.target.checked)}
                  disabled={
                    isSchedulerLoading || createMutation.isLoading || updateMutation.isLoading
                  }
                  showLabel={true}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {/* Main Content - Two Column Layout */}
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <ExecutionSummaryPanel />
          </EuiFlexItem>
          <EuiFlexItem>
            <GapSummaryPanel />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {/* Scheduler Logs Flyout */}
      {isFlyoutOpen && (
        <AutoFillSchedulerFlyoutTrigger
          isOpen={isFlyoutOpen}
          onClose={() => setIsFlyoutOpen(false)}
        />
      )}
    </EuiErrorBoundary>
  );
};
