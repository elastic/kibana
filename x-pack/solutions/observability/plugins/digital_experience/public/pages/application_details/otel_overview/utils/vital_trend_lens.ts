/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes, XYConfigESQL } from '@kbn/lens-embeddable-utils';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import { CORE_WEB_VITAL, CORE_WEB_VITAL_THRESHOLDS } from '../../../../../common/core_web_vitals';
import type { CoreWebVital } from '../../../../../common/core_web_vitals';
import { VITAL_TREND_COLUMNS } from '../../../../../common/vitals_trend_esql';

/** The colors of the chart: its line, and the bands of good and poor values. */
export interface VitalTrendColors {
  line: string;
  good: string;
  poor: string;
}

/** The columns of the thresholds' row: the most a good value is, the least a poor one is. */
const THRESHOLD_COLUMNS = { good: 'good', poor: 'poor' } as const;

/**
 * A line of the vital's p75 per bucket, over a band under the "good" threshold and one over the
 * "poor" one, so the line shows which rating each bucket falls in.
 */
export const vitalTrendConfig = ({
  vital,
  title,
  query,
  colors,
}: {
  vital: CoreWebVital;
  /** The chart's title, e.g. "LCP (p75)", which Inspect and Open in Discover show too. */
  title: string;
  query: string;
  colors: VitalTrendColors;
}): XYConfigESQL => {
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  // CLS is a score, the other vitals durations in milliseconds.
  const format =
    vital === CORE_WEB_VITAL.cls
      ? ({ type: 'number', decimals: 3, compact: false } as const)
      : ({ type: 'duration', from: 'ms', to: 'auto', decimals: 1, compact: true } as const);
  return {
    type: 'xy',
    title,
    // The panel names the vital and the time range speaks for itself.
    axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
    layers: [
      {
        type: 'line',
        data_source: { type: 'esql', query },
        ignore_global_filters: false,
        sampling: 1,
        x: { column: VITAL_TREND_COLUMNS.time },
        y: [
          {
            column: VITAL_TREND_COLUMNS.p75,
            label: title,
            format,
            color: { type: 'static', color: colors.line },
          },
        ],
      },
      {
        // The thresholds as ES|QL columns too, so the chart has one data source and one scale:
        // static values would need a data view, which Lens draws on a scale of its own.
        type: 'reference_lines',
        data_source: {
          type: 'esql',
          query: `ROW ${THRESHOLD_COLUMNS.good} = ${good}, ${THRESHOLD_COLUMNS.poor} = ${needsImprovement}`,
        },
        ignore_global_filters: true,
        sampling: 1,
        thresholds: [
          {
            column: THRESHOLD_COLUMNS.good,
            format,
            fill: 'below',
            color: { type: 'static', color: colors.good },
          },
          {
            column: THRESHOLD_COLUMNS.poor,
            format,
            fill: 'above',
            color: { type: 'static', color: colors.poor },
          },
        ],
      },
    ],
  };
};

/** The chart's Lens attributes, for Lens's embeddable. */
export const vitalTrendAttributes = (config: XYConfigESQL): LensAttributes =>
  new LensConfigBuilder().fromAPIFormat(config);
