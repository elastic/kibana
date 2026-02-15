/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSkeletonText,
  EuiSkeletonLoading,
  EuiSkeletonTitle,
  EuiPanel,
  EuiStat,
  EuiBasicTable,
  EuiText,
  EuiEmptyPrompt,
  EuiAccordion,
  EuiCodeBlock,
  useEuiTheme,
} from '@elastic/eui';
import type { PartialTheme } from '@elastic/charts';
import {
  Chart,
  LayoutDirection,
  Metric,
  Partition,
  PartitionLayout,
  BarSeries,
  LineSeries,
  Settings,
  Axis,
  Position,
  ScaleType,
  CurveType,
} from '@elastic/charts';
import React, { memo, useMemo } from 'react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { TechnicalPreviewBadge } from '../../../../common/components/technical_preview_badge';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { useSpaceRulesHealth } from '../../../rule_monitoring/logic/detection_engine_health/use_space_rules_health';
import type { GetSpaceHealthResponse } from '../../../../../common/api/detection_engine';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RULE_TYPE_NAMES: Record<string, string> = {
  'siem.eqlRule': 'EQL',
  'siem.queryRule': 'Query',
  'siem.savedQueryRule': 'Saved Query',
  'siem.thresholdRule': 'Threshold',
  'siem.mlRule': 'Machine Learning',
  'siem.indicatorRule': 'Indicator Match',
  'siem.newTermsRule': 'New Terms',
  'siem.esqlRule': 'ES|QL',
};

const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'trace'] as const;

const CHART_HEIGHT = 220;

type HealthData = GetSpaceHealthResponse['health'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getRuleTypeName = (key: string): string =>
  RULE_TYPE_NAMES[key] ?? key.replace('siem.', '').replace('Rule', '');

/** Safely read a percentile value regardless of key format (p50, 50.0, 50). */
const getP = (percentiles: Record<string, number> | undefined, ...keys: string[]): number => {
  if (!percentiles) return 0;
  for (const key of keys) {
    if (key in percentiles) return percentiles[key];
  }
  return 0;
};

// ---------------------------------------------------------------------------
// Shared UI Pieces
// ---------------------------------------------------------------------------

const SectionPanel = memo<{ title: string; children: React.ReactNode }>(({ title, children }) => (
  <EuiPanel hasShadow={false} hasBorder paddingSize="m">
    <EuiTitle size="xxs">
      <h4>{title}</h4>
    </EuiTitle>
    <EuiSpacer size="s" />
    {children}
  </EuiPanel>
));
SectionPanel.displayName = 'SectionPanel';

/** Re-usable donut chart built on top of Partition (sunburst with a hole). */
const DonutChart = memo<{
  id: string;
  data: Array<{ label: string; value: number }>;
  colors: string[];
  total: number;
  centerLabel?: string;
  emptyTitle?: string;
  emptyBody?: string;
}>(({ id, data, colors, total, centerLabel, emptyTitle, emptyBody }) => {
  const baseTheme = useElasticChartsTheme();

  const donutTheme: PartialTheme = useMemo(
    () => ({
      partition: {
        emptySizeRatio: 0.4,
        linkLabel: { maxCount: 0, fontSize: 0, textColor: 'transparent' },
        minFontSize: 0,
        maxFontSize: 0,
      },
    }),
    []
  );

  if (total === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visArea"
        title={<h4>{emptyTitle ?? 'No data'}</h4>}
        body={<p>{emptyBody ?? 'No data available.'}</p>}
      />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <Chart size={{ height: CHART_HEIGHT }}>
        <Settings baseTheme={baseTheme} theme={donutTheme} showLegend legendPosition="right" />
        <Partition
          id={id}
          data={data}
          layout={PartitionLayout.sunburst}
          valueAccessor={(d) => d.value}
          layers={[
            {
              groupByRollup: (d: { label: string }) => d.label,
              shape: {
                fillColor: (_key: string | number, sortIndex: number) =>
                  colors[sortIndex % colors.length],
              },
            },
          ]}
        />
      </Chart>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '35%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <EuiText size="m">
          <strong>{total}</strong>
        </EuiText>
        {centerLabel && (
          <EuiText size="xs" color="subdued">
            {centerLabel}
          </EuiText>
        )}
      </div>
    </div>
  );
});
DonutChart.displayName = 'DonutChart';

// ---------------------------------------------------------------------------
// 1. Health Overview KPI Cards
// ---------------------------------------------------------------------------

const HealthOverviewCards = memo<{ health: HealthData }>(({ health }) => {
  const { number_of_rules } = health.state_at_the_moment;
  const stats = health.stats_over_interval;

  const totalRules = number_of_rules.all.total;
  const enabledRules = number_of_rules.all.enabled;
  const disabledRules = number_of_rules.all.disabled;
  const enabledPct = totalRules > 0 ? (enabledRules / totalRules) * 100 : 0;
  const totalExec = stats.number_of_executions.total;
  const failures = stats.number_of_executions.by_outcome?.failed ?? 0;
  const gaps = stats.number_of_detected_gaps.total;
  const p95Delay = getP(stats.schedule_delay_ms.percentiles, 'p95', '95.0');

  return (
    <Chart size={['100%', 150]}>
      <Metric
        id="kpi-overview"
        data={[
          [
            {
              color: '#6092C0',
              title: 'Total Rules',
              value: totalRules,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: enabledRules > 0 ? '#00BFB3' : '#E7664C',
              title: 'Enabled Rules',
              value: enabledRules,
              domainMax: totalRules || 1,
              valueFormatter: (v) => `${v}`,
              progressBarDirection: LayoutDirection.Vertical,
            },
            {
              color: '#D6BF57',
              title: 'Disabled Rules',
              value: disabledRules,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: enabledPct >= 50 ? '#00BFB3' : enabledPct > 0 ? '#D6BF57' : '#E7664C',
              title: 'Enabled %',
              value: enabledPct,
              domainMax: 100,
              valueFormatter: (v) => `${v.toFixed(1)}%`,
              progressBarDirection: LayoutDirection.Vertical,
            },
          ],
          [
            {
              color: '#6092C0',
              title: 'Total Executions (24h)',
              value: totalExec,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: failures > 0 ? '#E7664C' : '#00BFB3',
              title: 'Failures (24h)',
              value: failures,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: gaps > 0 ? '#E7664C' : '#00BFB3',
              title: 'Detected Gaps',
              value: gaps,
              valueFormatter: (v) => `${v}`,
            },
            {
              color: p95Delay > 5000 ? '#E7664C' : p95Delay > 1000 ? '#D6BF57' : '#00BFB3',
              title: 'p95 Schedule Delay',
              value: p95Delay,
              valueFormatter: (v) => `${Math.round(v)} ms`,
            },
          ],
        ]}
      />
    </Chart>
  );
});
HealthOverviewCards.displayName = 'HealthOverviewCards';

// ---------------------------------------------------------------------------
// 2C. Rules by Type – Horizontal Bar Chart
// ---------------------------------------------------------------------------

const RulesByTypeBar = memo<{ health: HealthData }>(({ health }) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const { by_type } = health.state_at_the_moment.number_of_rules;

  const data = useMemo(
    () =>
      Object.entries(by_type)
        .map(([key, val]) => ({ type: getRuleTypeName(key), count: val.total }))
        .sort((a, b) => b.count - a.count),
    [by_type]
  );

  if (data.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visBarVertical"
        title={<h4>{'No rule types'}</h4>}
        body={<p>{'No rule type data available.'}</p>}
      />
    );
  }

  return (
    <Chart size={{ height: Math.max(CHART_HEIGHT, data.length * 36 + 40) }}>
      <Settings baseTheme={baseTheme} showLegend={false} rotation={90} />
      <BarSeries
        id="rulesByType"
        name="Rules"
        data={data}
        xAccessor="type"
        yAccessors={['count']}
        xScaleType={ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        color={euiTheme.colors.vis.euiColorVis1}
      />
      <Axis id="left" position={Position.Left} />
      <Axis id="bottom" position={Position.Bottom} />
    </Chart>
  );
});
RulesByTypeBar.displayName = 'RulesByTypeBar';

// ---------------------------------------------------------------------------
// 3B. Logged Messages by Level – Stacked Bar
// ---------------------------------------------------------------------------

const LoggedMessagesBar = memo<{ health: HealthData }>(({ health }) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const { number_of_logged_messages } = health.stats_over_interval;

  const levelColors = useMemo(
    () => [
      euiTheme.colors.vis.euiColorVis9, // error – red
      euiTheme.colors.vis.euiColorVis5, // warn  – orange
      euiTheme.colors.vis.euiColorVis0, // info  – green
      euiTheme.colors.vis.euiColorVis1, // debug – blue
      euiTheme.colors.vis.euiColorVis3, // trace – teal
    ],
    [euiTheme]
  );

  const data = useMemo(
    () =>
      LOG_LEVELS.map((level) => ({
        category: 'Log Messages',
        level: level.charAt(0).toUpperCase() + level.slice(1),
        count: number_of_logged_messages.by_level?.[level] ?? 0,
      })),
    [number_of_logged_messages.by_level]
  );

  if (number_of_logged_messages.total === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visBarVertical"
        title={<h4>{'No logged messages'}</h4>}
        body={<p>{'No logged messages in the selected interval.'}</p>}
      />
    );
  }

  return (
    <Chart size={{ height: CHART_HEIGHT }}>
      <Settings baseTheme={baseTheme} showLegend legendPosition="right" rotation={90} />
      <BarSeries
        id="loggedMessages"
        data={data}
        xAccessor="category"
        yAccessors={['count']}
        splitSeriesAccessors={['level']}
        stackAccessors={['category']}
        xScaleType={ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        color={levelColors}
      />
      <Axis id="bottom" position={Position.Bottom} />
    </Chart>
  );
});
LoggedMessagesBar.displayName = 'LoggedMessagesBar';

// ---------------------------------------------------------------------------
// 4. Performance Percentiles – Grouped Bar + Table
// ---------------------------------------------------------------------------

interface PerformanceRow {
  metric: string;
  p50: number;
  p95: number;
  p99: number;
  p999: number;
}

const buildPerfRow = (
  label: string,
  agg: { percentiles: Record<string, number> } | undefined
): PerformanceRow => ({
  metric: label,
  p50: getP(agg?.percentiles, 'p50', '50.0', '50'),
  p95: getP(agg?.percentiles, 'p95', '95.0', '95'),
  p99: getP(agg?.percentiles, 'p99', '99.0', '99'),
  p999: getP(agg?.percentiles, 'p99.9', '99.9'),
});

const PERF_COLUMNS: Array<EuiBasicTableColumn<PerformanceRow>> = [
  { field: 'metric', name: 'Metric', width: '30%' },
  { field: 'p50', name: 'p50', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p95', name: 'p95', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p99', name: 'p99', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p999', name: 'p99.9', render: (v: number) => `${Math.round(v)} ms` },
];

const PerformanceSection = memo<{ health: HealthData }>(({ health }) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const stats = health.stats_over_interval;

  const rows = useMemo<PerformanceRow[]>(
    () => [
      buildPerfRow('Execution Duration', stats.execution_duration_ms),
      buildPerfRow('Search Duration', stats.search_duration_ms),
      buildPerfRow('Indexing Duration', stats.indexing_duration_ms),
      buildPerfRow('Schedule Delay', stats.schedule_delay_ms),
    ],
    [stats]
  );

  const barData = useMemo(
    () =>
      rows.flatMap((row) => [
        { percentile: 'p50', metric: row.metric, value: row.p50 },
        { percentile: 'p95', metric: row.metric, value: row.p95 },
        { percentile: 'p99', metric: row.metric, value: row.p99 },
        { percentile: 'p99.9', metric: row.metric, value: row.p999 },
      ]),
    [rows]
  );

  const metricColors = useMemo(
    () => [
      euiTheme.colors.vis.euiColorVis0,
      euiTheme.colors.vis.euiColorVis1,
      euiTheme.colors.vis.euiColorVis2,
      euiTheme.colors.vis.euiColorVis3,
    ],
    [euiTheme]
  );

  return (
    <>
      <Chart size={{ height: CHART_HEIGHT }}>
        <Settings baseTheme={baseTheme} showLegend legendPosition="right" />
        <BarSeries
          id="performancePercentiles"
          data={barData}
          xAccessor="percentile"
          yAccessors={['value']}
          splitSeriesAccessors={['metric']}
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          color={metricColors}
        />
        <Axis id="bottom" position={Position.Bottom} />
        <Axis id="left" position={Position.Left} tickFormat={(v) => `${v} ms`} />
      </Chart>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={rows}
        columns={PERF_COLUMNS}
        tableCaption="Performance Percentiles"
        compressed
      />
    </>
  );
});
PerformanceSection.displayName = 'PerformanceSection';

// ---------------------------------------------------------------------------
// 5. Gaps & Frozen Indices – Stat Cards
// ---------------------------------------------------------------------------

const GapsAndFrozenSection = memo<{ health: HealthData }>(({ health }) => {
  const stats = health.stats_over_interval;
  const { total: totalGaps, total_duration_s: gapDuration } = stats.number_of_detected_gaps;
  const frozenCount = stats.frozen_indices_queried_max_count;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiStat
          title={totalGaps}
          description="Total Detected Gaps"
          titleColor={totalGaps > 0 ? 'danger' : 'default'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={`${gapDuration}s`}
          description="Total Gap Duration"
          titleColor={gapDuration > 0 ? 'danger' : 'default'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={frozenCount}
          description="Frozen Indices Queried (Max)"
          titleColor={frozenCount > 0 ? 'accent' : 'default'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
GapsAndFrozenSection.displayName = 'GapsAndFrozenSection';

// ---------------------------------------------------------------------------
// 6. Top Errors & Warnings – Tables
// ---------------------------------------------------------------------------

interface TopMessageItem {
  message: string;
  count: number;
}

const TOP_MSG_COLUMNS: Array<EuiBasicTableColumn<TopMessageItem>> = [
  { field: 'message', name: 'Message', truncateText: true, width: '80%' },
  { field: 'count', name: 'Count', width: '20%', align: 'right' },
];

const TopMessagesSection = memo<{ health: HealthData }>(({ health }) => {
  const { top_errors: topErrors = [], top_warnings: topWarnings = [] } = health.stats_over_interval;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <SectionPanel title="Top Errors">
          {topErrors.length > 0 ? (
            <EuiBasicTable items={topErrors} columns={TOP_MSG_COLUMNS} compressed />
          ) : (
            <EuiText size="s" color="subdued">
              {'No errors recorded.'}
            </EuiText>
          )}
        </SectionPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <SectionPanel title="Top Warnings">
          {topWarnings.length > 0 ? (
            <EuiBasicTable items={topWarnings} columns={TOP_MSG_COLUMNS} compressed />
          ) : (
            <EuiText size="s" color="subdued">
              {'No warnings recorded.'}
            </EuiText>
          )}
        </SectionPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
TopMessagesSection.displayName = 'TopMessagesSection';

// ---------------------------------------------------------------------------
// 7. Historical Trends – Time Series (Line Charts)
// ---------------------------------------------------------------------------

const LINE_STYLE = { point: { visible: 'never' as const } };

const HistoricalTrendsSection = memo<{ health: HealthData }>(({ health }) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();
  const { buckets } = health.history_over_interval;

  const executionData = useMemo(
    () =>
      buckets.map((b) => ({
        x: new Date(b.timestamp).getTime(),
        total: b.stats.number_of_executions.total,
        failed: b.stats.number_of_executions.by_outcome?.failed ?? 0,
      })),
    [buckets]
  );

  const delayData = useMemo(
    () =>
      buckets.map((b) => ({
        x: new Date(b.timestamp).getTime(),
        p95: getP(b.stats.schedule_delay_ms.percentiles, 'p95', '95.0'),
      })),
    [buckets]
  );

  const gapData = useMemo(
    () =>
      buckets.map((b) => ({
        x: new Date(b.timestamp).getTime(),
        gaps: b.stats.number_of_detected_gaps.total,
      })),
    [buckets]
  );

  if (buckets.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visLine"
        title={<h4>{'No historical data'}</h4>}
        body={<p>{'Historical buckets are not available for the selected interval.'}</p>}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Executions over time */}
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{'Executions Over Time'}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend legendPosition="right" />
          <LineSeries
            id="total-executions"
            name="Total"
            data={executionData}
            xAccessor="x"
            yAccessors={['total']}
            xScaleType={ScaleType.Time}
            curve={CurveType.CURVE_MONOTONE_X}
            color={euiTheme.colors.vis.euiColorVis1}
            lineSeriesStyle={LINE_STYLE}
          />
          <LineSeries
            id="failed-executions"
            name="Failed"
            data={executionData}
            xAccessor="x"
            yAccessors={['failed']}
            xScaleType={ScaleType.Time}
            curve={CurveType.CURVE_MONOTONE_X}
            color={euiTheme.colors.vis.euiColorVis9}
            lineSeriesStyle={LINE_STYLE}
          />
          <Axis id="bottom" position={Position.Bottom} />
          <Axis id="left" position={Position.Left} />
        </Chart>
      </EuiFlexItem>

      {/* Schedule delay over time */}
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{'p95 Schedule Delay Over Time'}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend={false} />
          <LineSeries
            id="p95-delay"
            name="p95 Delay (ms)"
            data={delayData}
            xAccessor="x"
            yAccessors={['p95']}
            xScaleType={ScaleType.Time}
            curve={CurveType.CURVE_MONOTONE_X}
            color={euiTheme.colors.vis.euiColorVis5}
            lineSeriesStyle={LINE_STYLE}
          />
          <Axis id="bottom" position={Position.Bottom} />
          <Axis id="left" position={Position.Left} tickFormat={(v) => `${v} ms`} />
        </Chart>
      </EuiFlexItem>

      {/* Gaps over time */}
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>{'Detected Gaps Over Time'}</h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <Chart size={{ height: 180 }}>
          <Settings baseTheme={baseTheme} showLegend={false} />
          <LineSeries
            id="gaps-over-time"
            name="Gaps"
            data={gapData}
            xAccessor="x"
            yAccessors={['gaps']}
            xScaleType={ScaleType.Time}
            curve={CurveType.CURVE_MONOTONE_X}
            color={euiTheme.colors.vis.euiColorVis9}
            lineSeriesStyle={LINE_STYLE}
          />
          <Axis id="bottom" position={Position.Bottom} />
          <Axis id="left" position={Position.Left} />
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
HistoricalTrendsSection.displayName = 'HistoricalTrendsSection';

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export const DetectionEngineSpaceRulesHealthPage = memo(
  function DetectionEngineSpaceRulesHealthPage(): JSX.Element {
    const spaceRulesHealth = useSpaceRulesHealth({});
    const isLoading = spaceRulesHealth.isLoading || spaceRulesHealth.isFetching;
    const { euiTheme } = useEuiTheme();

    const skeleton = useMemo(
      () => (
        <>
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={2} />
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={4} />
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={3} />
          <EuiSpacer size="m" />
          <EuiSkeletonLoading
            isLoading
            loadingContent={
              <>
                <EuiSkeletonTitle />
                <EuiSkeletonText />
              </>
            }
            loadedContent={null}
          />
        </>
      ),
      []
    );

    const dashboard = useMemo(() => {
      if (!spaceRulesHealth.data) return null;

      const { health } = spaceRulesHealth.data;
      const numOfRules = health.state_at_the_moment.number_of_rules;
      const exec = health.stats_over_interval.number_of_executions;
      const succeeded = exec.by_outcome?.succeeded ?? 0;
      const warning = exec.by_outcome?.warning ?? 0;
      const failed = exec.by_outcome?.failed ?? 0;
      const failRate = exec.total > 0 ? ((failed / exec.total) * 100).toFixed(1) : '0';

      return (
        <>
          {/* ── 1. Health Overview KPI Cards ───────────────────────── */}
          <HealthOverviewCards health={health} />

          <EuiSpacer size="l" />

          {/* ── 2. Rule Inventory ──────────────────────────────────── */}
          <EuiFlexGroup>
            <EuiFlexItem>
              <SectionPanel title="Rules by Status">
                <DonutChart
                  id="rulesByStatus"
                  data={[
                    { label: 'Enabled', value: numOfRules.all.enabled },
                    { label: 'Disabled', value: numOfRules.all.disabled },
                  ]}
                  colors={[euiTheme.colors.vis.euiColorVis0, euiTheme.colors.vis.euiColorVis5]}
                  total={numOfRules.all.total}
                  centerLabel="Total"
                  emptyTitle="No rules"
                  emptyBody="No detection rules found."
                />
              </SectionPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <SectionPanel title="Rules by Origin">
                <DonutChart
                  id="rulesByOrigin"
                  data={[
                    {
                      label: 'Prebuilt',
                      value: numOfRules.by_origin.prebuilt?.total ?? 0,
                    },
                    {
                      label: 'Custom',
                      value: numOfRules.by_origin.custom?.total ?? 0,
                    },
                  ]}
                  colors={[euiTheme.colors.vis.euiColorVis1, euiTheme.colors.vis.euiColorVis2]}
                  total={numOfRules.all.total}
                  centerLabel="Total"
                  emptyTitle="No rules"
                  emptyBody="No detection rules found."
                />
              </SectionPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <SectionPanel title="Rules by Type">
            <RulesByTypeBar health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          {/* ── 3. Execution Health (24h) ──────────────────────────── */}
          <EuiFlexGroup>
            <EuiFlexItem>
              <SectionPanel title="Execution Outcomes (24h)">
                <DonutChart
                  id="executionOutcomes"
                  data={[
                    { label: 'Succeeded', value: succeeded },
                    { label: 'Warning', value: warning },
                    { label: 'Failed', value: failed },
                  ]}
                  colors={[
                    euiTheme.colors.vis.euiColorVis0,
                    euiTheme.colors.vis.euiColorVis5,
                    euiTheme.colors.vis.euiColorVis9,
                  ]}
                  total={exec.total}
                  centerLabel={`Fail: ${failRate}%`}
                  emptyTitle="No executions"
                  emptyBody="No executions recorded in the selected interval."
                />
              </SectionPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <SectionPanel title="Logged Messages by Level">
                <LoggedMessagesBar health={health} />
              </SectionPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          {/* ── 4. Performance Percentiles ─────────────────────────── */}
          <SectionPanel title="Performance Percentiles">
            <PerformanceSection health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          {/* ── 5. Gaps & Frozen Indices ───────────────────────────── */}
          <SectionPanel title="Gaps & Frozen Indices">
            <GapsAndFrozenSection health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          {/* ── 6. Top Errors & Warnings ───────────────────────────── */}
          <TopMessagesSection health={health} />

          <EuiSpacer size="l" />

          {/* ── 7. Historical Trends ───────────────────────────────── */}
          <SectionPanel title="Historical Trends">
            <HistoricalTrendsSection health={health} />
          </SectionPanel>

          <EuiSpacer size="l" />

          {/* ── Raw API Response (debug) ───────────────────────────── */}
          <EuiAccordion id="rawData" buttonContent="Raw API Response" paddingSize="m">
            <EuiCodeBlock language="json" fontSize="m" paddingSize="m">
              {JSON.stringify(spaceRulesHealth.data, null, 2)}
            </EuiCodeBlock>
          </EuiAccordion>
        </>
      );
    }, [spaceRulesHealth.data, euiTheme]);

    return (
      <>
        <SecuritySolutionPageWrapper>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>
                  {'Detection Engine Space Rules Health'} <TechnicalPreviewBadge label="" />
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              {isLoading ? skeleton : dashboard}
            </EuiFlexItem>
          </EuiFlexGroup>
        </SecuritySolutionPageWrapper>

        <SpyRoute pageName={SecurityPageName.spaceRulesHealth} />
      </>
    );
  }
);
