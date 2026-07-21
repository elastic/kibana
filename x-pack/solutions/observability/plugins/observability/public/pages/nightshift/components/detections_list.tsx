/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { Chart, Settings, BarSeries, ScaleType, Tooltip, TooltipType } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ChangePointType, LifecycleDetection } from '@kbn/significant-events-schema';
import { useFetchEventLifecycle } from '../hooks/use_fetch_event_lifecycle';
import { useChartThemes } from '../../../hooks/use_chart_themes';
import { formatTimestamp } from '../format_timestamp';

export interface DetectionsListProps {
  eventUuid: string;
}

// Minimum width reserved for a detection card's text column. Below this, the
// fixed-size sparkline wraps onto its own line instead of being clipped.
const TEXT_CONTENT_MIN_WIDTH = '220px';

const CHANGE_POINT_LABELS: Record<ChangePointType, string> = {
  spike: i18n.translate('xpack.observability.nightshift.flyout.changePoint.spikeLabel', {
    defaultMessage: 'Spike',
  }),
  dip: i18n.translate('xpack.observability.nightshift.flyout.changePoint.dipLabel', {
    defaultMessage: 'Dip',
  }),
  trend_change: i18n.translate(
    'xpack.observability.nightshift.flyout.changePoint.trendChangeLabel',
    { defaultMessage: 'Trend change' }
  ),
  step_change: i18n.translate('xpack.observability.nightshift.flyout.changePoint.stepChangeLabel', {
    defaultMessage: 'Step change',
  }),
  distribution_change: i18n.translate(
    'xpack.observability.nightshift.flyout.changePoint.distributionChangeLabel',
    { defaultMessage: 'Distribution change' }
  ),
  non_stationary: i18n.translate(
    'xpack.observability.nightshift.flyout.changePoint.nonStationaryLabel',
    { defaultMessage: 'Non-stationary' }
  ),
  stationary: i18n.translate('xpack.observability.nightshift.flyout.changePoint.stationaryLabel', {
    defaultMessage: 'Stationary',
  }),
};

function getChangePointLabel(type?: ChangePointType): string {
  if (!type) {
    return i18n.translate('xpack.observability.nightshift.flyout.detectionFallbackLabel', {
      defaultMessage: 'Detection',
    });
  }
  return CHANGE_POINT_LABELS[type];
}

function generateSparklineData(changePointType?: ChangePointType): Array<{ x: number; y: number }> {
  const points = 20;
  const data: Array<{ x: number; y: number }> = [];
  const rand = () => Math.random() * 0.3;

  for (let i = 0; i < points; i++) {
    let y: number;
    switch (changePointType) {
      case 'spike':
        y = i >= points - 4 ? 0.7 + rand() : 0.2 + rand();
        break;
      case 'dip':
        y = i >= points - 4 ? 0.1 + rand() : 0.6 + rand();
        break;
      case 'trend_change':
        y = i < points / 2 ? 0.4 + rand() : 0.4 + (i - points / 2) * 0.04 + rand();
        break;
      case 'step_change':
        y = i < points / 2 ? 0.25 + rand() : 0.65 + rand();
        break;
      default:
        y = 0.3 + rand();
    }
    data.push({ x: i, y });
  }
  return data;
}

function DetectionSparkline({ changePointType }: { changePointType?: ChangePointType }) {
  const { euiTheme } = useEuiTheme();
  const { baseTheme, sparklineTheme } = useChartThemes();
  const data = useMemo(() => generateSparklineData(changePointType), [changePointType]);

  return (
    <Chart size={{ height: 24, width: 64 }}>
      <Tooltip type={TooltipType.None} />
      <Settings
        baseTheme={baseTheme}
        theme={[{ background: { color: 'transparent' } }, sparklineTheme]}
        showLegend={false}
        locale={i18n.getLocale()}
      />
      <BarSeries
        id="detection-sparkline"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        data={data}
        xAccessor="x"
        yAccessors={['y']}
        color={euiTheme.colors.vis.euiColorVis0}
      />
    </Chart>
  );
}

function DetectionCard({ detection }: { detection: LifecycleDetection }) {
  const { euiTheme } = useEuiTheme();
  const changePointLabel = getChangePointLabel(detection.change_point_type);

  const handleClick = () => {
    // No-op until the detection child flyout ships.
  };

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      onClick={handleClick}
      data-test-subj="nightshiftDetectionCard"
      css={css`
        transition: background 0.15s;

        /* Same hover treatment as the significant event rows, instead of the
           default clickable-panel lift effect. */
        &:hover,
        &:focus {
          background: ${euiTheme.colors.backgroundBaseSubdued};
          box-shadow: none;
          transform: none;
        }
      `}
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        wrap
        gutterSize="s"
      >
        <EuiFlexItem
          css={css`
            flex: 1 1 ${TEXT_CONTENT_MIN_WIDTH};
          `}
        >
          <EuiText size="s" textAlign="left">
            <strong>{detection.rule_name ?? detection.detection_id}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued" textAlign="left">
            {formatTimestamp(detection['@timestamp'])}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color="default">{changePointLabel}</EuiBadge>
            </EuiFlexItem>
            {detection.stream_name && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{detection.stream_name}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DetectionSparkline changePointType={detection.change_point_type} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function DetectionsList({ eventUuid }: DetectionsListProps): React.ReactElement {
  const { data, isLoading, isError, refetch } = useFetchEventLifecycle(eventUuid);

  // Most recent detection first — it is the most actionable one during an incident.
  const detections = useMemo(
    () =>
      [...(data?.detections ?? [])].sort(
        (first, second) =>
          new Date(second['@timestamp']).getTime() - new Date(first['@timestamp']).getTime()
      ),
    [data]
  );

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.observability.nightshift.flyout.detectionsTitle', {
            defaultMessage: 'Detections',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {isLoading && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {isError && (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          size="s"
          title={i18n.translate('xpack.observability.nightshift.flyout.detectionsErrorTitle', {
            defaultMessage: 'Unable to load detections',
          })}
        >
          <EuiButtonEmpty
            color="danger"
            data-test-subj="nightshiftDetectionsRetryButton"
            flush="left"
            iconType="refresh"
            onClick={() => refetch()}
            size="s"
          >
            {i18n.translate('xpack.observability.nightshift.flyout.detectionsRetryButtonText', {
              defaultMessage: 'Retry',
            })}
          </EuiButtonEmpty>
        </EuiCallOut>
      )}

      {!isLoading && !isError && detections.length === 0 && (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.observability.nightshift.flyout.detectionsEmptyDescription', {
            defaultMessage: 'No detections found for this event.',
          })}
        </EuiText>
      )}

      {!isLoading && !isError && detections.length > 0 && (
        <EuiFlexGroup direction="column" gutterSize="s">
          {detections.map((detection) => (
            <EuiFlexItem key={detection.detection_id}>
              <DetectionCard detection={detection} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </>
  );
}
