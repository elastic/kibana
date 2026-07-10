/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

function DetectionCard({ detection }: { detection: LifecycleDetection }) {
  const changePointLabel = getChangePointLabel(detection.change_point_type);
  const changePointColor = getChangePointColor(detection.change_point_type);

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
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
