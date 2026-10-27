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
import { SIGNIFICANT_EVENT_SEVERITY } from '../../ui/severity_badge';
import { getStatusColor, SIGNIFICANT_EVENT_STATUS_LABELS } from './significant_event_status';

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

const RevisionDetails = ({
  revision,
}: {
  revision: SignificantEventResponse;
}): React.ReactElement => (
  <>
    {revision.severity ? (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.nightshift.flyout.timelineSeverityLabel', {
          defaultMessage: 'Severity: {severity}',
          values: { severity: SIGNIFICANT_EVENT_SEVERITY[revision.severity].label },
        })}
      </EuiText>
    ) : null}
    {revision.assessment_note ? (
      <EuiText size="xs" color="subdued">
        {revision.assessment_note}
      </EuiText>
    ) : null}
    {revision.workflow_execution_id ? (
      <EuiText size="xs" color="subdued" data-test-subj="nightshiftEventTimelineWorkflow">
        {i18n.translate('xpack.nightshift.flyout.timelineCreatedByWorkflow', {
          defaultMessage: 'Created by workflow: {id}',
          values: { id: revision.workflow_execution_id },
        })}
      </EuiText>
    ) : null}
  </>
);

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

  const revisions = [...data.events].sort(
    (first, second) => Date.parse(first['@timestamp']) - Date.parse(second['@timestamp'])
  );
  const items: Array<{ timestamp: string; item: EuiTimelineItemProps }> = data.detections.map(
    (detection) => ({
      timestamp: detection['@timestamp'],
      item: {
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
      },
    })
  );
  const raisedRevision = revisions[0];
  const raisedAt = raisedRevision?.['@timestamp'] ?? event.created_at ?? event['@timestamp'];
  items.push({
    timestamp: raisedAt,
    item: {
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
            {raisedRevision ? <RevisionDetails revision={raisedRevision} /> : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <time dateTime={raisedAt}>{formatTimelineTime(raisedAt)}</time>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  });
  items.push(
    ...revisions.slice(1).map((revision) => ({
      timestamp: revision['@timestamp'],
      item: {
        icon: 'pencil',
        verticalAlign: 'top' as const,
        children: (
          <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem>
              <EuiBadge color={getStatusColor(revision.status)}>
                {SIGNIFICANT_EVENT_STATUS_LABELS[revision.status]}
              </EuiBadge>
              <RevisionDetails revision={revision} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <time dateTime={revision['@timestamp']}>
                  {formatTimelineTime(revision['@timestamp'])}
                </time>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    }))
  );

  items.sort((first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp));

  return <EuiTimeline items={items.map(({ item }) => item)} gutterSize="l" />;
};
