/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiScreenReaderOnly } from '@elastic/eui';
import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';

export interface SparklinePoint {
  x: number;
  y: number;
}

interface ProposalSparklineProps {
  series: SparklinePoint[];
  /** EUI semantic colour token name — resolved to hex via EUI theme by the parent. */
  color: string;
  ariaLabel: string;
  /** Human-readable label shown as the series name in the tooltip, e.g. "Respond Actions". */
  seriesName: string;
  /** Bucket width in minutes — used to render the end of the time range in the tooltip header. */
  bucketMinutes?: number;
}

/**
 * Filled-area sparkline for open-proposal counts. No axes, no legend.
 * Hovering shows the bucket time range and open count.
 * Screen-reader users see a text summary via `EuiScreenReaderOnly`.
 */
export const ProposalSparkline: React.FC<ProposalSparklineProps> = ({
  series,
  color,
  ariaLabel,
  seriesName,
  bucketMinutes = 30,
}) => {
  const chartBaseTheme = useElasticChartsTheme();
  const locale = i18n.getLocale();

  const yMax = Math.max(...series.map((p) => p.y), 0);
  const yDomainMax = yMax > 0 ? yMax * 1.25 : 1;

  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

  // headerFormatter receives { value } where value is the raw x (timestamp ms).
  const headerFormatter = ({ value }: { value: number }) => {
    const start = new Date(value);
    const end = new Date(value + bucketMinutes * 60 * 1000);
    return `${start.toLocaleTimeString(locale, timeOpts)} – ${end.toLocaleTimeString(
      locale,
      timeOpts
    )}`;
  };

  // valueFormatter receives the raw y number.
  const valueFormatter = (count: number) =>
    i18n.translate('xpack.pnd.proposalStats.tooltipOpen', {
      defaultMessage: '{count} open',
      values: { count },
    });

  const partialTheme = {
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    chartPaddings: { top: 0, bottom: 0, left: 0, right: 0 },
    background: { color: 'transparent' },
    areaSeriesStyle: {
      area: { opacity: 0.25 },
      line: { strokeWidth: 2 },
    },
  };

  return (
    <>
      <EuiScreenReaderOnly>
        <span>{ariaLabel}</span>
      </EuiScreenReaderOnly>
      <Chart
        size={{ height: 48, width: '100%' }}
        aria-hidden="true"
        data-test-subj="pndProposalSparkline"
      >
        <Settings
          theme={[partialTheme]}
          baseTheme={chartBaseTheme}
          showLegend={false}
          locale={locale}
        />
        <Tooltip
          type={TooltipType.VerticalCursor}
          headerFormatter={headerFormatter}
          valueFormatter={valueFormatter}
        />
        <Axis
          id="y-axis"
          position={Position.Left}
          hide={true}
          gridLine={{ visible: false }}
          domain={{ min: 0, max: yDomainMax }}
        />
        <AreaSeries
          id={seriesName}
          name={seriesName}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={series}
          curve={CurveType.CURVE_MONOTONE_X}
          color={color}
        />
      </Chart>
    </>
  );
};
