/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import type { XYBrushEvent } from '@elastic/charts';
import {
  Chart,
  BarSeries,
  Axis,
  Settings,
  ScaleType,
  Position,
  Tooltip,
  BrushAxis,
} from '@elastic/charts';
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiSkeletonRectangle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ErrorGroup } from '../../../../../../common/runtime_types';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useUrlParams } from '../../../hooks';
import { SyntheticsRefreshContext } from '../../../contexts';

const GROUP_COLORS = [
  '#BD271E',
  '#F5A700',
  '#6092C0',
  '#D36086',
  '#9170B8',
  '#CA8EAE',
  '#54B399',
  '#DA8B45',
];

type ViewMode = 'total' | 'grouped';

const VIEW_OPTIONS = [
  {
    id: 'total' as const,
    label: i18n.translate('xpack.synthetics.errors.errorsOverTime.total', {
      defaultMessage: 'Total',
    }),
  },
  {
    id: 'grouped' as const,
    label: i18n.translate('xpack.synthetics.errors.errorsOverTime.byGroup', {
      defaultMessage: 'By group',
    }),
  },
];

export const ErrorsOverTimeChart = ({
  groups,
  loading,
}: {
  groups: ErrorGroup[];
  loading: boolean;
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [, updateUrl] = useUrlParams();
  const { refreshApp } = useContext(SyntheticsRefreshContext);
  const {
    services: { charts, data },
  } = useKibana<ClientPluginsStart>();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const { euiTheme } = useEuiTheme();

  const onBrushEnd = useCallback(
    (brushEvent: XYBrushEvent) => {
      const xRange = brushEvent.x;
      if (xRange && xRange.length === 2) {
        const from = moment(xRange[0]).toISOString();
        const to = moment(xRange[1]).toISOString();

        (data as DataPublicPluginStart)?.query?.timefilter?.timefilter?.setTime({ from, to });

        updateUrl({
          dateRangeStart: from,
          dateRangeEnd: to,
        });
        refreshApp();
      }
    },
    [updateUrl, refreshApp, data]
  );

  const { totalData, groupedData, minInterval, hasData } = useMemo(() => {
    let interval: number | undefined;
    let found = false;

    // Aggregate all histograms into a single total timeline
    const totalsMap = new Map<number, number>();
    const grouped: Array<{ name: string; data: Array<[number, number]>; color: string }> = [];

    groups.forEach((group, idx) => {
      if (!group.histogram.length) return;
      found = true;

      if (!interval && group.histogram.length > 1) {
        interval = group.histogram[1].timestamp - group.histogram[0].timestamp;
      }

      for (const b of group.histogram) {
        totalsMap.set(b.timestamp, (totalsMap.get(b.timestamp) ?? 0) + b.count);
      }

      const truncatedName =
        group.name.length > 50 ? group.name.substring(0, 50) + '...' : group.name;

      grouped.push({
        name: truncatedName,
        data: group.histogram.map((b) => [b.timestamp, b.count]),
        color: GROUP_COLORS[idx % GROUP_COLORS.length],
      });
    });

    const total: Array<[number, number]> = Array.from(totalsMap.entries()).sort(
      (a, b) => a[0] - b[0]
    );

    const MAX_CHART_SERIES = 8;
    let chartGrouped = grouped;
    if (grouped.length > MAX_CHART_SERIES) {
      const top = grouped.slice(0, MAX_CHART_SERIES);
      const rest = grouped.slice(MAX_CHART_SERIES);
      const otherMap = new Map<number, number>();
      for (const series of rest) {
        for (const [ts, count] of series.data) {
          otherMap.set(ts, (otherMap.get(ts) ?? 0) + count);
        }
      }
      top.push({
        name: `Other (${rest.length})`,
        data: Array.from(otherMap.entries()).sort((a, b) => a[0] - b[0]),
        color: '#999',
      });
      chartGrouped = top;
    }

    return { totalData: total, groupedData: chartGrouped, minInterval: interval, hasData: found };
  }, [groups]);

  if (loading && !hasData) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiText size="xs">
          <h5>{TITLE}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiSkeletonRectangle width="100%" height="180px" />
      </EuiPanel>
    );
  }

  if (!hasData) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiText size="xs">
          <h5>{TITLE}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {NO_DATA_LABEL}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <h5>{TITLE}</h5>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={VIEW_TOGGLE_LABEL}
            options={VIEW_OPTIONS}
            idSelected={viewMode}
            onChange={(id) => setViewMode(id as ViewMode)}
            buttonSize="compressed"
            isFullWidth={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div style={{ height: 200, width: '100%', cursor: 'crosshair' }}>
        <Chart>
          <Settings
            xDomain={minInterval ? { min: NaN, max: NaN, minInterval } : undefined}
            locale={i18n.getLocale()}
            baseTheme={baseTheme}
            showLegend={viewMode === 'grouped'}
            legendPosition={Position.Right}
            legendSize={180}
            onBrushEnd={(e) => onBrushEnd(e as XYBrushEvent)}
            brushAxis={BrushAxis.X}
            theme={{
              legend: { labelOptions: { maxLines: 1 } },
              barSeriesStyle: { displayValue: { fontSize: 0 } },
            }}
          />
          <Tooltip />
          <Axis id="bottom" position={Position.Bottom} />
          <Axis
            id="left"
            position={Position.Left}
            ticks={4}
            style={{
              tickLine: { visible: false },
              axisLine: { visible: false },
            }}
          />

          {viewMode === 'total' ? (
            <BarSeries
              id="totalErrors"
              name={TOTAL_ERRORS_LABEL}
              color={euiTheme.colors.danger}
              data={totalData}
              timeZone="local"
              xAccessor={0}
              xScaleType={ScaleType.Time}
              yAccessors={[1]}
              yScaleType={ScaleType.Linear}
            />
          ) : (
            groupedData.map((series) => (
              <BarSeries
                key={series.name}
                id={series.name}
                name={series.name}
                color={series.color}
                data={series.data}
                timeZone="local"
                xAccessor={0}
                xScaleType={ScaleType.Time}
                yAccessors={[1]}
                yScaleType={ScaleType.Linear}
                stackAccessors={[0]}
              />
            ))
          )}
        </Chart>
      </div>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued" textAlign="center">
        <EuiIcon type="iInCircle" size="s" aria-hidden={true} /> {BRUSH_HINT}
      </EuiText>
    </EuiPanel>
  );
};

const TITLE = i18n.translate('xpack.synthetics.errors.errorsOverTime', {
  defaultMessage: 'Errors over time',
});

const NO_DATA_LABEL = i18n.translate('xpack.synthetics.errors.errorsOverTime.noData', {
  defaultMessage: 'No error data in this period',
});

const TOTAL_ERRORS_LABEL = i18n.translate('xpack.synthetics.errors.errorsOverTime.totalErrors', {
  defaultMessage: 'Total errors',
});

const VIEW_TOGGLE_LABEL = i18n.translate('xpack.synthetics.errors.errorsOverTime.viewToggle', {
  defaultMessage: 'Chart view mode',
});

const BRUSH_HINT = i18n.translate('xpack.synthetics.errors.errorsOverTime.brushHint', {
  defaultMessage: 'Click and drag to zoom into a time range',
});
