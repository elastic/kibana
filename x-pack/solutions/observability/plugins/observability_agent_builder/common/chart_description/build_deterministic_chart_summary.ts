/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  BuildDeterministicChartSummaryParams,
  ChartDescriptionPoint,
  ChartDescriptionSeries,
} from './types';

interface NumericPoint {
  x: number;
  y: number;
}

const getNumericPoints = (data: ChartDescriptionPoint[]): NumericPoint[] =>
  data.flatMap((point) =>
    point.y != null && Number.isFinite(point.y) ? [{ x: point.x, y: point.y }] : []
  );

const average = (points: NumericPoint[]): number =>
  points.reduce((sum, point) => sum + point.y, 0) / points.length;

const getPeakPoint = (points: NumericPoint[]): NumericPoint =>
  points.reduce((peak, point) => (point.y > peak.y ? point : peak), points[0]);

const getLowPoint = (points: NumericPoint[]): NumericPoint =>
  points.reduce((low, point) => (point.y < low.y ? point : low), points[0]);

const defaultTimestampFormatter = (timestamp: number): string => new Date(timestamp).toISOString();

const formatValue = ({
  value,
  valueFormatter,
  locale,
}: {
  value: number;
  valueFormatter?: (value: number) => string;
  locale: string;
}): string => valueFormatter?.(value) ?? new Intl.NumberFormat(locale).format(value);

const summarizeSeries = ({
  series,
  timestampFormatter,
  locale,
  valueFormatter,
}: {
  series: ChartDescriptionSeries;
  timestampFormatter: (timestamp: number) => string;
  locale: string;
  valueFormatter?: (value: number) => string;
}): string => {
  const points = getNumericPoints(series.data);

  if (points.length === 0) {
    return i18n.translate('xpack.observabilityAgentBuilder.chartDescription.seriesNoData', {
      defaultMessage: '{seriesTitle} has no data in the selected time range.',
      values: { seriesTitle: series.title },
    });
  }

  const peak = getPeakPoint(points);
  const low = getLowPoint(points);
  const avg = average(points);

  return i18n.translate('xpack.observabilityAgentBuilder.chartDescription.seriesSummary', {
    defaultMessage:
      '{seriesTitle} ranges from {lowValue} at {lowTime} to {peakValue} at {peakTime}, with an average of {averageValue}.',
    values: {
      seriesTitle: series.title,
      lowValue: formatValue({ value: low.y, valueFormatter, locale }),
      lowTime: timestampFormatter(low.x),
      peakValue: formatValue({ value: peak.y, valueFormatter, locale }),
      peakTime: timestampFormatter(peak.x),
      averageValue: formatValue({ value: avg, valueFormatter, locale }),
    },
  });
};

const summarizeComparison = ({
  currentSeries,
  comparisonSeries,
  locale,
  valueFormatter,
}: {
  currentSeries: ChartDescriptionSeries;
  comparisonSeries: ChartDescriptionSeries;
  locale: string;
  valueFormatter?: (value: number) => string;
}): string | undefined => {
  const currentPoints = getNumericPoints(currentSeries.data);
  const comparisonPoints = getNumericPoints(comparisonSeries.data);

  if (currentPoints.length === 0 || comparisonPoints.length === 0) {
    return undefined;
  }

  const currentAverage = average(currentPoints);
  const comparisonAverage = average(comparisonPoints);

  if (comparisonAverage === 0) {
    return undefined;
  }

  const percentChange = ((currentAverage - comparisonAverage) / comparisonAverage) * 100;
  const roundedPercentChange = Math.round(percentChange);

  if (roundedPercentChange === 0) {
    return i18n.translate('xpack.observabilityAgentBuilder.chartDescription.comparisonUnchanged', {
      defaultMessage: 'Compared to {comparisonTitle}, the average is about the same.',
      values: { comparisonTitle: comparisonSeries.title },
    });
  }

  if (roundedPercentChange > 0) {
    return i18n.translate('xpack.observabilityAgentBuilder.chartDescription.comparisonIncrease', {
      defaultMessage: 'Compared to {comparisonTitle}, the average increased by {percentChange}%.',
      values: {
        comparisonTitle: comparisonSeries.title,
        percentChange: Math.abs(roundedPercentChange),
      },
    });
  }

  return i18n.translate('xpack.observabilityAgentBuilder.chartDescription.comparisonDecrease', {
    defaultMessage: 'Compared to {comparisonTitle}, the average decreased by {percentChange}%.',
    values: {
      comparisonTitle: comparisonSeries.title,
      percentChange: Math.abs(roundedPercentChange),
    },
  });
};

export const buildDeterministicChartSummary = ({
  chartTitle,
  series,
  timestampFormatter = defaultTimestampFormatter,
  locale = 'en-US',
  valueFormatter,
}: BuildDeterministicChartSummaryParams): string => {
  if (series.length === 0) {
    return i18n.translate('xpack.observabilityAgentBuilder.chartDescription.noSeries', {
      defaultMessage: '{chartTitle} has no data in the selected time range.',
      values: { chartTitle },
    });
  }

  const parts = [
    i18n.translate('xpack.observabilityAgentBuilder.chartDescription.intro', {
      defaultMessage: 'Summary for {chartTitle}.',
      values: { chartTitle },
    }),
    summarizeSeries({
      series: series[0],
      timestampFormatter,
      locale,
      valueFormatter,
    }),
  ];

  if (series.length > 1) {
    parts.push(
      summarizeSeries({
        series: series[1],
        timestampFormatter,
        locale,
        valueFormatter,
      })
    );

    const comparisonSummary = summarizeComparison({
      currentSeries: series[0],
      comparisonSeries: series[1],
      locale,
      valueFormatter,
    });

    if (comparisonSummary) {
      parts.push(comparisonSummary);
    }
  }

  return parts.join(' ');
};
