/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  LensConfigBuilder,
  type LensAttributes,
  type LensConfig,
  type LensESQLDataset,
} from '@kbn/lens-embeddable-utils';
import type { LifecycleDetection } from '@kbn/significant-events-schema';
import React, { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '../../../utils/kibana_react';
import {
  DETECTION_OCCURRENCE_BUCKET_SIZE,
  getChangePointLabel,
  getDetectionOccurrenceTimeRange,
} from './change_point';

const CHART_HEIGHT = 200;
const RULE_EVENTS_INDEX = '.rule-events';
const DEFAULT_SPACE_ID = 'default';
const OCCURRENCE_BUCKET_MINUTES = Number.parseInt(DETECTION_OCCURRENCE_BUCKET_SIZE, 10);

type LensESQLConfig = LensConfig & { dataset: LensESQLDataset };

const getStreamTypeLabel = (streamName?: string): string => {
  if (streamName?.startsWith('metrics')) {
    return i18n.translate('xpack.observability.nightshift.detectionFlyout.trend.metricsLabel', {
      defaultMessage: '[Metrics]',
    });
  }
  return i18n.translate('xpack.observability.nightshift.detectionFlyout.trend.logsLabel', {
    defaultMessage: '[Logs]',
  });
};

export const buildDetectionOccurrencesEsql = ({
  ruleUuid,
  spaceId,
}: {
  ruleUuid: string;
  spaceId: string;
}): string => `FROM ${RULE_EVENTS_INDEX}
| WHERE type == "signal"
  AND space_id == ${JSON.stringify(spaceId)}
  AND rule.id == ${JSON.stringify(ruleUuid)}
| STATS occurrences = COUNT_DISTINCT(group_hash)
  BY timestamp = BUCKET(@timestamp, ${OCCURRENCE_BUCKET_MINUTES} minutes)
| SORT timestamp ASC`;

const buildLensConfig = ({
  changePointLabel,
  color,
  dangerColor,
  esqlQuery,
  timestamp,
  title,
}: {
  changePointLabel: string;
  color: string;
  dangerColor: string;
  esqlQuery: string;
  timestamp: string;
  title: string;
}): LensESQLConfig => ({
  chartType: 'xy',
  title,
  dataset: { esql: esqlQuery },
  layers: [
    {
      type: 'series',
      seriesType: 'bar',
      xAxis: { field: 'timestamp', type: 'dateHistogram' },
      yAxis: [
        {
          label: i18n.translate(
            'xpack.observability.nightshift.detectionFlyout.trend.valueAxisLabel',
            { defaultMessage: 'Occurrences' }
          ),
          value: 'occurrences',
          format: 'number',
          decimals: 0,
          seriesColor: color,
        },
      ],
    },
    {
      type: 'annotation',
      yAxis: [],
      events: [
        {
          name: changePointLabel,
          color: dangerColor,
          datetime: timestamp,
        },
      ],
    },
  ],
  legend: { show: false },
  fittingFunction: 'Zero',
  valueLabels: 'hide',
  axisTitleVisibility: {
    showXAxisTitle: false,
    showYAxisTitle: true,
    showYRightAxisTitle: false,
  },
});

export function ChangePointLensChart({
  detection,
}: {
  detection: LifecycleDetection;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { dataViews, lens, spaces } = useKibana().services;
  const changePointLabel = getChangePointLabel(detection.change_point_type);
  const title = `${getStreamTypeLabel(detection.stream_name)} ${changePointLabel}`;
  const timeRange = useMemo(() => {
    const range = getDetectionOccurrenceTimeRange(detection['@timestamp']);
    return range
      ? {
          from: new Date(range.from).toISOString(),
          to: new Date(range.to).toISOString(),
        }
      : undefined;
  }, [detection]);

  const {
    error,
    loading,
    value: attributes,
  } = useAsync(async () => {
    if (!timeRange) {
      throw new Error('Invalid detection timestamp');
    }
    const { rule_uuid: ruleUuid } = detection;
    if (!ruleUuid) {
      throw new Error('Detection rule UUID is required');
    }
    const spaceId = (await spaces?.getActiveSpace())?.id ?? DEFAULT_SPACE_ID;
    const esqlQuery = buildDetectionOccurrencesEsql({
      ruleUuid,
      spaceId,
    });
    const config = buildLensConfig({
      changePointLabel,
      color: euiTheme.colors.vis.euiColorVis0,
      dangerColor: euiTheme.colors.danger,
      esqlQuery,
      timestamp: detection['@timestamp'],
      title,
    });
    const builder = new LensConfigBuilder(dataViews);
    return builder.build(config, {
      query: { esql: esqlQuery },
    }) as Promise<LensAttributes>;
  }, [
    changePointLabel,
    dataViews,
    detection,
    euiTheme.colors.danger,
    euiTheme.colors.vis.euiColorVis0,
    spaces,
    timeRange,
    title,
  ]);

  const LensEmbeddableComponent = lens.EmbeddableComponent;

  if (error || !timeRange) {
    return (
      <EuiCallOut
        announceOnMount
        color="warning"
        iconType="warning"
        size="s"
        title={i18n.translate(
          'xpack.observability.nightshift.detectionFlyout.trend.lensErrorTitle',
          { defaultMessage: 'Unable to load occurrence visualization' }
        )}
      />
    );
  }

  return (
    <div
      data-test-subj="nightshiftDetectionLensChart"
      css={css`
        min-height: ${CHART_HEIGHT}px;
      `}
    >
      {loading || !attributes ? (
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          responsive={false}
          css={css`
            height: ${CHART_HEIGHT}px;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart data-test-subj="nightshiftDetectionLensChartLoading" size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <LensEmbeddableComponent
          id={`nightshift-detection-${detection.detection_id}`}
          attributes={attributes}
          timeRange={timeRange}
          noPadding
          withDefaultActions
          viewMode="view"
          style={{ height: CHART_HEIGHT }}
          executionContext={{
            description: 'Nightshift detection occurrence chart',
            meta: {
              detection_id: detection.detection_id,
              rule_uuid: detection.rule_uuid,
            },
          }}
        />
      )}
    </div>
  );
}
