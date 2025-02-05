/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AreaSeries, Axis, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import React, { useRef } from 'react';
import { useAnnotations } from '@kbn/observability-plugin/public';
import { GetPreviewDataResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import moment from 'moment';
import { getBrushTimeBounds } from '../../../utils/slo/duration';
import { TimeBounds } from '../types';
import { useKibana } from '../../../hooks/use_kibana';

export function EventsAreaChart({
  slo,
  data,
  minValue,
  maxValue,
  annotation,
  onBrushed,
}: {
  data?: GetPreviewDataResponse;
  maxValue?: number | null;
  minValue?: number | null;
  slo: SLOWithSummaryResponse;
  annotation?: React.ReactNode;
  onBrushed?: (timeBounds: TimeBounds) => void;
}) {
  const { charts, uiSettings } = useKibana().services;
  const baseTheme = charts.theme.useChartsBaseTheme();
  const dateFormat = uiSettings.get('dateFormat');
  const chartRef = useRef(null);
  const yAxisNumberFormat = slo.indicator.type === 'sli.metric.timeslice' ? '0,0[.00]' : '0,0';

  const handleCursorUpdate = useActiveCursor(charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  const threshold =
    slo.indicator.type === 'sli.metric.timeslice'
      ? slo.indicator.params.metric.threshold
      : undefined;

  const domain = {
    fit: true,
    min:
      threshold != null && minValue != null && threshold < minValue ? threshold : minValue || NaN,
    max:
      threshold != null && maxValue != null && threshold > maxValue ? threshold : maxValue || NaN,
  };

  const { ObservabilityAnnotations, annotations, wrapOnBrushEnd } = useAnnotations({
    domain,
    slo,
  });

  return (
    <Chart size={{ height: 150, width: '100%' }} ref={chartRef}>
      <ObservabilityAnnotations annotations={annotations} />
      <Settings
        baseTheme={baseTheme}
        showLegend={slo.indicator.type !== 'sli.metric.timeslice'}
        legendPosition={Position.Left}
        noResults={
          <EuiIcon
            type="visualizeApp"
            size="l"
            color="subdued"
            title={i18n.translate('xpack.slo.eventsChartPanel.euiIcon.noResultsLabel', {
              defaultMessage: 'no results',
            })}
          />
        }
        onPointerUpdate={handleCursorUpdate}
        externalPointerEvents={{
          tooltip: { visible: true },
        }}
        pointerUpdateDebounce={0}
        pointerUpdateTrigger={'x'}
        locale={i18n.getLocale()}
        onBrushEnd={wrapOnBrushEnd((brushArea) => {
          onBrushed?.(getBrushTimeBounds(brushArea));
        })}
      />
      {annotation}

      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={(d) => moment(d).format(dateFormat)}
      />
      <Axis
        id="left"
        position={Position.Left}
        tickFormat={(d) => numeral(d).format(yAxisNumberFormat)}
        domain={domain}
      />
      <AreaSeries
        id="Metric"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="date"
        yAccessors={['value']}
        data={(data ?? []).map((datum) => ({
          date: new Date(datum.date).getTime(),
          value: datum.sliValue,
        }))}
      />
    </Chart>
  );
}
