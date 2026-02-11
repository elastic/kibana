/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '../../../../../../hooks/use_kibana';
import { isSloFailed } from '../../../../utils/is_slo_failed';
import type { ChartData } from '../../../../../../typings/slo';
import { useSloDetailsContext } from '../../../slo_details_context';

interface Input {
  data: ChartData[];
}

export function useSliChartPanel({ data }: Input) {
  const { slo } = useSloDetailsContext();
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
