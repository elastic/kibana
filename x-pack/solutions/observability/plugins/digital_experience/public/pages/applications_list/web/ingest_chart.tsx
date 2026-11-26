/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { sortBy, sortedUniqBy } from 'lodash';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  type SeriesName,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { HistogramBuckets } from '../../../../common/types/applications';
import { ChartArea } from '../../../components/chart_area';
import { PartialBucketsEndzones } from '../../../components/partial_buckets_endzones';
import { useFormatters } from '../../../hooks/use_formatters';
import { INGEST_LABEL } from '../../../labels';
import type { TimeRangeSelect } from '../../../utils/brush_time_range';
import { onBrushTimeRange } from '../../../utils/brush_time_range';
import { formatBytes } from '../../../utils/format_bytes';
import { getTimeChartXDomain } from '../../../utils/histogram_interval';
import { IngestTooltip } from '../components/ingest_tooltip';
import type { IngestChartPoint } from '../utils/ingest';
import { OTHER_INGEST_SERIES } from '../utils/ingest';

const CHART_HEIGHT = 140;

const TITLE = i18n.translate('xpack.digitalExperience.ingestChart.title', {
  defaultMessage: 'Ingest over time',
});

const OTHER_LABEL = i18n.translate('xpack.digitalExperience.ingestChart.other', {
  defaultMessage: 'Other',
});

const NO_DATA = i18n.translate('xpack.digitalExperience.ingestChart.noData', {
  defaultMessage: 'No ingest estimate for the selected time range',
});

const seriesName = ({
  splitAccessors,
}: {
  splitAccessors: Map<string | number, string | number>;
}) => {
  const series = splitAccessors.get('series');
  return series === OTHER_INGEST_SERIES ? OTHER_LABEL : (series as SeriesName);
};

/**
 * The web applications' estimated ingest over the time range, stacked by the 10 with the most and
 * "Other"; it loads apart from the list, and dragging over the bars selects a narrower range.
 */
export function IngestChart({
  points,
  histogram,
  isLoading,
  notes,
  onTimeRangeSelect,
}: {
  points: IngestChartPoint[];
  /** The buckets; `undefined` until the first response. */
  histogram: HistogramBuckets | undefined;
  isLoading: boolean;
  /** Why some applications have no estimate. */
  notes: string[];
  onTimeRangeSelect: TimeRangeSelect;
}) {
  const baseTheme = useElasticChartsTheme();
  const { formatDate, timeZone } = useFormatters();
  const hasData = points.some(({ bytes }) => bytes > 0);
  // The points come per series; the domain reads each bucket once, in order.
  const xDomain = getTimeChartXDomain({
    points: sortedUniqBy(sortBy(points, 'timestamp'), 'timestamp'),
    histogram,
    timeZone,
    hasBars: true,
  });

  return (
    <EuiPanel hasBorder data-test-subj="digitalExperienceIngestChart">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>{TITLE}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="info"
            color="subdued"
            aria-label={INGEST_LABEL}
            content={<IngestTooltip notes={notes} />}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <ChartArea
        height={CHART_HEIGHT}
        isLoading={isLoading}
        hasData={hasData}
        emptyMessage={NO_DATA}
      >
        <Chart size={{ height: CHART_HEIGHT }}>
          <Settings
            baseTheme={baseTheme}
            showLegend
            legendPosition={Position.Right}
            locale={i18n.getLocale()}
            onBrushEnd={onBrushTimeRange(onTimeRangeSelect)}
            xDomain={xDomain}
          />
          <Tooltip headerFormatter={({ value }) => formatDate(value)} />
          <PartialBucketsEndzones xDomain={xDomain} />
          <Axis id="time" position={Position.Bottom} />
          <Axis
            id="bytes"
            position={Position.Left}
            gridLine={{ visible: true }}
            ticks={4}
            tickFormat={formatBytes}
          />
          <BarSeries
            id="ingest"
            name={seriesName}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['bytes']}
            splitSeriesAccessors={['series']}
            stackAccessors={['timestamp']}
            data={points}
            enableHistogramMode
            timeZone={timeZone}
            tickFormat={formatBytes}
          />
        </Chart>
      </ChartArea>
    </EuiPanel>
  );
}
