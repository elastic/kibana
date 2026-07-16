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
import { getChangePointLabel, generateChangePointSeries } from '../change_point';

export interface DetectionsListProps {
  eventId: string;
  onDetectionClick?: (detection: LifecycleDetection) => void;
}

// Minimum width reserved for a detection card's text column. Below this, the
// fixed-size sparkline wraps onto its own line instead of being clipped.
const TEXT_CONTENT_MIN_WIDTH = '220px';

const SPARKLINE_POINTS = 20;

function DetectionSparkline({ changePointType }: { changePointType?: ChangePointType }) {
  const { euiTheme } = useEuiTheme();
  const { baseTheme, sparklineTheme } = useChartThemes();
  const data = useMemo(
    () => generateChangePointSeries(changePointType, SPARKLINE_POINTS),
    [changePointType]
  );

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

function DetectionCard({
  detection,
  onClick,
}: {
  detection: LifecycleDetection;
  onClick?: (detection: LifecycleDetection) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const changePointLabel = getChangePointLabel(detection.change_point_type);

  const handleClick = () => {
    onClick?.(detection);
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

export function DetectionsList({
  eventId,
  onDetectionClick,
}: DetectionsListProps): React.ReactElement {
  const { data, isLoading, isError, refetch } = useFetchEventLifecycle(eventId);

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
              <DetectionCard detection={detection} onClick={onDetectionClick} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </>
  );
}
