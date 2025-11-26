/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElementClickListener, XYChartElementEvent } from '@elastic/charts';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { useAnnotations } from '@kbn/observability-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useRef } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { getBrushTimeBounds } from '../../../../utils/slo/duration';
import type { TimeBounds } from '../../types';
import { openInDiscover } from '../../utils/discover_links/get_discover_link';
import type { GetPreviewDataResponseResults } from './types';

export interface Props {
  data: GetPreviewDataResponseResults;
  slo: SLOWithSummaryResponse;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

const DEFAULT_INTERVAL = 10 * 60 * 1_000; // 10 minutes in milliseconds

export function GoodBadEventsChart({ data, slo, onBrushed }: Props) {
  const { charts, uiSettings, discover } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const chartRef = useRef(null);
  const handleCursorUpdate = useActiveCursor(charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });
  const { ObservabilityAnnotations, annotations, wrapOnBrushEnd, onAnnotationClick } =
    useAnnotations({ slo });

  const dateFormat = uiSettings.get('dateFormat');

  const intervalInMilliseconds =
    data && data.length > 2
      ? moment(data[1].date).valueOf() - moment(data[0].date).valueOf()
      : DEFAULT_INTERVAL;

  const goodEventId = i18n.translate('xpack.slo.sloDetails.eventsChartPanel.goodEventsLabel', {
    defaultMessage: 'Good events',
  });

  const badEventId = i18n.translate('xpack.slo.sloDetails.eventsChartPanel.badEventsLabel', {
    defaultMessage: 'Bad events',
  });

  const barClickHandler = (params: XYChartElementEvent[]) => {
    const [datum, eventDetail] = params[0];
    const isGoodEventClicked = eventDetail.specId === goodEventId;
    const isBadEventClicked = eventDetail.specId === badEventId;
    const timeRange = {
      from: moment(datum.x).startOf('minute').toISOString(),
      to: moment(datum.x).add(intervalInMilliseconds, 'ms').startOf('minute').toISOString(),
      mode: 'absolute' as const,
    };
    openInDiscover({
      slo,
      showBad: isBadEventClicked,
      showGood: isGoodEventClicked,
      timeRange,
      discover,
      uiSettings,
    });
  };

  return (
    <Chart size={{ height: 200, width: '100%' }} ref={chartRef}>
      <ObservabilityAnnotations annotations={annotations} />
      <Settings
        theme={{
          chartMargins: { top: 30 },
        }}
        baseTheme={baseTheme}
        showLegend={true}
        legendPosition={Position.Left}
        noResults={
          <EuiIcon
            type="visualizeApp"
            size="l"
            color="subdued"
            title={i18n.translate('xpack.slo.goodBadEventsChart.euiIcon.noResultsLabel', {
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
        onElementClick={barClickHandler as ElementClickListener}
        onBrushEnd={wrapOnBrushEnd((brushArea) => {
          onBrushed?.(getBrushTimeBounds(brushArea));
        })}
        onAnnotationClick={onAnnotationClick}
      />
      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={(d) => moment(d).format(dateFormat)}
      />
      <Axis
        id="left"
        position={Position.Left}
        tickFormat={(d) => numeral(d).format('0')}
        domain={{
          fit: true,
          min: NaN,
          max: NaN,
        }}
      />

      <BarSeries
        id={goodEventId}
        color={euiTheme.colors.success}
        barSeriesStyle={{
          rect: { fill: euiTheme.colors.success },
          displayValue: { fill: euiTheme.colors.success },
        }}
        // Defaults to multi layer time axis as of Elastic Charts v70
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['value']}
        stackAccessors={[0]}
        data={data.map((datum) => ({
          key: new Date(datum.date).getTime(),
          value: datum.events?.good,
        }))}
      />

      <BarSeries
        id={badEventId}
        color={euiTheme.colors.danger}
        barSeriesStyle={{
          rect: { fill: euiTheme.colors.danger },
          displayValue: { fill: euiTheme.colors.danger },
        }}
        // Defaults to multi layer time axis as of Elastic Charts v70
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['value']}
        stackAccessors={[0]}
        data={data.map((datum) => ({
          key: new Date(datum.date).getTime(),
          value: datum.events?.bad,
        }))}
      />
    </Chart>
  );
}
