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
import { EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiIcon, useEuiTheme } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useChartThemes, FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { useDatePickerContext } from '../../../../../hooks/use_date_picker_context';
import { SectionContainer } from '../section_container';
import { getDataHandler } from '../../../../../context/has_data_context/data_handler';
import { useHasData } from '../../../../../hooks/use_has_data';
import { ChartContainer } from '../../chart_container/chart_container';
import { StyledStat } from '../../styled_stat/styled_stat';
import { onBrushEnd } from '../../../helpers/on_brush_end';
import type { BucketSize } from '../../../helpers/calculate_bucket_size';

interface Props {
  bucketSize: BucketSize;
}

function formatTpm(value?: number) {
  return numeral(value).format('0.00a');
}

function formatTpmStat(value?: number) {
  if (!value || value === 0) {
    return '0';
  }
  if (value <= 0.1) {
    return '< 0.1';
  }
  if (value > 1000) {
    return numeral(value).format('0.00a');
  }
  return numeral(value).format('0,0.0');
}

export function APMSection({ bucketSize }: Props) {
  const { euiTheme } = useEuiTheme();
  const chartThemes = useChartThemes();
  const history = useHistory();
  const { forceUpdate, hasDataMap } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, lastUpdated } =
    useDatePickerContext();

  const { data, status } = useFetcher(
    () => {
      if (bucketSize && absoluteStart && absoluteEnd) {
        return getDataHandler('apm')?.fetchData({
          absoluteTime: { start: absoluteStart, end: absoluteEnd },
          relativeTime: { start: relativeStart, end: relativeEnd },
          ...bucketSize,
        });
      }
    },
    // `forceUpdate` and `lastUpdated` should trigger a reload

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketSize, relativeStart, relativeEnd, absoluteStart, absoluteEnd, forceUpdate, lastUpdated]
  );

  if (!hasDataMap.apm?.hasData) {
    return null;
  }

  const { appLink, stats, series } = data || {};

  const min = moment.utc(absoluteStart).valueOf();
  const max = moment.utc(absoluteEnd).valueOf();

  const formatter = bucketSize?.dateFormat
    ? timeFormatter(bucketSize?.dateFormat)
    : niceTimeFormatter([min, max]);

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.apm.title', {
        defaultMessage: 'Services',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.apm.appLink', {
          defaultMessage: 'Show service inventory',
        }),
      }}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={numeral(stats?.services.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.apm.services', {
              defaultMessage: 'Services',
            })}
            isLoading={isLoading}
            data-test-subj="apmServiceStat"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={`${formatTpmStat(stats?.transactions.value)} tpm`}
            description={
              <EuiToolTip
                content={i18n.translate('xpack.observability.overview.apm.throughputTip', {
                  defaultMessage:
                    'Values are calculated for transactions with type "Request" or "page-load". If neither are available, values reflect the top transaction type.',
                })}
              >
                <>
                  {i18n.translate('xpack.observability.overview.apm.throughput', {
                    defaultMessage: 'Throughput',
                  })}{' '}
                  <EuiIcon
                    size="s"
                    color="subdued"
                    type="questionInCircle"
                    className="eui-alignCenter"
                  />
                </>
              </EuiToolTip>
            }
            isLoading={isLoading}
            // color={transactionsColor}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <ChartContainer isInitialLoad={isLoading && !data}>
        <Settings
          onBrushEnd={(event) => onBrushEnd({ x: (event as XYBrushEvent).x, history })}
          {...chartThemes}
          showLegend={false}
          xDomain={{ min, max }}
          locale={i18n.getLocale()}
        />
        {series?.transactions.coordinates && (
          <>
            <BarSeries
              id="transactions"
              name="Transactions"
              data={series?.transactions.coordinates}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={'x'}
              yAccessors={['y']}
              color={euiTheme.colors.vis.euiColorVis0}
            />
            <Axis
              id="y-axis"
              position={Position.Left}
              gridLine={{ visible: true }}
              tickFormat={(value) => `${formatTpm(value)} tpm`}
            />
            <Axis id="x-axis" position={Position.Bottom} tickFormat={formatter} />
          </>
        )}
      </ChartContainer>
    </SectionContainer>
  );
}
