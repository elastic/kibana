/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  TickFormatter,
  XYBrushEvent,
} from '@elastic/charts';
import { timeFormatter } from '@elastic/charts/dist/utils/data/formatters';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import {
  useTimeZone,
  useChartThemes,
  useFetcher,
  FETCH_STATUS,
} from '@kbn/observability-shared-plugin/public';
import { SectionContainer } from '../section_container';
import { getDataHandler } from '../../../../../context/has_data_context/data_handler';
import { useHasData } from '../../../../../hooks/use_has_data';
import { useDatePickerContext } from '../../../../../hooks/use_date_picker_context';
import { Series } from '../../../../../typings';
import { ChartContainer } from '../../chart_container/chart_container';
import { StyledStat } from '../../styled_stat/styled_stat';
import { onBrushEnd } from '../../../helpers/on_brush_end';
import type { BucketSize } from '../../../helpers/calculate_bucket_size';

interface Props {
  bucketSize: BucketSize;
}

export function UptimeSection({ bucketSize }: Props) {
  const theme = useContext(ThemeContext);
  const chartThemes = useChartThemes();
  const history = useHistory();
  const { forceUpdate, hasDataMap } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, lastUpdated } =
    useDatePickerContext();

  const timeZone = useTimeZone();

  const { data, status } = useFetcher(
    () => {
      if (bucketSize && absoluteStart && absoluteEnd) {
        return getDataHandler('uptime')?.fetchData({
          absoluteTime: { start: absoluteStart, end: absoluteEnd },
          relativeTime: { start: relativeStart, end: relativeEnd },
          timeZone,
          ...bucketSize,
        });
      }
    },
    // `forceUpdate` and `lastUpdated` should trigger a reload

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      bucketSize,
      relativeStart,
      relativeEnd,
      absoluteStart,
      absoluteEnd,
      forceUpdate,
      lastUpdated,
      timeZone,
    ]
  );

  if (!hasDataMap.uptime?.hasData) {
    return null;
  }

  const min = moment.utc(absoluteStart).valueOf();
  const max = moment.utc(absoluteEnd).valueOf();

  const formatter = bucketSize?.dateFormat
    ? timeFormatter(bucketSize?.dateFormat)
    : niceTimeFormatter([min, max]);

  const isLoading = status === FETCH_STATUS.LOADING;

  const { appLink, stats, series } = data || {};

  const downColor = theme.eui.euiColorVis2;
  const upColor = theme.eui.euiColorMediumShade;

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.uptime.title', {
        defaultMessage: 'Monitors',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.uptime.appLink', {
          defaultMessage: 'Show monitors',
        }),
      }}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiFlexGroup>
        {/* Stats section */}
        <EuiFlexItem grow={false}>
          <StyledStat
            title={numeral(stats?.monitors.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.uptime.monitors', {
              defaultMessage: 'Monitors',
            })}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={numeral(stats?.up.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.uptime.up', {
              defaultMessage: 'Up',
            })}
            isLoading={isLoading}
            color={upColor}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={numeral(stats?.down.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.uptime.down', {
              defaultMessage: 'Down',
            })}
            isLoading={isLoading}
            color={downColor}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Chart section */}
      <ChartContainer isInitialLoad={isLoading && !data}>
        <Settings
          onBrushEnd={(event) => onBrushEnd({ x: (event as XYBrushEvent).x, history })}
          {...chartThemes}
          showLegend={false}
          legendPosition={Position.Right}
          xDomain={{ min, max }}
          locale={i18n.getLocale()}
        />
        <UptimeBarSeries
          id="down"
          label={i18n.translate('xpack.observability.overview.uptime.chart.down', {
            defaultMessage: 'Down',
          })}
          series={series?.down}
          tickFormatter={formatter}
          color={downColor}
        />
        <UptimeBarSeries
          id="up"
          label={i18n.translate('xpack.observability.overview.uptime.chart.up', {
            defaultMessage: 'Up',
          })}
          series={series?.up}
          tickFormatter={formatter}
          color={upColor}
        />
      </ChartContainer>
    </SectionContainer>
  );
}

function UptimeBarSeries({
  id,
  label,
  series,
  color,
  tickFormatter,
}: {
  id: string;
  label: string;
  series?: Series;
  color: string;
  tickFormatter: TickFormatter;
}) {
  if (!series) {
    return null;
  }
  const chartData = series.coordinates.map((coordinate) => ({
    ...coordinate,
    g: label,
  }));
  return (
    <>
      <BarSeries
        id={id}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={'x'}
        yAccessors={['y']}
        color={color}
        stackAccessors={['x']}
        splitSeriesAccessors={['g']}
        data={chartData}
      />
      <Axis
        id="x-axis"
        position={Position.Bottom}
        showOverlappingTicks={false}
        showOverlappingLabels={false}
        tickFormat={tickFormatter}
      />
      <Axis
        id="y-axis"
        gridLine={{ visible: true }}
        position={Position.Left}
        tickFormat={(x: any) => numeral(x).format('0a')}
      />
    </>
  );
}
