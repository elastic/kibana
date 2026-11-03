/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSkeletonText,
  EuiText,
  EuiTimeline,
  type EuiTimelineItemProps,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { UseQueryResult } from '@kbn/react-query';
import type {
  EventLifecycleResponse,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { formatTimelineTime } from '../../../common/format_timestamp';
import { getChangePointLabel } from '../../../common/change_point';

interface EventTimelineProps {
  event: SignificantEventResponse;
  lifecycleQuery: Pick<
    UseQueryResult<EventLifecycleResponse, Error>,
    'data' | 'isLoading' | 'isError'
  >;
  selectedDetectionId?: string;
  onDetectionClick: (detectionId: string) => void;
  onEventClick: () => void;
}

export const EventTimeline = ({
  event,
  lifecycleQuery: { data, isLoading, isError },
  selectedDetectionId,
  onDetectionClick,
  onEventClick,
}: EventTimelineProps): React.ReactElement => {
  if (isError) {
    return (
      <KbnDangerCallout
        announceOnMount
        size="s"
        title={i18n.translate('xpack.nightshift.flyout.timelineErrorTitle', {
          defaultMessage: 'Unable to load timeline',
        })}
      />
    );
  }
  if (isLoading && !data) {
    return <EuiSkeletonText lines={3} />;
  }
  if (!data) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.nightshift.flyout.timelineEmptyDescription', {
          defaultMessage: 'No lifecycle activity yet.',
        })}
      </EuiText>
    );
  }

  const items: EuiTimelineItemProps[] = [...data.detections]
    .sort((first, second) => Date.parse(first['@timestamp']) - Date.parse(second['@timestamp']))
    .map((detection) => ({
      icon: 'visLine',
      verticalAlign: 'top',
      children: (
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s">
              <EuiLink
                data-test-subj="nightshiftEventTimelineDetectionLink"
                onClick={() => onDetectionClick(detection.detection_id)}
                {...getEbtProps({
                  action:
                    selectedDetectionId === detection.detection_id
                      ? NIGHTSHIFT_EBT_ACTIONS.CLOSE_FLYOUT
                      : NIGHTSHIFT_EBT_ACTIONS.VIEW_DETECTION,
                  element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT_DETECTIONS,
                  detail: detection.change_point_type,
                })}
              >
                {detection.rule_name}
              </EuiLink>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {getChangePointLabel(detection.change_point_type)}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <time dateTime={detection['@timestamp']}>
                {formatTimelineTime(detection['@timestamp'])}
              </time>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    }));
  const raisedAt = event.created_at ?? event['@timestamp'];
  items.push({
    icon: 'significantEvents',
    verticalAlign: 'top',
    children: (
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <EuiLink data-test-subj="nightshiftEventTimelineLink" onClick={onEventClick}>
              {event.title}
            </EuiLink>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.nightshift.flyout.timelineRaisedLabel', {
              defaultMessage: 'Significant event raised',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <time dateTime={raisedAt}>{formatTimelineTime(raisedAt)}</time>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  });

  return <EuiTimeline items={items} gutterSize="l" />;
};
