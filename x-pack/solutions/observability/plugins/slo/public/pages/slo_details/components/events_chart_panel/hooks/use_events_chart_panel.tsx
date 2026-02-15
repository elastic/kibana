/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingChart } from '@elastic/eui';
import { useGetPreviewData } from '../../../../../hooks/use_get_preview_data';
import { MetricTimesliceEventsChart } from '../metric_timeslice_events_chart';
import { GoodBadEventsChart } from '../good_bad_events_chart';
import type { TimeBounds } from '../../../types';
import { useSloDetailsContext } from '../../slo_details_context';

interface Input {
  range: { from: Date; to: Date };
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function useEventsChartPanel({ range, onBrushed }: Input) {
  const { slo } = useSloDetailsContext();
  const { isLoading, data } = useGetPreviewData({
    range,
    isValid: true,
    indicator: slo.indicator,
    groupings: slo.groupings,
    objective: slo.objective,
    remoteName: slo.remote?.remoteName,
  });

  function getChartTitle() {
    switch (slo.indicator.type) {
      case 'sli.metric.timeslice':
        return i18n.translate('xpack.slo.sloDetails.eventsChartPanel.timesliceTitle', {
          defaultMessage: 'Timeslice metric',
        });
      default:
        return i18n.translate('xpack.slo.sloDetails.eventsChartPanel.title', {
          defaultMessage: 'Good vs bad events',
        });
    }
  }

  function getChart({ showLegend }: { showLegend?: boolean } = { showLegend: true }) {
    if (isLoading) {
      return <EuiLoadingChart size="m" data-test-subj="eventsLoadingChart" />;
    }

    switch (slo.indicator.type) {
      case 'sli.metric.timeslice':
        return (
          <MetricTimesliceEventsChart slo={slo} data={data?.results ?? []} onBrushed={onBrushed} />
        );

      default:
        return (
          <GoodBadEventsChart
            data={data?.results ?? []}
            slo={slo}
            onBrushed={onBrushed}
            showLegend={showLegend}
          />
        );
    }
  }

  return { getChartTitle, getChart };
}
