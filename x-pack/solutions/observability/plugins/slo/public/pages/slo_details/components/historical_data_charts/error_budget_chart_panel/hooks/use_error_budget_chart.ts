/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import { toDuration, toMinutes } from '../../../../../../utils/slo/duration';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { isSloFailed } from '../../../../utils/is_slo_failed';
import type { ChartData } from '../../../../../../typings/slo';

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

interface Input {
  data: ChartData[];
  slo: SLOWithSummaryResponse;
}

export function useErrorBudgetChart({ data, slo }: Input) {
  const { uiSettings, executionContext } = useKibana().services;

  const executionContextName = executionContext.get().name;
  const isDashboardContext = executionContextName === 'dashboards';

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

  return {
    isSloFailed: isSloFailedStatus,
    lastErrorBudgetRemaining,
    errorBudgetTimeRemainingFormatted,
    percentFormat,
    isDashboardContext,
  };
}
