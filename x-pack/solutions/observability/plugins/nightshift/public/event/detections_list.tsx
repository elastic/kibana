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
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { UseQueryResult } from '@kbn/react-query';
import type {
  Feature,
  LifecycleDetection,
  EventLifecycleResponse,
  SignificantEvent,
} from '@kbn/significant-events-schema';
import { useFetchEventLifecycle } from '../hooks/use_fetch_event_lifecycle';
import { useFetchStreamFeaturesByStream } from '../hooks/use_fetch_stream_features';
import { useFormatTimestamp } from '../common/format_timestamp';
import {
  filterOccurrencesForDetection,
  getChangePointLabel,
  type OccurrencePoint,
} from '../detection/change_point';
import { ChangePointSparkline } from '../detection/change_point_visualization';
import { getDetectionEntities } from './get_detection_entities';
import { nightshiftBackgroundTransition } from '../common/transition';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

const SPARKLINE_SKELETON_WIDTH = 64;
const SPARKLINE_SKELETON_HEIGHT = 32;
/** Placeholder rows on first load before any lifecycle data exists. */
const INITIAL_DETECTION_SKELETON_COUNT = 2;
const MAX_VISIBLE_ENTITY_PILLS = 2;

export interface DetectionsListProps {
  event: SignificantEvent;
  eventUuid: string;
  occurrencesByRuleUuid?: ReadonlyMap<string, OccurrencePoint[]>;
  isLoadingOccurrences?: boolean;
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
  event,
  occurrences,
  streamFeatures,
  isLoadingOccurrences,
  isSelected = false,
  onClick,
}: {
  detection: LifecycleDetection;
  event: SignificantEvent;
  occurrences: OccurrencePoint[];
  streamFeatures: Feature[];
  isLoadingOccurrences: boolean;
  isSelected?: boolean;
  onClick?: (detection: LifecycleDetection) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const formatTimestamp = useFormatTimestamp();
  const changePointLabel = getChangePointLabel(detection.change_point_type);
  const entityLabels = useMemo(() => {
    const entities = getDetectionEntities(event, detection, streamFeatures);
    if (entities.length > 0) {
      return entities.map((entity) => entity.label);
    }
    return detection.stream_name ? [detection.stream_name] : [];
  }, [detection, event, streamFeatures]);
  const visibleEntityLabels = entityLabels.slice(0, MAX_VISIBLE_ENTITY_PILLS);
  const hiddenEntityCount = Math.max(entityLabels.length - visibleEntityLabels.length, 0);

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
    keyboardEvent.currentTarget.click();
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      data-test-subj="nightshiftDetectionCard"
      {...(onClick
        ? getEbtProps({
            action: isSelected
              ? NIGHTSHIFT_EBT_ACTIONS.CLOSE_FLYOUT
              : NIGHTSHIFT_EBT_ACTIONS.VIEW_DETECTION,
            element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT_DETECTIONS,
            detail: detection.change_point_type,
          })
        : {})}
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
        transition: ${nightshiftBackgroundTransition(euiTheme)};

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
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            responsive={false}
            css={css`
              row-gap: ${euiTheme.size.s};
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                direction="column"
                gutterSize="none"
                responsive={false}
                css={css`
                  row-gap: ${euiTheme.size.xxs};
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s" textAlign="left">
                    <strong>{detection.rule_name}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" textAlign="left">
                    {formatTimestamp(detection['@timestamp'])}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                gutterSize="xs"
                wrap
                responsive={false}
                alignItems="center"
                css={css`
                  row-gap: ${euiTheme.size.xs};
                `}
              >
                {detection.change_point_type && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default">{changePointLabel}</EuiBadge>
                  </EuiFlexItem>
                )}
                {visibleEntityLabels.map((label) => (
                  <EuiFlexItem grow={false} key={`${detection.detection_id}-${label}`}>
                    <EuiBadge color="hollow">{label}</EuiBadge>
                  </EuiFlexItem>
                ))}
                {hiddenEntityCount > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      {i18n.translate('xpack.nightshift.flyout.detectionEntityOverflow', {
                        defaultMessage: '+{count}',
                        values: { count: hiddenEntityCount },
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isLoadingOccurrences ? (
            <EuiSkeletonRectangle
              data-test-subj="nightshiftDetectionSparklineSkeleton"
              width={SPARKLINE_SKELETON_WIDTH}
              height={SPARKLINE_SKELETON_HEIGHT}
              borderRadius="m"
            />
          ) : (
            <ChangePointSparkline
              changePointType={detection.change_point_type}
              data={occurrences}
              timestamp={detection['@timestamp']}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

function DetectionCardSkeleton(): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      aria-hidden
      data-test-subj="nightshiftDetectionCardSkeleton"
      css={css`
        background: ${euiTheme.colors.backgroundBasePlain};
        padding: ${euiTheme.size.m};
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
              <EuiSkeletonText lines={1} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                gutterSize="xs"
                wrap
                responsive={false}
                alignItems="center"
                css={css`
                  row-gap: ${euiTheme.size.xs};
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle width={120} height={14} borderRadius="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle width={100} height={20} borderRadius="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSkeletonRectangle width={80} height={20} borderRadius="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSkeletonRectangle
            width={SPARKLINE_SKELETON_WIDTH}
            height={SPARKLINE_SKELETON_HEIGHT}
            borderRadius="m"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

function DetectionListPanel({ items }: { items: React.ReactElement[] }): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      <ol
        css={css`
          list-style: none;
          margin: 0;
          padding: 0;
        `}
      >
        {items.map((item, index) => (
          <li
            key={item.key ?? `detection-list-item-${index}`}
            css={
              index < items.length - 1
                ? css`
                    border-bottom: ${euiTheme.border.thin};
                  `
                : undefined
            }
          >
            {item}
          </li>
        ))}
      </ol>
    </EuiPanel>
  );
}

export function DetectionsList({
  event,
  eventUuid,
  occurrencesByRuleUuid,
  isLoadingOccurrences = false,
  selectedDetectionId,
  onDetectionClick,
  lifecycleQuery: lifecycleQueryFromParent,
}: DetectionsListProps): React.ReactElement {
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

  const streamNames = useMemo(
    () => [
      ...new Set(
        detections
          .map((detection) => detection.stream_name)
          .filter((streamName): streamName is string => Boolean(streamName))
      ),
    ],
    [detections]
  );
  const streamFeaturesByStream = useFetchStreamFeaturesByStream(streamNames);

  // Only skeleton on first load — keep cached cards visible during background refetch.
  const isInitialLoading = isLoading && (data?.detections?.length ?? 0) === 0;
  const showDetectionSkeletons = !isError && isInitialLoading;

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.flyout.detectionsTitle', {
            defaultMessage: 'Detections',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {isError && (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="warning"
          size="s"
          title={i18n.translate('xpack.nightshift.flyout.detectionsErrorTitle', {
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
            {i18n.translate('xpack.nightshift.flyout.detectionsRetryButtonText', {
              defaultMessage: 'Retry',
            })}
          </EuiButtonEmpty>
        </EuiCallOut>
      )}

      {showDetectionSkeletons && (
        <DetectionListPanel
          items={Array.from({ length: INITIAL_DETECTION_SKELETON_COUNT }, (_, index) => (
            <DetectionCardSkeleton key={`nightshift-detection-skeleton-${index}`} />
          ))}
        />
      )}

      {!showDetectionSkeletons && !isError && detections.length === 0 && (
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.nightshift.flyout.detectionsEmptyDescription', {
            defaultMessage: 'No detections found for this event.',
          })}
        </EuiText>
      )}

      {!showDetectionSkeletons && !isError && detections.length > 0 && (
        <DetectionListPanel
          items={detections.map((detection) => (
            <DetectionCard
              key={detection.detection_id}
              detection={detection}
              event={event}
              occurrences={filterOccurrencesForDetection(
                detection.rule_uuid ? occurrencesByRuleUuid?.get(detection.rule_uuid) ?? [] : [],
                detection['@timestamp']
              )}
              streamFeatures={streamFeaturesByStream.get(detection.stream_name ?? '') ?? []}
              isLoadingOccurrences={isLoadingOccurrences && Boolean(detection.rule_uuid)}
              isSelected={detection.detection_id === selectedDetectionId}
              onClick={onDetectionClick}
            />
          ))}
        />
      )}
    </>
  );
}
