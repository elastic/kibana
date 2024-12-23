/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AreaSeries,
  Axis,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { asDynamicBytes } from '@kbn/observability-plugin/common';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { StorageExplorerHostDetailsTimeseries } from '../../../../common/storage_explorer';
import { useKibanaTimeZoneSetting } from '../../../hooks/use_kibana_timezone_setting';
import { useProfilingChartsTheme } from '../../../hooks/use_profiling_charts_theme';

interface Props {
  data?: StorageExplorerHostDetailsTimeseries[];
}
export function HostBreakdownChart({ data = [] }: Props) {
  const { chartsBaseTheme, chartsTheme } = useProfilingChartsTheme();
  const timeZone = useKibanaTimeZoneSetting();

  const hostBreakdownTimeseries = useMemo(() => {
    return (
      data.map(({ hostId, hostName, timeseries }) => {
        return {
          data: timeseries ?? [],
          type: 'area',
          title: `${hostName} [${hostId}]`,
        };
      }) ?? []
    );
  }, [data]);

  const xValues = hostBreakdownTimeseries.flatMap(({ data: timeseriesData }) =>
    timeseriesData.map(({ x }) => x)
  );

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);
  const xFormatter = niceTimeFormatter([min, max]);

  return (
    <Chart size={{ height: 400 }}>
      <Settings
        showLegend
        legendPosition={Position.Right}
        baseTheme={chartsBaseTheme}
        theme={chartsTheme}
        locale={i18n.getLocale()}
      />
      <Axis
        id="x-axis"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={xFormatter}
        gridLine={{ visible: false }}
      />
      <Axis
        id="y-axis"
        position={Position.Left}
        gridLine={{ visible: true }}
        tickFormat={asDynamicBytes}
      />
      {hostBreakdownTimeseries.map((serie) => (
        <AreaSeries
          timeZone={timeZone}
          key={serie.title}
          id={serie.title}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={serie.data}
          stackAccessors={['x']}
        />
      ))}
    </Chart>
  );
}
