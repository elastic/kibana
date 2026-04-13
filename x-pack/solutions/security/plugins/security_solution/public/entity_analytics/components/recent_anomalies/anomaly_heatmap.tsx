/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  Heatmap,
  type HeatmapStyle,
  niceTimeFormatter,
  type RecursivePartial,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useIntervalForHeatmap } from './anomaly_heatmap_interval';
import { getAnomalyChartStyling } from './anomaly_chart_styling';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import type { AnomalyBand } from './anomaly_bands';

const heatmapComponentStyle: RecursivePartial<HeatmapStyle> = {
  brushTool: {
    visible: false,
  },
  cell: {
    maxWidth: 'fill',
    label: {
      visible: false,
    },
    border: {
      stroke: 'transparent',
      strokeWidth: 0,
    },
  },
  xAxisLabel: {
    fontSize: 12,
    padding: { top: 10, bottom: 10 },
  },
  yAxisLabel: {
    visible: false, // We do not show the yAxisLabel, as we instead render the entity names separately in order to link to the entity flyout
    fontSize: 14,
    width: 'auto',
    padding: { left: 10, right: 10 },
  },
};

interface AnomalyHeatmapProps {
  records: Array<Record<string, unknown>>;
  anomalyBands: AnomalyBand[];
  entityNames: string[];
  entityAccessor: string;
  heatmapId: string;
  isLoading: boolean;
  isError: boolean;
  compressed?: boolean;
  noResultsComponent?: React.ReactNode;
}

const useGlobalTimeInMillis = () => {
  const { from, to } = useGlobalTime();

  return {
    from: new Date(from).getTime(),
    to: new Date(to).getTime(),
  };
};

const useXDomainFromGlobalTime = () => {
  const { from, to } = useGlobalTimeInMillis();

  return {
    min: from,
    max: to,
  };
};

const useTimeFormatter = () => {
  const { from, to } = useGlobalTimeInMillis();

  return (value: string | number) =>
    niceTimeFormatter([from, to])(value, {
      timeZone: 'UTC',
    });
};

export const AnomalyHeatmap: React.FC<AnomalyHeatmapProps> = ({
  records,
  anomalyBands,
  entityNames,
  entityAccessor,
  heatmapId,
  isLoading,
  isError,
  compressed = false,
  noResultsComponent,
}) => {
  const intervalForHeatmap = useIntervalForHeatmap();
  const timeFormatter = useTimeFormatter();
  const xDomain = useXDomainFromGlobalTime();
  const styling = getAnomalyChartStyling(compressed);

  return (
    <EuiFlexItem
      css={{
        marginTop: `${styling.heightOfTopLegend}px`,
        height: `${styling.heightOfHeatmap(entityNames.length)}px`,
      }}
    >
      {isLoading && (
        <EuiFlexGroup justifyContent={'center'} alignItems={'center'}>
          <EuiLoadingChart size="xl" />
        </EuiFlexGroup>
      )}
      {isError && (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.securitySolution.entityAnalytics.anomalyHeatmap.dataError', {
            defaultMessage: 'There was an error retrieving anomaly data.',
          })}
          color="danger"
          iconType="error"
        />
      )}
      {!isLoading && !isError && (
        <Chart>
          <Settings
            theme={{ heatmap: heatmapComponentStyle }}
            noResults={noResultsComponent ?? undefined}
            xDomain={xDomain}
          />
          <Heatmap
            id={heatmapId}
            xScale={{
              type: ScaleType.Time,
              interval: {
                type: 'fixed',
                value: intervalForHeatmap,
                unit: 'h',
              },
            }}
            colorScale={{
              type: 'bands',
              bands: anomalyBands,
            }}
            data={records}
            name={i18n.translate(
              'xpack.securitySolution.entityAnalytics.anomalyHeatmap.maxAnomalyScore',
              { defaultMessage: 'Max anomaly score' }
            )}
            xAccessor="@timestamp"
            xAxisLabelName={''}
            xAxisLabelFormatter={timeFormatter}
            yAccessor={entityAccessor}
            yAxisLabelName={entityAccessor}
            ySortPredicate="numDesc"
            valueAccessor="record_score"
          />
        </Chart>
      )}
    </EuiFlexItem>
  );
};
