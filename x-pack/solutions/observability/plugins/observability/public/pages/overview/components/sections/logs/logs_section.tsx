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
  XYBrushEvent,
} from '@elastic/charts';
import { timeFormatter } from '@elastic/charts/dist/utils/data/formatters';
import { EuiFlexGroup, EuiFlexItem, euiPaletteColorBlind, EuiSpacer, EuiTitle } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import moment from 'moment';
import React, { Fragment } from 'react';
import { useHistory } from 'react-router-dom';
import { useChartThemes, FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { SectionContainer } from '../section_container';
import { getDataHandler } from '../../../../../context/has_data_context/data_handler';
import { useHasData } from '../../../../../hooks/use_has_data';
import { useDatePickerContext } from '../../../../../hooks/use_date_picker_context';
import { LogsFetchDataResponse } from '../../../../../typings';
import { formatStatValue } from '../../../../../utils/format_stat_value';
import { ChartContainer } from '../../chart_container/chart_container';
import { StyledStat } from '../../styled_stat/styled_stat';
import { onBrushEnd } from '../../../helpers/on_brush_end';
import type { BucketSize } from '../../../helpers/calculate_bucket_size';

interface Props {
  bucketSize: BucketSize;
}

function getColorPerItem(series?: LogsFetchDataResponse['series']) {
  if (!series) {
    return {};
  }
  const availableColors = euiPaletteColorBlind({
    rotations: Math.ceil(Object.keys(series).length / 10),
  });
  const colorsPerItem = Object.keys(series).reduce((acc: Record<string, string>, key, index) => {
    acc[key] = availableColors[index];
    return acc;
  }, {});

  return colorsPerItem;
}

export function LogsSection({ bucketSize }: Props) {
  const history = useHistory();
  const chartThemes = useChartThemes();
  const { forceUpdate, hasDataMap } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, lastUpdated } =
    useDatePickerContext();

  const { data, status } = useFetcher(
    () => {
      if (bucketSize && absoluteStart && absoluteEnd) {
        return getDataHandler('infra_logs')?.fetchData({
          absoluteTime: { start: absoluteStart, end: absoluteEnd },
          relativeTime: { start: relativeStart, end: relativeEnd },
          ...bucketSize,
        });
      }
    },

    // `forceUpdate` and `lastUpdated` trigger a reload

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketSize, relativeStart, relativeEnd, absoluteStart, absoluteEnd, forceUpdate, lastUpdated]
  );

  if (!hasDataMap.infra_logs?.hasData) {
    return null;
  }

  const min = moment.utc(absoluteStart).valueOf();
  const max = moment.utc(absoluteEnd).valueOf();

  const formatter = bucketSize?.dateFormat
    ? timeFormatter(bucketSize?.dateFormat)
    : niceTimeFormatter([min, max]);

  const { appLink, stats, series } = data || {};

  const colorsPerItem = getColorPerItem(series);

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.logs.title', {
        defaultMessage: 'Log Events',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.logs.appLink', {
          defaultMessage: 'Show logs',
        }),
        prependBasePath: false,
      }}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.observability.overview.logs.subtitle', {
            defaultMessage: 'Logs rate per minute',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        {!stats || isEmpty(stats) ? (
          <EuiFlexItem grow={false}>
            <StyledStat isLoading={isLoading} />
          </EuiFlexItem>
        ) : (
          Object.keys(stats).map((key) => {
            const stat = stats[key];
            return (
              <EuiFlexItem grow={false} key={key}>
                <StyledStat
                  title={formatStatValue(stat)}
                  description={stat.label}
                  isLoading={isLoading}
                  color={colorsPerItem[key]}
                />
              </EuiFlexItem>
            );
          })
        )}
      </EuiFlexGroup>
      <ChartContainer isInitialLoad={isLoading && !data}>
        <Settings
          onBrushEnd={(event) => onBrushEnd({ x: (event as XYBrushEvent).x, history })}
          {...chartThemes}
          showLegend
          legendPosition={Position.Right}
          xDomain={{ min, max }}
          locale={i18n.getLocale()}
        />
        {series &&
          Object.keys(series).map((key) => {
            const serie = series[key];
            const chartData = serie.coordinates.map((coordinate) => ({
              ...coordinate,
              g: serie.label,
            }));
            return (
              <Fragment key={key}>
                <BarSeries
                  id={key}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={'x'}
                  yAccessors={['y']}
                  stackAccessors={['x']}
                  splitSeriesAccessors={['g']}
                  data={chartData}
                  color={colorsPerItem[key]}
                />
                <Axis
                  id="x-axis"
                  position={Position.Bottom}
                  showOverlappingTicks={false}
                  showOverlappingLabels={false}
                  tickFormat={formatter}
                />
                <Axis
                  id="y-axis"
                  gridLine={{ visible: true }}
                  position={Position.Left}
                  tickFormat={(d: number) => numeral(d).format('0a')}
                />
              </Fragment>
            );
          })}
      </ChartContainer>
    </SectionContainer>
  );
}
