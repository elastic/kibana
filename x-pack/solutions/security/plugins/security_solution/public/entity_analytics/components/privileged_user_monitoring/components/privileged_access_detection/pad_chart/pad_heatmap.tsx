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
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { padChartStyling, useIntervalForHeatmap } from './pad_chart';
import type { ESQLAnomalyRecord } from './pad_query';
import { useGlobalTime } from '../../../../../../common/containers/use_global_time';
import { useKibana } from '../../../../../../common/lib/kibana';
import type { AnomalyBand } from './pad_anomaly_bands';

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
    visible: false, // We do not show the yAxisLabel, as we instead render the user names separately in order to link to the User flyout
    fontSize: 14,
    width: 'auto',
    padding: { left: 10, right: 10 },
  },
};

interface PrivilegedAccessDetectionHeatmapProps {
  records: ESQLAnomalyRecord[];
  anomalyBands: AnomalyBand[];
  userNames: string[];
  isLoading: boolean;
  isError: boolean;
}

const PrivilegedAccessDetectionHeatmapNoResults: React.FC = () => {
  const { http } = useKibana().services;

  return (
    <EuiFlexGroup css={{ maxWidth: '600px' }}>
      <EuiFlexItem>
        <EuiText size="s">
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.noResultsTitle"
                defaultMessage="No privileged access detection results match your search criteria"
              />
            </h3>
          </EuiTitle>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.privilegedAccessDetection.noResultsDescription"
              defaultMessage={`Now that you've got the privileged access detection anomaly jobs installed, you can click "ML job settings" above to configure and run them within your environment.`}
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiImage
          size="200"
          alt=""
          url={http.basePath.prepend(
            '/plugins/timelines/assets/illustration_product_no_results_magnifying_glass.svg'
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const useGlobalTimeInMillis = () => {
  const { from, to } = useGlobalTime();

  return {
    from: from ? new Date(from).getTime() : 0,
    to: to ? new Date(to).getTime() : 0,
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

export const PrivilegedAccessDetectionHeatmap: React.FC<PrivilegedAccessDetectionHeatmapProps> = ({
  records,
  anomalyBands,
  userNames,
  isLoading,
  isError,
}) => {
  const intervalForHeatmap = useIntervalForHeatmap();
  const timeFormatter = useTimeFormatter();
  const xDomain = useXDomainFromGlobalTime();

  return (
    <EuiFlexItem
      css={{
        marginTop: `${padChartStyling.heightOfTopLegend}px`,
        height: `${padChartStyling.heightOfHeatmap(userNames)}px`,
      }}
    >
      {!isLoading && !isError && (
        <>
          <Chart>
            <Settings
              theme={{ heatmap: heatmapComponentStyle }}
              noResults={<PrivilegedAccessDetectionHeatmapNoResults />}
              xDomain={xDomain}
            />
            <Heatmap
              id={'privileged-access-detection-heatmap-chart'}
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
                'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.topPrivilegedAccessDetections.maxAnomalyScore',
                { defaultMessage: 'Max anomaly score' }
              )}
              xAccessor="@timestamp"
              xAxisLabelName={''}
              xAxisLabelFormatter={timeFormatter}
              yAccessor="user.name"
              yAxisLabelName={'user.name'}
              ySortPredicate="numDesc"
              valueAccessor="record_score"
            />
          </Chart>
        </>
      )}
    </EuiFlexItem>
  );
};
