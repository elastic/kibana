/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import type { ChartData } from '../../../typings/slo';
import type { TimeBounds } from '../types';
import { BaseChart } from './base_chart';

export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
  hideMetadata?: boolean;
  observedValue?: number;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function SliChart({
  data,
  isLoading,
  slo,
  hideMetadata = false,
  observedValue,
  onBrushed,
}: Props) {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloFailed = slo.summary.status === 'DEGRADING' || slo.summary.status === 'VIOLATED';

  // Use observedValue if provided, otherwise fall back to slo.summary.sliValue
  // If observedValue is undefined, check if we should show NO_DATA
  const displaySliValue = React.useMemo(() => {
    return observedValue !== undefined ? observedValue : slo.summary.sliValue;
  }, [observedValue, slo.summary.sliValue]);

  const hasNoData = React.useMemo(() => {
    if (observedValue !== undefined) {
      return observedValue < 0 || displaySliValue === undefined;
    }
    return slo.summary.status === 'NO_DATA';
  }, [observedValue, slo.summary.status, displaySliValue]);

  const metadata = (
    <EuiFlexGroup direction="row" gutterSize="l" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiStat
          titleColor={isSloFailed ? 'danger' : 'success'}
          title={hasNoData ? '-' : numeral(displaySliValue).format(percentFormat)}
          titleSize="s"
          description={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.current', {
            defaultMessage: 'Observed value',
          })}
          reverse
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiStat
          title={numeral(slo.objective.target).format(percentFormat)}
          titleSize="s"
          description={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.objective', {
            defaultMessage: 'Objective',
          })}
          reverse
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <BaseChart
      data={data}
      isLoading={isLoading}
      slo={slo}
      hideMetadata={hideMetadata}
      onBrushed={onBrushed}
      chartType="line"
      chartId={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.chartTitle', {
        defaultMessage: 'SLI value',
      })}
      metadata={metadata}
    />
  );
}
