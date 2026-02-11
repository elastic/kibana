/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ChartData } from '../../../../../typings/slo';
import { getSloChartState } from '../../../utils/is_slo_failed';
import type { TimeBounds } from '../../../types';
import { WideChart } from '../../wide_chart';
import { useErrorBudgetChart } from './hooks/use_error_budget_chart';
import { useSloDetailsContext } from '../../slo_details_context';

export interface Props {
  data: ChartData[];
  isLoading: boolean;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function ErrorBudgetChart({ data, isLoading, onBrushed }: Props) {
  const { slo } = useSloDetailsContext();
  const {
    isSloFailed,
    lastErrorBudgetRemaining,
    errorBudgetTimeRemainingFormatted,
    percentFormat,
  } = useErrorBudgetChart({ data });

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="l" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleColor={isSloFailed ? 'danger' : 'success'}
            title={
              lastErrorBudgetRemaining
                ? numeral(lastErrorBudgetRemaining).format(percentFormat)
                : '-'
            }
            titleSize="s"
            description={i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.remaining', {
              defaultMessage: 'Remaining',
            })}
            reverse
          />
        </EuiFlexItem>
        {errorBudgetTimeRemainingFormatted ? (
          <EuiFlexItem grow={false}>
            <EuiStat
              titleColor={isSloFailed ? 'danger' : 'success'}
              title={errorBudgetTimeRemainingFormatted}
              titleSize="s"
              description={i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.remaining', {
                defaultMessage: 'Remaining',
              })}
              reverse
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiFlexItem>
        <WideChart
          chart="area"
          id={i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.chartTitle', {
            defaultMessage: 'Error budget remaining',
          })}
          state={getSloChartState(slo.summary.status)}
          data={data}
          isLoading={isLoading}
          onBrushed={onBrushed}
          slo={slo}
        />
      </EuiFlexItem>
    </>
  );
}
