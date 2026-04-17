/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
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
import { ChartLabel } from '../../../../overview/components/detection_response/alerts_by_status/chart_label';
import {
  useGetSpaceHealth,
  useInvalidateGetSpaceHealthQuery,
} from '../../api/hooks/use_get_space_health';
import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { DONUT_HEIGHT } from './constants';
import * as i18n from './translations';

interface StatusRow {
  status: string;
  count: number;
  color: string;
}

interface LastResponseSummaryChartProps {
  enabled?: boolean;
}

export const LastResponseSummaryChart: React.FC<LastResponseSummaryChartProps> = ({
  enabled = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const { data: spaceHealth, isLoading, isError } = useGetSpaceHealth({}, { enabled });

  const {
    state: { lastUpdated: rulesTableLastUpdatedAt },
  } = useRulesTableContext();
  const invalidateSpaceHealthQuery = useInvalidateGetSpaceHealthQuery();

  useEffect(() => {
    invalidateSpaceHealthQuery();
  }, [rulesTableLastUpdatedAt, invalidateSpaceHealthQuery]);

  const { chartData, tableData, total, fillColor } = useMemo(() => {
    if (!spaceHealth?.health?.state_at_the_moment?.number_of_rules) {
      return {
        chartData: null,
        tableData: [],
        total: 0,
        fillColor: () => euiTheme.colors.borderBasePlain,
      };
    }

    const { by_outcome: byOutcome, all } = spaceHealth.health.state_at_the_moment.number_of_rules;

    const succeeded = byOutcome?.succeeded?.total ?? 0;
    const warning = byOutcome?.warning?.total ?? 0;
    const failed = byOutcome?.failed?.total ?? 0;
    const noResponse = all.total - succeeded - warning - failed;

    const colors = {
      succeeded: euiTheme.colors.success,
      warning: euiTheme.colors.warning,
      failed: euiTheme.colors.danger,
      noResponse: euiTheme.colors.borderBasePlain,
    };

    const data: StatusRow[] = [
      { status: i18n.LAST_RESPONSE_SUCCEEDED, count: succeeded, color: colors.succeeded },
      { status: i18n.LAST_RESPONSE_WARNING, count: warning, color: colors.warning },
      { status: i18n.LAST_RESPONSE_FAILED, count: failed, color: colors.failed },
      { status: i18n.LAST_RESPONSE_NO_RESPONSE, count: noResponse, color: colors.noResponse },
    ];

    const donutData = data.map((item) => ({
      key: item.status,
      value: item.count,
      label: item.status,
    }));

    const colorMap: Record<string, string> = {
      [i18n.LAST_RESPONSE_SUCCEEDED]: colors.succeeded,
      [i18n.LAST_RESPONSE_WARNING]: colors.warning,
      [i18n.LAST_RESPONSE_FAILED]: colors.failed,
      [i18n.LAST_RESPONSE_NO_RESPONSE]: colors.noResponse,
    };

    return {
      chartData: donutData,
      tableData: data,
      total: all.total,
      fillColor: (key: string) => colorMap[key] ?? euiTheme.colors.lightShade,
    };
  }, [spaceHealth, euiTheme]);

  const columns: Array<EuiBasicTableColumn<StatusRow>> = useMemo(
    () => [
      {
        field: 'status',
        name: i18n.TABLE_COLUMN_STATUS,
        render: (status: string, item: StatusRow) => (
          <EuiHealth color={item.color}>{status}</EuiHealth>
        ),
      },
      {
        field: 'count',
        name: i18n.TABLE_COLUMN_RULES,
        align: 'right',
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <EuiPanel hasBorder data-test-subj="last-response-summary-chart">
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
      <EuiPanel hasBorder data-test-subj="last-response-summary-chart">
        <EuiText size="s">
          <strong>{i18n.LAST_RESPONSE_SUMMARY_TITLE}</strong>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut
          title={i18n.ERROR_LOADING_DATA}
          color="danger"
          iconType="error"
          data-test-subj="last-response-summary-error"
        >
          <p>{i18n.ERROR_LAST_RESPONSE_SUMMARY}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder data-test-subj="last-response-summary-chart">
      <EuiText size="s">
        <strong>{i18n.LAST_RESPONSE_SUMMARY_TITLE}</strong>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="flexStart" gutterSize="xl" wrap>
        <EuiFlexItem grow={1}>
          <DonutChart
            data={chartData}
            fillColor={fillColor}
            height={DONUT_HEIGHT}
            label={i18n.LAST_RESPONSE_SUMMARY_LABEL}
            title={<ChartLabel count={total} />}
            totalCount={total}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiBasicTable
            items={tableData}
            columns={columns}
            tableLayout="auto"
            data-test-subj="last-response-summary-table"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
