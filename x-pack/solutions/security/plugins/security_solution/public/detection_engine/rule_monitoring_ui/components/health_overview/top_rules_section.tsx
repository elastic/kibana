/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTabbedContentTab } from '@elastic/eui';
import { EuiSpacer, EuiBasicTable, EuiText, EuiTabbedContent } from '@elastic/eui';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import React, { memo, useMemo } from 'react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { RuleInfoWithPercentiles } from '../../../../../common/api/detection_engine';
import { SectionPanel } from '../section_panel';
import type { HealthData } from './types';
import { CHART_HEIGHT, getRuleTypeName } from './constants';
import * as i18n from './translations';

interface TopRuleRow {
  id: string;
  name: string;
  category: string;
  p50: number;
  p95: number;
  p99: number;
  p999: number;
}

const buildTopRuleRow = (rule: RuleInfoWithPercentiles): TopRuleRow => ({
  id: rule.id,
  name: rule.name,
  category: rule.category,
  p50: rule.percentiles['50.0'] ?? 0,
  p95: rule.percentiles['95.0'] ?? 0,
  p99: rule.percentiles['99.0'] ?? 0,
  p999: rule.percentiles['99.9'] ?? 0,
});

const TOP_RULE_COLUMNS: Array<EuiBasicTableColumn<TopRuleRow>> = [
  { field: 'name', name: i18n.TOP_RULES_RULE_NAME_COLUMN, width: '30%', truncateText: true },
  {
    field: 'category',
    name: i18n.TOP_RULES_RULE_TYPE_COLUMN,
    width: '15%',
    render: (v: string) => getRuleTypeName(v),
  },
  { field: 'p50', name: 'p50', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p95', name: 'p95', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p99', name: 'p99', render: (v: number) => `${Math.round(v)} ms` },
  { field: 'p999', name: 'p99.9', render: (v: number) => `${Math.round(v)} ms` },
];

const TopRulesTabContent = memo(function TopRulesTabContent({
  rules,
  metricName,
}: {
  rules: RuleInfoWithPercentiles[];
  metricName: string;
}) {
  const baseTheme = useElasticChartsTheme();

  const rows = useMemo(() => rules.map(buildTopRuleRow), [rules]);

  const barData = useMemo(
    () => rows.map((row) => ({ rule: row.name, value: Math.round(row.p95) })),
    [rows]
  );

  if (rules.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.TOP_RULES_NO_DATA}
      </EuiText>
    );
  }

  return (
    <>
      <EuiSpacer size="m" />
      <Chart size={{ height: Math.max(CHART_HEIGHT, rules.length * 28) }}>
        <Settings baseTheme={baseTheme} rotation={90} />
        <BarSeries
          id="topRulesBar"
          name={metricName}
          data={barData}
          xAccessor="rule"
          yAccessors={['value']}
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
        />
        <Axis id="left" position={Position.Left} />
        <Axis id="bottom" position={Position.Bottom} tickFormat={(v) => `${Math.round(v)} ms`} />
      </Chart>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={rows}
        columns={TOP_RULE_COLUMNS}
        tableCaption={i18n.TOP_RULES_TABLE_CAPTION}
        compressed
      />
    </>
  );
});

export const TopRulesSection = memo(function TopRulesSection({ health }: { health: HealthData }) {
  const { top_rules: topRules } = health.stats_over_interval;

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'by_execution_duration_ms',
        name: i18n.TOP_RULES_TAB_EXECUTION_DURATION,
        content: (
          <TopRulesTabContent
            rules={topRules.by_execution_duration_ms}
            metricName={i18n.TOP_RULES_TAB_EXECUTION_DURATION}
          />
        ),
      },
      {
        id: 'by_schedule_delay_ms',
        name: i18n.TOP_RULES_TAB_SCHEDULE_DELAY,
        content: (
          <TopRulesTabContent
            rules={topRules.by_schedule_delay_ms}
            metricName={i18n.TOP_RULES_TAB_SCHEDULE_DELAY}
          />
        ),
      },
      {
        id: 'by_search_duration_ms',
        name: i18n.TOP_RULES_TAB_SEARCH_DURATION,
        content: (
          <TopRulesTabContent
            rules={topRules.by_search_duration_ms}
            metricName={i18n.TOP_RULES_TAB_SEARCH_DURATION}
          />
        ),
      },
      {
        id: 'by_indexing_duration_ms',
        name: i18n.TOP_RULES_TAB_INDEXING_DURATION,
        content: (
          <TopRulesTabContent
            rules={topRules.by_indexing_duration_ms}
            metricName={i18n.TOP_RULES_TAB_INDEXING_DURATION}
          />
        ),
      },
      {
        id: 'by_enrichment_duration_ms',
        name: i18n.TOP_RULES_TAB_ENRICHMENT_DURATION,
        content: (
          <TopRulesTabContent
            rules={topRules.by_enrichment_duration_ms}
            metricName={i18n.TOP_RULES_TAB_ENRICHMENT_DURATION}
          />
        ),
      },
    ],
    [topRules]
  );

  return (
    <SectionPanel title={i18n.TOP_RULES_SECTION_TITLE}>
      <EuiTabbedContent tabs={tabs} size="s" />
    </SectionPanel>
  );
});
