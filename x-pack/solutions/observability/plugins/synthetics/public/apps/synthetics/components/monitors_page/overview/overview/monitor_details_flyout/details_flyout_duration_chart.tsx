/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSection, EuiTitle, useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { MonitorDetailsFlyoutProps } from '../monitor_detail_flyout';
import type { ClientPluginsStart } from '../../../../../../../plugin';

const DEFAULT_DURATION_CHART_FROM = 'now-12h';
const DEFAULT_CURRENT_DURATION_CHART_TO = 'now';
const DEFAULT_PREVIOUS_DURATION_CHART_FROM = 'now-24h';
const DEFAULT_PREVIOUS_DURATION_CHART_TO = 'now-12h';

export function DetailFlyoutDurationChart({
  overviewItem,
  currentDurationChartFrom,
  currentDurationChartTo,
  previousDurationChartFrom,
  previousDurationChartTo,
}: Pick<
  MonitorDetailsFlyoutProps,
  | 'overviewItem'
  | 'currentDurationChartFrom'
  | 'currentDurationChartTo'
  | 'previousDurationChartFrom'
  | 'previousDurationChartTo'
>) {
  const { euiTheme } = useEuiTheme();

  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;
  return (
    <EuiPageSection bottomBorder="extended">
      <EuiTitle size="xs">
        <h3>{DURATION_HEADER_TEXT}</h3>
      </EuiTitle>
      <ExploratoryViewEmbeddable
        customHeight="200px"
        reportType="kpi-over-time"
        axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
        legendIsVisible={true}
        legendPosition="bottom"
        attributes={[
          {
            seriesType: 'area',
            color: euiTheme.colors.vis.euiColorVis1,
            time: {
              from: currentDurationChartFrom ?? DEFAULT_DURATION_CHART_FROM,
              to: currentDurationChartTo ?? DEFAULT_CURRENT_DURATION_CHART_TO,
            },
            reportDefinitions: {
              'monitor.id': [overviewItem.monitorQueryId],
              'observer.name': [overviewItem.locationId],
            },
            filters: [
              {
                field: 'observer.name',
                values: [overviewItem.locationId],
              },
            ],
            dataType: 'synthetics',
            selectedMetricField: 'monitor.duration.us',
            name: DURATION_SERIES_NAME,
            operationType: 'average',
          },
          {
            seriesType: 'line',
            color: euiTheme.colors.vis.euiColorVis7,
            time: {
              from: previousDurationChartFrom ?? DEFAULT_PREVIOUS_DURATION_CHART_FROM,
              to: previousDurationChartTo ?? DEFAULT_PREVIOUS_DURATION_CHART_TO,
            },
            reportDefinitions: {
              'monitor.id': [overviewItem.monitorQueryId],
              'observer.name': [overviewItem.locationId],
            },
            filters: [
              {
                field: 'observer.name',
                values: [overviewItem.locationId],
              },
            ],
            dataType: 'synthetics',
            selectedMetricField: 'monitor.duration.us',
            name: PREVIOUS_PERIOD_SERIES_NAME,
            operationType: 'average',
          },
        ]}
      />
    </EuiPageSection>
  );
}

const DURATION_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.durationHeaderText', {
  defaultMessage: 'Duration',
});

const DURATION_SERIES_NAME = i18n.translate(
  'xpack.synthetics.monitorList.durationChart.durationSeriesName',
  {
    defaultMessage: 'Duration',
  }
);

const PREVIOUS_PERIOD_SERIES_NAME = i18n.translate(
  'xpack.synthetics.monitorList.durationChart.previousPeriodSeriesName',
  {
    defaultMessage: 'Previous period',
  }
);
