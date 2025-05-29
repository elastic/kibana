/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AreaSeries, Axis, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { useAnnotations } from '@kbn/observability-plugin/public';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { max, min } from 'lodash';
import moment from 'moment';
import React, { useRef } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { getBrushTimeBounds } from '../../../../utils/slo/duration';
import { TimeBounds } from '../../types';
import { MetricTimesliceAnnotation } from './metric_timeslice_annotation';
import { GetPreviewDataResponseResults } from './types';

interface Props {
  data: GetPreviewDataResponseResults;
  slo: SLOWithSummaryResponse;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function MetricTimesliceEventsChart({ slo, data, onBrushed }: Props) {
  const { charts, uiSettings } = useKibana().services;
  const chartRef = useRef(null);
  const baseTheme = charts.theme.useChartsBaseTheme();
  const dateFormat = uiSettings.get('dateFormat');
  const handleCursorUpdate = useActiveCursor(charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });
  const { ObservabilityAnnotations, annotations, wrapOnBrushEnd } = useAnnotations({
    slo,
  });

  if (slo.indicator.type !== 'sli.metric.timeslice') {
    return null;
  }

  const values = data.map((row) => row.sliValue);
  const maxValue = max(values);
  const minValue = min(values);
  const threshold = slo.indicator.params.metric.threshold;

  const domain = {
    fit: true,
    min: min([threshold, minValue]) ?? NaN,
    max: max([threshold, maxValue]) ?? NaN,
  };

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
      <MetricTimesliceAnnotation slo={slo} minValue={minValue} maxValue={maxValue} />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={(d) => moment(d).format(dateFormat)}
      />
      <Axis
        id="left"
        position={Position.Left}
        tickFormat={(d) => numeral(d).format('0,0[.00]')}
        domain={domain}
      />
      <AreaSeries
        id="Metric"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="date"
        yAccessors={['value']}
        data={data.map((datum) => ({
          date: new Date(datum.date).getTime(),
          value: datum.sliValue,
        }))}
      />
    </Chart>
  );
}
