/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment, { Moment } from 'moment';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';
import { useStatusByAllLocationsOverview } from '../../../../../hooks';
import {
  selectErrorPopoverState,
  selectOverviewTrends,
  toggleErrorPopoverOpen,
} from '../../../../../state';
import { formatDuration } from '../../../../../utils/formatting';
import { FlyoutParamProps } from '../types';
import { useMonitorDetailLocator } from '../../../../../hooks/use_monitor_detail_locator';
import { getColor } from './get_color';
import { METRIC_ITEM_HEIGHT } from './constants';

export const MetricItemGroup = ({
  configId,
  name,
  monitors,
  style,
  onClick,
}: {
  configId: string;
  name: string;
  monitors: OverviewStatusMetaData[];
  style?: React.CSSProperties;
  onClick: (params: FlyoutParamProps) => void;
}) => {
  const enabled = monitors.some((m) => m.isEnabled);
  const statuses = new Set(monitors.map((m) => m.status));
  const { euiTheme } = useEuiTheme();
  const isErrorPopoverOpen = useSelector(selectErrorPopoverState);
  const statusesByLocation = useStatusByAllLocationsOverview({
    configId,
    locationIds: monitors.map((m) => m.locationId),
  });
  const trendData = useSelector(selectOverviewTrends);
  const timestamp: Moment = statusesByLocation.reduce((acc, curr) => {
    const currMoment = moment(curr.timestamp);
    return currMoment.isAfter(acc) ? currMoment : acc;
  }, moment(0));

  // KEEPING this here commented in case we want to do something with metrics for the locations
  //   const testInProgress = useSelector(manualTestRunInProgressSelector(configId));

  //   const mapped = monitors.map((monitor) => {
  //     const trendValue = trendData[monitor.configId + monitor.locationId];
  //     return {
  //       value: !!trendValue && trendValue !== 'loading' ? trendValue?.median ?? 0 : 0,
  //       trendShape: MetricTrendShape.Area,
  //       trend: trendValue !== 'loading' && !!trendValue?.data ? trendValue.data : [],
  //       extra:
  //         trendValue !== 'loading' && !!trendValue ? (
  //           <MetricItemExtra
  //             stats={{
  //               medianDuration: trendValue.median,
  //               minDuration: trendValue.min,
  //               maxDuration: trendValue.max,
  //               avgDuration: trendValue.avg,
  //             }}
  //           />
  //         ) : trendValue === 'loading' ? (
  //           <div>
  //             <FormattedMessage
  //               defaultMessage="Loading metrics"
  //               id="xpack.synthetics.overview.metricItem.loadingMessage"
  //             />
  //           </div>
  //         ) : undefined,
  //       valueFormatter: (d: number) => formatDuration(d),
  //       color: getColor(
  //         euiTheme,
  //         monitor.isEnabled,
  //         statusesByLocation.find((s) => s.configIdByLocation === `${configId}-${monitor.locationId}`)
  //           ?.status
  //       ),
  //       body: (
  //         <>
  //           <EuiTitle size="xxxs">
  //             <h5>{monitor.locationLabel}</h5>
  //           </EuiTitle>
  //         </>
  //       ),
  //     };
  //   });

  const dispatch = useDispatch();
  return (
    <div
      data-test-subj={`${name}-grouped-metric-item`}
      style={style ?? { height: METRIC_ITEM_HEIGHT }}
    >
      <EuiPanel
        data-test-subj={`${name}-grouped-metric-item-panel`}
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
        title={timestamp.format('LLL')}
      >
        <div
          css={css`
            background-color: ${getColor(
              euiTheme,
              enabled,
              statuses.has('unknown') ? 'unknown' : statuses.has('down') ? 'down' : 'up'
            )};
          `}
          className="eui-yScroll"
        >
          <div style={{ padding: 8 }}>
            <EuiTitle size="xxs">
              <h5>{monitors[0].name}</h5>
            </EuiTitle>
          </div>
          <EuiFlexGroup direction="column" gutterSize="none">
            {monitors.map((monitor, i) => {
              const trend = trendData[monitor.configId + monitor.locationId];
              const maxDuration = trend !== 'loading' ? trend?.max ?? null : null;
              return (
                <EuiFlexItem key={i}>
                  <EuiFlexGroup gutterSize="none">
                    <EuiFlexItem grow={false}>
                      <EuiBadge
                        color={getColor(euiTheme, monitor.isEnabled, monitor.status)}
                        onClickAriaLabel="Click to view location details"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClick({
                            configId: monitor.configId,
                            id: monitor.configId,
                            location: monitor.locationLabel,
                            locationId: monitor.locationId,
                            spaceId: monitor.spaceId,
                          });
                        }}
                      >
                        {monitor.locationLabel}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem />
                    {maxDuration !== null && (
                      <EuiFlexItem grow={false}>{formatDuration(maxDuration)}</EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <DetailLink configId={monitor.configId} locationId={monitor.locationId} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </div>
      </EuiPanel>
      <EuiSpacer size="s" />
    </div>
  );
};

const DetailLink = ({ configId, locationId }: { configId: string; locationId: string }) => {
  const url = useMonitorDetailLocator({ configId, locationId });

  return (
    <EuiButtonIcon
      data-test-subj="xpack.synthetics.locationGroupedMonitor.detail.click"
      iconType="sortRight"
      href={url}
      target="_blank"
      onClick={(e) => {
        e.stopPropagation();
      }}
    />
  );
};
