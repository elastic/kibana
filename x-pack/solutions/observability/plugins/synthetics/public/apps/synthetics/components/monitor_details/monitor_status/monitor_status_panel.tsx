/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import { EuiPanel, useEuiTheme, EuiResizeObserver, EuiSpacer, EuiProgress } from '@elastic/eui';
import type { ElementClickListener, HeatmapElementEvent } from '@elastic/charts';
import { Chart, Settings, Heatmap, ScaleType, Tooltip } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { useGetUrlParams } from '../../../hooks';
import { useUrlSpaceId } from '../../../hooks/use_url_space_id';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { MonitorStatusHeader } from './monitor_status_header';
import { MonitorStatusCellTooltip } from './monitor_status_cell_tooltip';
import { MonitorStatusLegend } from './monitor_status_legend';
import { getMonitorStatusChartTheme } from './monitor_status_chart_theme';
import type { MonitorStatusPanelProps } from './monitor_status_data';
import { getXAxisLabelFormatter, getColorBands, getBrushData } from './monitor_status_data';
import { useMonitorStatusData } from './use_monitor_status_data';
import { getStatusChartClickPath } from './status_chart_click';
import type { ClientPluginsStart } from '../../../../../plugin';

export const MonitorStatusPanel = ({
  from = 'now-24h',
  to = 'now',
  brushable = true,
  periodCaption = undefined,
  showViewHistoryButton = false,
  onBrushed,
  monitorId,
  configId: configIdOverride,
  locationLabel,
  locationId: locationIdOverride,
  remoteName: remoteNameOverride,
}: MonitorStatusPanelProps) => {
  const history = useHistory();
  const { monitorId: routeMonitorId } = useParams<{ monitorId: string }>();
  const { euiTheme, colorMode } = useEuiTheme();
  const initialSizeRef = useRef<HTMLDivElement | null>(null);
  const { loading, timeBins, handleResize, getTimeBinByXValue, xDomain, minsPerBin } =
    useMonitorStatusData({
      from,
      to,
      initialSizeRef,
      monitorId,
      locationLabel,
      remoteName: remoteNameOverride,
    });
  const { charts } = useKibana<ClientPluginsStart>().services;
  const baseTheme = charts.theme.useChartsBaseTheme();
  const { monitor } = useSelectedMonitor({ refetchMonitorEnabled: !monitorId });
  const selectedLocation = useSelectedLocation({ refetchMonitorEnabled: !monitorId });
  const spaceId = useUrlSpaceId();
  const { remoteName: remoteNameFromUrl } = useGetUrlParams();

  const configId = configIdOverride ?? monitor?.[ConfigKey.CONFIG_ID] ?? routeMonitorId;
  const locationId = locationIdOverride ?? selectedLocation?.id;
  const remoteName = remoteNameOverride ?? remoteNameFromUrl;

  const heatmap = useMemo(() => {
    return getMonitorStatusChartTheme(euiTheme, brushable);
  }, [euiTheme, brushable]);

  const onElementClick: ElementClickListener = useCallback(
    (elements) => {
      const cell = (elements[0] as HeatmapElementEvent | undefined)?.[0];
      const xValue = Number(cell?.datum?.x);
      const timeBin = Number.isFinite(xValue) ? getTimeBinByXValue(xValue) : undefined;
      const path = getStatusChartClickPath({
        timeBin,
        configId,
        locationId,
        spaceId,
        remoteName,
      });
      if (path) {
        history.push(path);
      }
    },
    [configId, getTimeBinByXValue, history, locationId, remoteName, spaceId]
  );

  return (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <MonitorStatusHeader
        from={from}
        to={to}
        brushable={brushable}
        periodCaption={periodCaption}
        showViewHistoryButton={showViewHistoryButton}
        onBrushed={onBrushed}
      />

      <EuiSpacer size="m" />

      <div ref={initialSizeRef}>
        <EuiResizeObserver onResize={(e) => handleResize(e)}>
          {(resizeRef) => (
            <div
              ref={resizeRef}
              data-test-subj="syntheticsMonitorStatusChart"
              css={{ cursor: 'pointer' }}
            >
              {minsPerBin && (
                <Chart
                  size={{
                    height: 80,
                  }}
                >
                  <Tooltip
                    customTooltip={({ values }) => (
                      <MonitorStatusCellTooltip
                        timeBin={getTimeBinByXValue(values?.[0]?.datum?.x)}
                        isLoading={loading}
                      />
                    )}
                  />
                  <Settings
                    showLegend={false}
                    xDomain={xDomain}
                    theme={{ heatmap }}
                    baseTheme={baseTheme}
                    minBrushDelta={brushable ? 5 : undefined}
                    onElementClick={onElementClick}
                    onBrushEnd={(brushArea) => {
                      onBrushed?.(getBrushData(brushArea));
                    }}
                    locale={i18n.getLocale()}
                  />
                  <Heatmap
                    id="monitor-details-monitor-status-chart"
                    colorScale={{
                      type: 'bands',
                      bands: getColorBands(euiTheme, colorMode),
                    }}
                    data={timeBins}
                    xAccessor={({ end }) => end}
                    yAccessor={() => 'T'}
                    valueAccessor={(timeBin) => timeBin.value}
                    valueFormatter={(d) => d.toFixed(2)}
                    xAxisLabelFormatter={getXAxisLabelFormatter(minsPerBin)}
                    timeZone="UTC"
                    xScale={{
                      type: ScaleType.Time,
                      interval: {
                        type: 'calendar',
                        unit: 'm',
                        value: minsPerBin,
                      },
                    }}
                  />
                </Chart>
              )}
            </div>
          )}
        </EuiResizeObserver>
      </div>

      <MonitorStatusLegend brushable={brushable} />
      {loading && <EuiProgress size="xs" color="accent" />}
    </EuiPanel>
  );
};
