/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  Chart,
  Settings,
  BarSeries,
  ScaleType,
  Tooltip,
  TooltipType,
  LIGHT_THEME,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent, LifecycleDetection } from '@kbn/significant-events-schema';
import { useFetchEventLifecycle } from '../hooks/use_fetch_event_lifecycle';

export interface DetectionsListProps {
  event: SignificantEvent;
}

function getChangePointColor(type?: string): string {
  switch (type?.toLowerCase()) {
    case 'spike':
      return '#006BB8';
    case 'dip':
      return '#BD271E';
    case 'trend break':
    case 'trend_change_point':
      return '#98A2B3';
    default:
      return 'hollow';
  }
}

function getChangePointLabel(type?: string): string {
  if (!type) return 'Detection';
  const normalized = type.replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDetectionTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function generateSparklineData(changePointType?: string): Array<{ x: number; y: number }> {
  const points = 20;
  const data: Array<{ x: number; y: number }> = [];
  const rand = () => Math.random() * 0.3;

  for (let i = 0; i < points; i++) {
    let y: number;
    switch (changePointType?.toLowerCase()) {
      case 'spike':
        y = i >= points - 4 ? 0.7 + rand() : 0.2 + rand();
        break;
      case 'dip':
        y = i >= points - 4 ? 0.1 + rand() : 0.6 + rand();
        break;
      case 'trend_change_point':
      case 'trend break':
        y = i < points / 2 ? 0.4 + rand() : 0.4 + (i - points / 2) * 0.04 + rand();
        break;
      default:
        y = 0.3 + rand();
    }
    data.push({ x: i, y });
  }
  return data;
}

function DetectionSparkline({ changePointType }: { changePointType?: string }) {
  const data = useMemo(() => generateSparklineData(changePointType), [changePointType]);
  const color = getChangePointColor(changePointType);

  return (
    <Chart size={{ height: 24, width: 64 }}>
      <Tooltip type={TooltipType.None} />
      <Settings baseTheme={LIGHT_THEME} showLegend={false} locale={i18n.getLocale()} />
      <BarSeries
        id="detection-sparkline"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        data={data}
        xAccessor="x"
        yAccessors={['y']}
        color={color === 'hollow' ? '#98A2B3' : color}
      />
    </Chart>
  );
}

function DetectionCard({ detection }: { detection: LifecycleDetection }) {
  const changePointLabel = getChangePointLabel(detection.change_point_type);
  const changePointColor = getChangePointColor(detection.change_point_type);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow>
          <EuiText size="s">
            <strong>{detection.rule_name ?? detection.detection_id}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {formatDetectionTime(detection['@timestamp'])}
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color={changePointColor}>{changePointLabel}</EuiBadge>
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

export function DetectionsList({ event }: DetectionsListProps) {
  const { data, isLoading } = useFetchEventLifecycle(event.event_id);
  const detections = data?.detections ?? [];

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.flyout.detections.title', {
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

      {!isLoading && detections.length === 0 && (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.nightshift.flyout.detections.empty', {
            defaultMessage: 'No detections found for this event.',
          })}
        </EuiText>
      )}

      {!isLoading && detections.length > 0 && (
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
