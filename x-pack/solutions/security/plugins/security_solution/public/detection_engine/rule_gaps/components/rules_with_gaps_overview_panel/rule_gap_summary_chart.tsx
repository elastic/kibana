/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import moment from 'moment';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiBasicTable,
  EuiHealth,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import {
  useGetRuleIdsWithGaps,
  useInvalidateGetRuleIdsWithGapsQuery,
} from '../../api/hooks/use_get_rule_ids_with_gaps';
import { defaultRangeValue } from '../../constants';
import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { DONUT_HEIGHT } from './constants';
import * as i18n from './translations';

const formatDuration = (ms: number): string => {
  if (ms === 0) return '0';
  return moment.duration(ms, 'ms').humanize();
};

interface GapStatusRow {
  status: string;
  rulesCount: number;
  duration: string;
  durationMs: number;
  color: string;
}

interface RuleGapSummaryChartProps {
  enabled?: boolean;
}

export const RuleGapSummaryChart: React.FC<RuleGapSummaryChartProps> = ({ enabled = true }) => {
  const { euiTheme } = useEuiTheme();

  const {
    data: gapsData,
    isLoading,
    isError,
  } = useGetRuleIdsWithGaps(
    {
      gapRange: defaultRangeValue,
      gapFillStatuses: [],
    },
    { enabled }
  );

  const {
    state: { lastUpdated: rulesTableLastUpdatedAt },
  } = useRulesTableContext();
  const invalidateGapsQuery = useInvalidateGetRuleIdsWithGapsQuery();

  useEffect(() => {
    invalidateGapsQuery();
  }, [rulesTableLastUpdatedAt, invalidateGapsQuery]);

  const { chartData, tableData, totalDurationLabel, totalDurationMs, fillColor } = useMemo(() => {
    if (!gapsData?.summary) {
      return {
        chartData: null,
        tableData: [],
        totalDurationLabel: '0m',
        totalDurationMs: 0,
        fillColor: () => euiTheme.colors.borderBasePlain,
      };
    }

    const { summary } = gapsData;

    const colors = {
      filled: euiTheme.colors.success,
      inProgress: euiTheme.colors.warning,
      unfilled: euiTheme.colors.danger,
    };

    const data: GapStatusRow[] = [
      {
        status: i18n.GAP_STATUS_FILLED,
        rulesCount: summary.rules_by_gap_fill_status.filled,
        durationMs: summary.total_filled_duration_ms,
        duration: formatDuration(summary.total_filled_duration_ms),
        color: colors.filled,
      },
      {
        status: i18n.GAP_STATUS_IN_PROGRESS,
        rulesCount: summary.rules_by_gap_fill_status.in_progress,
        durationMs: summary.total_in_progress_duration_ms,
        duration: formatDuration(summary.total_in_progress_duration_ms),
        color: colors.inProgress,
      },
      {
        status: i18n.GAP_STATUS_UNFILLED,
        rulesCount: summary.rules_by_gap_fill_status.unfilled,
        durationMs: summary.total_unfilled_duration_ms,
        duration: formatDuration(summary.total_unfilled_duration_ms),
        color: colors.unfilled,
      },
    ];

    const donutData = data.map((item) => ({
      key: item.status,
      value: item.durationMs,
      label: item.status,
    }));

    const colorMap: Record<string, string> = {
      [i18n.GAP_STATUS_FILLED]: colors.filled,
      [i18n.GAP_STATUS_IN_PROGRESS]: colors.inProgress,
      [i18n.GAP_STATUS_UNFILLED]: colors.unfilled,
    };

    const total = summary.total_duration_ms;

    return {
      chartData: donutData,
      tableData: data,
      totalDurationLabel: formatDuration(total),
      totalDurationMs: total,
      fillColor: (key: string) => colorMap[key] ?? euiTheme.colors.lightShade,
    };
  }, [gapsData, euiTheme]);

  const columns: Array<EuiBasicTableColumn<GapStatusRow>> = useMemo(
    () => [
      {
        field: 'status',
        name: i18n.TABLE_COLUMN_STATUS,
        render: (status: string, item: GapStatusRow) => (
          <EuiHealth color={item.color}>{status}</EuiHealth>
        ),
      },
      {
        field: 'rulesCount',
        name: i18n.TABLE_COLUMN_RULES,
        align: 'right',
      },
      {
        field: 'duration',
        name: i18n.TABLE_COLUMN_DURATION,
        align: 'right',
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <EuiPanel hasBorder data-test-subj="rule-gap-summary-chart">
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (isError) {
    return (
      <EuiPanel hasBorder data-test-subj="rule-gap-summary-chart">
        <EuiText size="s">
          <strong>{i18n.RULE_GAP_SUMMARY_TITLE}</strong>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut
          announceOnMount
          title={i18n.ERROR_LOADING_DATA}
          color="danger"
          iconType="error"
          data-test-subj="rule-gap-summary-error"
        >
          <p>{i18n.ERROR_RULE_GAP_SUMMARY}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder data-test-subj="rule-gap-summary-chart">
      <EuiText size="s">
        <strong>{i18n.RULE_GAP_SUMMARY_TITLE}</strong>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="flexStart" gutterSize="xl" wrap>
        <EuiFlexItem grow={1}>
          <DonutChart
            data={chartData}
            fillColor={fillColor}
            height={DONUT_HEIGHT}
            label={i18n.RULE_GAP_SUMMARY_LABEL}
            title={<strong>{totalDurationLabel}</strong>}
            totalCount={totalDurationMs}
            valueFormatter={formatDuration}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiBasicTable
            items={tableData}
            columns={columns}
            tableLayout="auto"
            data-test-subj="rule-gap-summary-table"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
