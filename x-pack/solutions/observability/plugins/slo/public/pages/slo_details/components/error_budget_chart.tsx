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
import { getSloChartState, isSloFailed } from '../utils/is_slo_failed';
import { toDuration, toMinutes } from '../../../utils/slo/duration';
import type { TimeBounds } from '../types';
import { WideChart } from './wide_chart';

function formatTime(minutes: number) {
  if (minutes > 59) {
    const mins = minutes % 60;
    const hours = (minutes - mins) / 60;
    return i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.minuteHoursLabel', {
      defaultMessage: '{hours}h {mins}m',
      values: { hours: Math.trunc(hours), mins: Math.trunc(mins) },
    });
  }
  return i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.minuteLabel', {
    defaultMessage: '{minutes}m',
    values: { minutes },
  });
}

export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function ErrorBudgetChart({ data, isLoading, slo, onBrushed }: Props) {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloFailedStatus = isSloFailed(slo.summary.status);
  const lastErrorBudgetRemaining = data.at(-1)?.value;

  const errorBudgetTimeRemainingFormatted = (() => {
    if (
      slo.budgetingMethod === 'timeslices' &&
      slo.timeWindow.type === 'calendarAligned' &&
      lastErrorBudgetRemaining !== undefined
    ) {
      const totalSlices =
        toMinutes(toDuration(slo.timeWindow.duration)) /
        toMinutes(toDuration(slo.objective.timesliceWindow!));
      const errorBudgetRemainingInMinute =
        lastErrorBudgetRemaining * (slo.summary.errorBudget.initial * totalSlices);

      return formatTime(errorBudgetRemainingInMinute >= 0 ? errorBudgetRemainingInMinute : 0);
    }
    return undefined;
  })();

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="l" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleColor={isSloFailedStatus ? 'danger' : 'success'}
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
              titleColor={isSloFailedStatus ? 'danger' : 'success'}
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
