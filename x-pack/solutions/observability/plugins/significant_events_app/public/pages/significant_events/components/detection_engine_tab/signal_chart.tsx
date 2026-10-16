/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  Axis,
  Chart,
  LineAnnotation,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
  type PartialTheme,
} from '@elastic/charts';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  DetectionStrategyId,
  SeriesSample,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { formatValue } from './format';

const MINUTE_MS = 60_000;
const CHART_HEIGHT_PX = 120;
/**
 * These strategies store a minute only when something matched, or as a zero while the series
 * is recently active, so a missing minute between two samples means zero, not "not measured".
 */
const SPARSE_STRATEGIES: readonly DetectionStrategyId[] = ['ki_rules', 'new_log_patterns'];

/** Samples as chart points, with the zero minutes of sparse series filled in. */
function toPoints({
  samples,
  strategy,
  from,
}: {
  samples: SeriesSample[];
  strategy: DetectionStrategyId;
  from: number;
}): Array<{ x: number; y: number }> {
  const measured = new Map(
    samples.map((sample) => [Date.parse(sample.bucket_start), sample.value])
  );
  if (!SPARSE_STRATEGIES.includes(strategy) || samples.length === 0) {
    return [...measured.entries()].map(([x, y]) => ({ x, y }));
  }
  // Up to the last measured minute only: later minutes may simply not be evaluated yet.
  const last = Math.max(...measured.keys());
  const start = Math.ceil(from / MINUTE_MS) * MINUTE_MS;
  return Array.from({ length: Math.floor((last - start) / MINUTE_MS) + 1 }, (_, index) => {
    const x = start + index * MINUTE_MS;
    return { x, y: measured.get(x) ?? 0 };
  });
}

interface ISignalChartProps {
  id: string;
  strategy: DetectionStrategyId;
  samples: SeriesSample[];
  unit: string;
  threshold?: number;
  from: string;
  to: string;
  /** The latest time the event was open; `to` is missing while it still is. */
  openFrom: string;
  openTo?: string;
}

/** One signal's measured value per minute against its normal, with the open period shaded. */
export function SignalChart({
  id,
  strategy,
  samples,
  unit,
  threshold,
  from,
  to,
  openFrom,
  openTo,
}: ISignalChartProps) {
  const { euiTheme } = useEuiTheme();
  const charts = useKibana().dependencies.start.charts;
  const baseTheme = charts.theme.useChartsBaseTheme();
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  const points = toPoints({ samples, strategy, from: fromMs });
  const xFormatter = niceTimeFormatter([fromMs, toMs]);
  const yFormatter = (value: number) => formatValue(value, unit);

  if (points.length === 0) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="detectionEngineSignalChartEmpty">
        {i18n.translate('xpack.significantEventsApp.detectionEngine.chart.empty', {
          defaultMessage: 'No measured minutes around this event yet.',
        })}
      </EuiText>
    );
  }

  const theme: PartialTheme = {
    chartMargins: { left: 0, right: 0, top: 4, bottom: 0 },
    lineSeriesStyle: { point: { radius: 2, visible: 'always' } },
    background: { color: 'rgba(0,0,0,0)' },
  };

  return (
    <div data-test-subj="detectionEngineSignalChart">
      <Chart size={{ width: '100%', height: CHART_HEIGHT_PX }}>
        <Tooltip headerFormatter={(data) => xFormatter(data.value)} />
        <Settings
          theme={[theme, baseTheme]}
          baseTheme={charts.theme.chartsDefaultBaseTheme}
          showLegend={false}
          locale={i18n.getLocale()}
          xDomain={{ min: fromMs, max: toMs }}
        />
        <Axis id={`${id}-x`} position={Position.Bottom} tickFormat={xFormatter} />
        <Axis
          id={`${id}-y`}
          position={Position.Left}
          tickFormat={yFormatter}
          ticks={3}
          domain={{ min: 0, max: NaN }}
        />
        <RectAnnotation
          id={`${id}-open`}
          dataValues={[
            {
              coordinates: { x0: Date.parse(openFrom), x1: openTo ? Date.parse(openTo) : toMs },
              details: i18n.translate('xpack.significantEventsApp.detectionEngine.chart.open', {
                defaultMessage: 'Event open',
              }),
            },
          ]}
          style={{ fill: euiTheme.colors.backgroundLightDanger, opacity: 0.6 }}
        />
        {threshold !== undefined && (
          <LineAnnotation
            id={`${id}-normal`}
            domainType={AnnotationDomainType.YDomain}
            dataValues={[
              {
                dataValue: threshold,
                details: i18n.translate(
                  'xpack.significantEventsApp.detectionEngine.chart.normalUpTo',
                  {
                    defaultMessage: 'Normal up to {value}',
                    values: { value: formatValue(threshold, unit) },
                  }
                ),
              },
            ]}
            style={{
              line: { stroke: euiTheme.colors.success, strokeWidth: 1, dash: [4, 4], opacity: 1 },
            }}
          />
        )}
        <LineSeries
          id={`${id}-value`}
          name={i18n.translate('xpack.significantEventsApp.detectionEngine.chart.measured', {
            defaultMessage: 'Measured',
          })}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={points}
          color={euiTheme.colors.vis.euiColorVis0}
          tickFormat={yFormatter}
        />
      </Chart>
    </div>
  );
}
