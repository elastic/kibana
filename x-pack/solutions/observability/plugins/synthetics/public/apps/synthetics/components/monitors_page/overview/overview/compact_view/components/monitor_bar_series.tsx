/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, Chart, ScaleType, Settings, Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HistogramPoint } from '../../../../../../../../../common/runtime_types/monitor';
import { ClientPluginsStart } from '../../../../../../../../plugin';
const seriesHasDownValues = (series: HistogramPoint[] | null): boolean => {
  return series ? series.some((point) => !!point.down) : false;
};
export interface MonitorBarSeriesProps {
  histogramSeries: HistogramPoint[] | null;
  minInterval: number;
}

/**
 * There is a specific focus on the monitor's down count, the up series is not shown,
 * so we will only render the series component if there are down counts for the selected monitor.
 * @param props - the values for the monitor this chart visualizes
 */
export const MonitorBarSeries = ({ histogramSeries, minInterval }: MonitorBarSeriesProps) => {
  const {
    services: { charts },
  } = useKibana<ClientPluginsStart>();
  const baseTheme = charts.theme.useChartsBaseTheme();

  const theme = useEuiTheme();
  const danger = theme.euiTheme.colors.danger;

  const id = 'downSeries';

  return seriesHasDownValues(histogramSeries) ? (
    <div style={{ height: 50, width: '100%', maxWidth: '1200px', marginRight: 15 }}>
      <Chart>
        <Settings
          xDomain={{
            minInterval,
            min: moment().subtract(24, 'hours').valueOf(),
            max: moment().valueOf(),
          }}
          locale={i18n.getLocale()}
          baseTheme={baseTheme}
        />
        <Axis
          hide
          id="bottom"
          position={Position.Bottom}
          tickFormat={(d) => moment(d).format('YYYY-MM-DD HH:mm:ss')}
        />
        <BarSeries
          id={id}
          color={danger}
          data={(histogramSeries || []).map(({ timestamp, down }) => [timestamp, down])}
          name={i18n.translate('xpack.synthetics.monitorList.downLineSeries.downLabel', {
            defaultMessage: 'Down checks',
          })}
          timeZone="local"
          xAccessor={0}
          // Defaults to multi layer time axis as of Elastic Charts v70
          xScaleType={ScaleType.Time}
          yAccessors={[1]}
          yScaleType={ScaleType.Linear}
        />
      </Chart>
    </div>
  ) : (
    <EuiToolTip
      position="top"
      content={
        <FormattedMessage
          id="xpack.synthetics.monitorList.noDownHistory"
          defaultMessage="This monitor has never been {emphasizedText} during the last 24 hours"
          values={{
            emphasizedText: (
              <strong>
                {i18n.translate('xpack.synthetics.monitorBarSeries.strong.downLabel', {
                  defaultMessage: 'down',
                })}
              </strong>
            ),
          }}
        />
      }
    >
      <EuiText color="success">
        {i18n.translate('xpack.synthetics.monitorBarSeries.TextLabel', { defaultMessage: '--' })}
      </EuiText>
    </EuiToolTip>
  );
};
