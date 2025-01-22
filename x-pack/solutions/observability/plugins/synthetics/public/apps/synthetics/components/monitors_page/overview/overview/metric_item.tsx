/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Chart, Metric, MetricTrendShape, Settings } from '@elastic/charts';
import { EuiPanel, EuiSpacer, EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import moment from 'moment';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OverviewStatusMetaData } from '../../../../../../../common/runtime_types';
import { ClientPluginsStart } from '../../../../../../plugin';
import { useLocationName, useStatusByLocationOverview } from '../../../../hooks';
import {
  selectErrorPopoverState,
  selectOverviewTrends,
  toggleErrorPopoverOpen,
} from '../../../../state';
import {
  hideTestNowFlyoutAction,
  manualTestRunInProgressSelector,
  toggleTestNowFlyoutAction,
} from '../../../../state/manual_test_runs';
import { formatDuration } from '../../../../utils/formatting';
import { ActionsPopover } from './actions_popover';
import { MetricItemBody } from './metric_item/metric_item_body';
import { MetricItemExtra } from './metric_item/metric_item_extra';
import { MetricItemIcon } from './metric_item_icon';
import { FlyoutParamProps } from './types';

const METRIC_ITEM_HEIGHT = 160;

export const getColor = (euiTheme: EuiThemeComputed, isEnabled: boolean, status?: string) => {
  if (!isEnabled) {
    return euiTheme.colors.backgroundBaseDisabled;
  }
  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  // make sure these are synced with slo card colors while making changes

  switch (status) {
    case 'down':
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText9
        : euiTheme.colors.backgroundBaseDanger;
    case 'up':
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText0
        : euiTheme.colors.backgroundBaseSuccess;
    case 'unknown':
      return euiTheme.colors.backgroundBasePlain;
    default:
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText0
        : euiTheme.colors.backgroundBaseSuccess;
  }
};

export const MetricItem = ({
  monitor,
  onClick,
  style,
}: {
  monitor: OverviewStatusMetaData;
  style?: React.CSSProperties;
  onClick: (params: FlyoutParamProps) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const trendData = useSelector(selectOverviewTrends)[monitor.configId + monitor.locationId];
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isErrorPopoverOpen = useSelector(selectErrorPopoverState);
  const locationName = useLocationName(monitor);
  const { status, timestamp, ping, configIdByLocation } = useStatusByLocationOverview({
    configId: monitor.configId,
    locationId: monitor.locationId,
  });

  const { charts } = useKibana<ClientPluginsStart>().services;
  const testInProgress = useSelector(manualTestRunInProgressSelector(monitor.configId));

  const dispatch = useDispatch();

  return (
    <div
      data-test-subj={`${monitor.name}-${monitor.locationId}-metric-item`}
      style={style ?? { height: METRIC_ITEM_HEIGHT }}
    >
      <EuiPanel
        data-test-subj={`${monitor.name}-metric-item-${locationName}-${status}`}
        paddingSize="none"
        onMouseLeave={() => {
          if (isErrorPopoverOpen) {
            dispatch(toggleErrorPopoverOpen(null));
          }
        }}
        css={css`
          height: 100%;
          overflow: hidden;
          position: relative;

          & .cardItemActions_hover {
            pointer-events: none;
            opacity: 0;
            &:focus-within {
              pointer-events: auto;
              opacity: 1;
            }
          }
          &:hover .cardItemActions_hover {
            pointer-events: auto;
            opacity: 1;
          }
        `}
        title={moment(timestamp).format('LLL')}
      >
        <Chart>
          <Settings
            onElementClick={() => {
              if (testInProgress) {
                dispatch(toggleTestNowFlyoutAction(monitor.configId));
                dispatch(toggleErrorPopoverOpen(null));
              } else {
                dispatch(hideTestNowFlyoutAction());
                dispatch(toggleErrorPopoverOpen(null));
              }
              if (!testInProgress && locationName) {
                onClick({
                  configId: monitor.configId,
                  id: monitor.configId,
                  location: locationName,
                  locationId: monitor.locationId,
                  spaceId: monitor.spaceId,
                });
              }
            }}
            baseTheme={charts.theme.useChartsBaseTheme()}
            locale={i18n.getLocale()}
          />
          <Metric
            id={`${monitor.configId}-${monitor.locationId}`}
            data={[
              [
                {
                  title: monitor.name,
                  subtitle: locationName,
                  value: trendData !== 'loading' ? trendData?.median ?? 0 : 0,
                  trendShape: MetricTrendShape.Area,
                  trend: trendData !== 'loading' && !!trendData?.data ? trendData.data : [],
                  extra:
                    trendData !== 'loading' && !!trendData ? (
                      <MetricItemExtra
                        stats={{
                          medianDuration: trendData.median,
                          minDuration: trendData.min,
                          maxDuration: trendData.max,
                          avgDuration: trendData.avg,
                        }}
                      />
                    ) : trendData === 'loading' ? (
                      <div>
                        <FormattedMessage
                          defaultMessage="Loading metrics"
                          id="xpack.synthetics.overview.metricItem.loadingMessage"
                        />
                      </div>
                    ) : undefined,
                  valueFormatter: (d: number) => formatDuration(d),
                  color: getColor(euiTheme, monitor.isEnabled, status),
                  body: <MetricItemBody monitor={monitor} />,
                },
              ],
            ]}
          />
        </Chart>
        <div className={isPopoverOpen ? '' : 'cardItemActions_hover'}>
          <ActionsPopover
            monitor={monitor}
            isPopoverOpen={isPopoverOpen}
            setIsPopoverOpen={setIsPopoverOpen}
            position="relative"
            locationId={monitor.locationId}
          />
        </div>
        {configIdByLocation && (
          <MetricItemIcon
            monitor={monitor}
            status={status}
            ping={ping}
            timestamp={timestamp}
            configIdByLocation={configIdByLocation}
          />
        )}
      </EuiPanel>
      <EuiSpacer size="s" />
    </div>
  );
};
