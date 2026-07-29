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
import { i18n } from '@kbn/i18n';
import type { UseQueryResult } from '@kbn/react-query';
import type { LifecycleDetection, EventLifecycleResponse } from '@kbn/significant-events-schema';
import { useFetchEventLifecycle } from '../hooks/use_fetch_event_lifecycle';
import { formatTimestamp } from '../format_timestamp';
import { getChangePointLabel } from '../change_point';
import { ChangePointSparkline } from './change_point_visualization';

export interface DetectionsListProps {
  eventUuid: string;
  selectedDetectionId?: string;
  onDetectionClick?: (detection: LifecycleDetection) => void;
  lifecycleQuery?: Pick<
    UseQueryResult<EventLifecycleResponse, Error>,
    'data' | 'isLoading' | 'isError' | 'refetch'
  >;
}

// Minimum width reserved for a detection card's text column. Below this, the
// fixed-size sparkline wraps onto its own line instead of being clipped.
const TEXT_CONTENT_MIN_WIDTH = '220px';

const parseTimestamp = (timestamp: string): number => {
  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

function DetectionCard({
  detection,
  isSelected = false,
  onClick,
}: {
  detection: LifecycleDetection;
  isSelected?: boolean;
  onClick?: (detection: LifecycleDetection) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const changePointLabel = getChangePointLabel(detection.change_point_type);

  const handleClick = () => {
    onClick?.(detection);
  };

  const handleKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
      return;
    }
    if (keyboardEvent.target !== keyboardEvent.currentTarget) {
      return;
    }
    keyboardEvent.preventDefault();
    onClick?.(detection);
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      data-test-subj="nightshiftDetectionCard"
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      css={css`
        background: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain};
        padding: ${euiTheme.size.m};
        ${onClick
          ? `
        cursor: pointer;
        transition: background 0.15s;

        &:hover {
          background: ${
            isSelected
              ? euiTheme.colors.backgroundBaseInteractiveSelect
              : euiTheme.colors.backgroundBaseSubdued
          };
        }

        &:focus-visible {
          outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
          outline-offset: ${euiTheme.border.width.thin};
        }
        `
          : ''}
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
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" textAlign="left">
                <strong>{detection.rule_name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" textAlign="left">
                {formatTimestamp(detection['@timestamp'])}
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
                {detection.change_point_type && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default">{changePointLabel}</EuiBadge>
                  </EuiFlexItem>
                )}
                {detection.stream_name && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{detection.stream_name}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ChangePointSparkline
            changePointType={detection.change_point_type}
            timestamp={detection['@timestamp']}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

export function DetectionsList({
  eventUuid,
  selectedDetectionId,
  onDetectionClick,
  lifecycleQuery: lifecycleQueryFromParent,
}: DetectionsListProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const internalLifecycleQuery = useFetchEventLifecycle(eventUuid, {
    enabled: !lifecycleQueryFromParent,
  });
  const lifecycleQuery = lifecycleQueryFromParent ?? internalLifecycleQuery;
  const { data, isLoading, isError, refetch } = lifecycleQuery;

  // Most recent detection first — it is the most actionable one during an incident.
  const detections = useMemo(
    () =>
      [...(data?.detections ?? [])].sort(
        (first, second) =>
          parseTimestamp(second['@timestamp']) - parseTimestamp(first['@timestamp'])
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
        <EuiPanel hasBorder hasShadow={false} paddingSize="none">
          <ol
            css={css`
              list-style: none;
              margin: 0;
              padding: 0;
            `}
          >
            {detections.map((detection, index) => (
              <li
                key={detection.detection_id}
                css={
                  index < detections.length - 1
                    ? css`
                        border-bottom: ${euiTheme.border.thin};
                      `
                    : undefined
                }
              >
                <DetectionCard
                  detection={detection}
                  isSelected={detection.detection_id === selectedDetectionId}
                  onClick={onDetectionClick}
                />
              </li>
            ))}
          </ol>
        </EuiPanel>
      )}
    </>
  );
}
