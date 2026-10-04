/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiInMemoryTable,
  EuiText,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { DonutChart, type FillColor } from '../../../common/components/charts/donutchart';
import { SEVERITY_COLOR } from '../../../common/utils/risk_color_palette';
import type { SeverityDatum } from './use_severity_data';

const DONUT_HEIGHT = 150;

/** v1's SEVERITY_COLOR only covers low/medium/high/critical; v2 adds `info`. */
const colorForSeverity = (severity: string, fallback: string): string =>
  SEVERITY_COLOR[severity.toLowerCase() as keyof typeof SEVERITY_COLOR] ?? fallback;

export interface SeverityLevelChartProps {
  data: SeverityDatum[];
  isLoading: boolean;
}

/**
 * Table + donut of alerts by severity. Reuses the shared `DonutChart`; only the
 * data source (ES|QL over `.rule-events`) differs from the v1 severity chart.
 */
export const SeverityLevelChart = ({ data, isLoading }: SeverityLevelChartProps) => {
  const { euiTheme } = useEuiTheme();

  const total = useMemo(() => data.reduce((sum, datum) => sum + datum.value, 0), [data]);

  const fillColor: FillColor = useMemo(
    () => (name: string) => colorForSeverity(name, euiTheme.colors.textSubdued),
    [euiTheme]
  );

  const columns: Array<EuiBasicTableColumn<SeverityDatum>> = useMemo(
    () => [
      {
        field: 'key',
        name: i18n.translate('xpack.securitySolution.alertsV2.severity.severityColumn', {
          defaultMessage: 'Severity',
        }),
        render: (key: string) => (
          <EuiHealth color={colorForSeverity(key, euiTheme.colors.textSubdued)} textSize="xs">
            {capitalize(key)}
          </EuiHealth>
        ),
      },
      {
        field: 'value',
        name: i18n.translate('xpack.securitySolution.alertsV2.severity.countColumn', {
          defaultMessage: 'Count',
        }),
        dataType: 'number',
        width: '34%',
        render: (value: number) => (
          <EuiText grow={false} size="xs">
            {value}
          </EuiText>
        ),
      },
    ],
    [euiTheme]
  );

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" data-test-subj="alertsV2SeverityChart">
      <EuiFlexItem>
        <EuiInMemoryTable
          columns={columns}
          items={data}
          loading={isLoading}
          data-test-subj="alertsV2SeverityTable"
        />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="alertsV2SeverityDonut">
        <DonutChart
          data={data}
          fillColor={fillColor}
          height={DONUT_HEIGHT}
          label={i18n.translate('xpack.securitySolution.alertsV2.severity.donutLabel', {
            defaultMessage: 'Alerts',
          })}
          title={total}
          totalCount={total}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
