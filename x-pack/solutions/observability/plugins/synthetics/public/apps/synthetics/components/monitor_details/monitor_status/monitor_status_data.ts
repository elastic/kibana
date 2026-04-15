/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import moment from 'moment';
import type { EuiThemeComputed, EuiThemeColorModeStandard } from '@elastic/eui';
import { tint, transparentize, COLOR_MODES_STANDARD } from '@elastic/eui';
import type { BrushEvent } from '@elastic/charts';
import type { MonitorStatusHeatmapBucket } from '../../../../../../common/runtime_types';

export const CHART_CELL_WIDTH = 17;

export interface MonitorStatusTimeBucket {
  start: number;
  end: number;
}

export interface MonitorStatusTimeBin {
  start: number;
  end: number;
  ups: number;
  downs: number;

  /**
   * To color code the time bin on chart
   */
  value: number;
}

export interface MonitorStatusPanelProps {
  /**
   * Either epoch in millis or Kibana date range e.g. 'now-24h'
   */
  from: string | number;

  /**
   * Either epoch in millis or Kibana date range e.g. 'now'
   */
  to: string | number;

  brushable: boolean; // Whether to allow brushing on the chart to allow zooming in on data.
  periodCaption?: string; // e.g. Last 24 Hours
  showViewHistoryButton?: boolean;
  onBrushed?: (timeBounds: { from: number; to: number; fromUtc: string; toUtc: string }) => void;
}

export function getColorBands(euiTheme: EuiThemeComputed, colorMode: EuiThemeColorModeStandard) {
  const colorTransitionFn = colorMode === COLOR_MODES_STANDARD.dark ? transparentize : tint;

  const SUCCESS_COLOR = euiTheme.colors.success;
  const DANGER_COLOR = euiTheme.colors.danger;

  return [
    { color: DANGER_COLOR, start: -Infinity, end: -1 },
    { color: DANGER_COLOR, start: -1, end: -0.75 },
    { color: colorTransitionFn(DANGER_COLOR, 0.25), start: -0.75, end: -0.5 },
    { color: colorTransitionFn(DANGER_COLOR, 0.5), start: -0.5, end: -0.25 },
    { color: colorTransitionFn(DANGER_COLOR, 0.75), start: -0.25, end: -0.000000001 },
    {
      color: getSkippedVizColor(euiTheme),
      start: -0.000000001,
      end: 0.000000001,
    },
    { color: colorTransitionFn(SUCCESS_COLOR, 0.5), start: 0.000000001, end: 0.25 },
    { color: colorTransitionFn(SUCCESS_COLOR, 0.35), start: 0.25, end: 0.5 },
    { color: colorTransitionFn(SUCCESS_COLOR, 0.2), start: 0.5, end: 0.8 },
    { color: SUCCESS_COLOR, start: 0.8, end: 1 },
    { color: SUCCESS_COLOR, start: 1, end: Infinity },
  ];
}

export function getSkippedVizColor(euiTheme: EuiThemeComputed) {
  return euiTheme.colors.lightestShade;
}

export function getErrorVizColor(euiTheme: EuiThemeComputed) {
  return euiTheme.colors.textDanger;
}

export function getXAxisLabelFormatter(interval: number) {
  return (value: string | number) => {
    const m = moment(value);
    const [hours, minutes] = [m.hours(), m.minutes()];
    const isFirstBucketOfADay = hours === 0 && minutes <= 36;
    const isIntervalAcrossDays = interval >= 24 * 60;
    return moment(value).format(isFirstBucketOfADay || isIntervalAcrossDays ? 'l' : 'HH:mm');
  };
}

export function createTimeBuckets(intervalMinutes: number, from: number, to: number) {
  const currentMark = getEndTime(intervalMinutes, to);
  const buckets: MonitorStatusTimeBucket[] = [];

  let tick = currentMark;
  let maxIterations = 5000;
  while (tick >= from && maxIterations > 0) {
    const start = tick - Math.floor(intervalMinutes * 60 * 1000);
    buckets.unshift({ start, end: tick });
    tick = start;
    --maxIterations;
  }

  return buckets;
}

export function createStatusTimeBins(
  timeBuckets: MonitorStatusTimeBucket[],
  heatmapData?: MonitorStatusHeatmapBucket[]
): MonitorStatusTimeBin[] {
  return timeBuckets.map(({ start, end }) => {
    if (!Array.isArray(heatmapData)) {
      return {
        start,
        end,
        ups: 0,
        downs: 0,
        value: 0,
      };
    }
    const { ups, downs } = heatmapData
      .filter(({ key }) => key >= start && key < end)
      .reduce(
        (acc, cur) => ({
          ups: acc.ups + cur.up.value,
          downs: acc.downs + cur.down.value,
        }),
        { ups: 0, downs: 0 }
      );

    return {
      start,
      end,
      ups,
      downs,
      value: ups + downs === 0 ? 0 : getStatusEffectiveValue(ups, downs),
    };
  });
}

export function indexBinsByEndTime(bins: MonitorStatusTimeBin[]) {
  return bins.reduce((acc, cur) => {
    return acc.set(cur.end, cur);
  }, new Map<number, MonitorStatusTimeBin>());
}

export function dateToMilli(date: string | number | moment.Moment | undefined): number {
  if (typeof date === 'number') {
    return date;
  }

  let d = date;
  if (typeof date === 'string') {
    d = datemath.parse(date, { momentInstance: moment });
  }

  return moment(d).valueOf();
}

export function getBrushData(e: BrushEvent) {
  const [from, to] = [Number(e.x?.[0]), Number(e.x?.[1])];
  const [fromUtc, toUtc] = [moment(from).format(), moment(to).format()];

  return { from, to, fromUtc, toUtc };
}

export function getStatusEffectiveValue(ups: number, downs: number): number {
  if (ups === downs) {
    return -0.1;
  }

  return (ups - downs) / (ups + downs);
}

function getEndTime(intervalMinutes: number, to: number) {
  const intervalUnderHour = Math.floor(intervalMinutes) % 60;

  const upperBoundMinutes =
    Math.ceil(new Date(to).getUTCMinutes() / intervalUnderHour) * intervalUnderHour;

  return moment(to).utc().startOf('hour').add(upperBoundMinutes, 'minute').valueOf();
}
