/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { isSloFailed } from '../../../../utils/is_slo_failed';
import type { ChartData } from '../../../../../../typings/slo';

interface Input {
  data: ChartData[];
  slo: SLOWithSummaryResponse;
}

export function useSliChartPanel({ data, slo }: Input) {
  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloFailedStatus = isSloFailed(slo.summary.status);
  const observedValue = data.at(-1)?.value;

  const hasNoData = observedValue === undefined || observedValue < 0;

  return {
    isSloFailed: isSloFailedStatus,
    hasNoData,
    observedValue,
    percentFormat,
  };
}
