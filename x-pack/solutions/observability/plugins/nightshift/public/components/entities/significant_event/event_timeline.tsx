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
import { TruncatableSummary } from '../../../common/truncatable_summary';
import { SIGNIFICANT_EVENT_STATUS_ICONS } from './significant_event_status';

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

type TimelineVersion = Pick<
  SignificantEventResponse,
  '@timestamp' | 'status' | 'title' | 'assessment_note' | 'episode_id'
>;

interface StatusTransition {
  kind: 'inactive' | 'reopened';
  at: string;
  title: string;
  /** True when an operator deactivated it, false when the engine or the agent closed it. */
  byOperator: boolean;
  note?: string;
}

/**
 * The moments the event went inactive and came back, read from its stored versions. A reopened
 * event is a new episode of the same event, so its versions alone say it happened.
 *
 * When a deactivation record exists for the closing version's episode, an operator closed it: the
 * note is that record's reason (none when empty), never the version's own note, because the
 * version an operator's deactivation writes only copies the previous note. Without a matching
 * record the engine or the agent closed it, and the version's own note is kept when it differs
 * from the previous version's.
 */
export const getStatusTransitions = ({
  versions,
  deactivations = [],
}: {
  versions: readonly TimelineVersion[];
  deactivations?: EventLifecycleResponse['deactivations'];
}): StatusTransition[] => {
  const ordered = [...versions].sort(
    (first, second) => Date.parse(first['@timestamp']) - Date.parse(second['@timestamp'])
  );
  return ordered.flatMap((version, index): StatusTransition[] => {
    const previous = ordered[index - 1];
    if (previous === undefined) return [];
    const { title } = version;
    const at = version['@timestamp'];
    if (version.status !== 'inactive' && previous.status === 'inactive') {
      return [{ kind: 'reopened', at, title, byOperator: false }];
    }
    if (version.status === 'inactive' && previous.status !== 'inactive') {
      const deactivation = deactivations.find(
        ({ episode_id: episodeId }) => episodeId === version.episode_id
      );
      if (deactivation !== undefined) {
        return [
          { kind: 'inactive', at, title, byOperator: true, note: deactivation.reason || undefined },
        ];
      }
      const ownNote =
        version.assessment_note !== previous.assessment_note ? version.assessment_note : undefined;
      return [{ kind: 'inactive', at, title, byOperator: false, note: ownNote }];
    }
    return [];
  });
};

/** A closing note longer than this is cut, with a toggle for the rest, so the timeline stays compact. */
const NOTE_MAX_LENGTH = 140;

const DEACTIVATED_LABEL = i18n.translate('xpack.nightshift.flyout.timelineDeactivatedLabel', {
  defaultMessage: 'Significant event deactivated',
});

const CLOSED_LABEL = i18n.translate('xpack.nightshift.flyout.timelineClosedLabel', {
  defaultMessage: 'Significant event closed',
});

const REOPENED_LABEL = i18n.translate('xpack.nightshift.flyout.timelineReopenedLabel', {
  defaultMessage: 'Significant event reopened',
});

const getTransitionLabel = ({ kind, byOperator }: StatusTransition): string => {
  if (kind === 'reopened') return REOPENED_LABEL;
  return byOperator ? DEACTIVATED_LABEL : CLOSED_LABEL;
};

const TRANSITION_ICONS: Record<StatusTransition['kind'], string> = {
  inactive: SIGNIFICANT_EVENT_STATUS_ICONS.inactive.iconType,
  reopened: 'refresh',
};

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

  const raisedAt = event.created_at ?? event['@timestamp'];
  // `event` is the latest version; a reopened event can have a new title, but it was raised under
  // the title of its first version.
  const [firstVersion] = [...data.events].sort(
    (first, second) => Date.parse(first['@timestamp']) - Date.parse(second['@timestamp'])
  );
  const raisedTitle = firstVersion?.title ?? event.title;
  const raisedTime = Date.parse(raisedAt);
  const sortedDetections = [...data.detections].sort(
    (first, second) => Date.parse(first['@timestamp']) - Date.parse(second['@timestamp'])
  );
  const toDetectionItem = (detection: (typeof sortedDetections)[number]): EuiTimelineItemProps => ({
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
  });
  const toTransitionItem = (transition: StatusTransition, index: number): EuiTimelineItemProps => {
    const { kind, at, title, note } = transition;
    return {
      icon: TRANSITION_ICONS[kind],
      verticalAlign: 'top',
      children: (
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s" data-test-subj={`nightshiftEventTimeline-${kind}-${index}`}>
              {kind === 'reopened' ? (
                <EuiLink
                  data-test-subj={`nightshiftEventTimelineReopenedLink-${index}`}
                  onClick={onEventClick}
                >
                  {title}
                </EuiLink>
              ) : (
                title
              )}
            </EuiText>
            <EuiText size="xs" color="subdued">
              {getTransitionLabel(transition)}
            </EuiText>
            {note ? (
              <TruncatableSummary
                summary={note}
                maxLength={NOTE_MAX_LENGTH}
                textSize="xs"
                testSubj={`nightshiftEventTimelineNote-${kind}-${index}`}
                toggleTestSubj={`nightshiftEventTimelineNoteToggle-${kind}-${index}`}
              />
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <time dateTime={at}>{formatTimelineTime(at)}</time>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  };
  const raisedItem: EuiTimelineItemProps = {
    icon: 'significantEvents',
    verticalAlign: 'top',
    children: (
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <EuiLink data-test-subj="nightshiftEventTimelineLink" onClick={onEventClick}>
              {raisedTitle}
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
  };

  const leadingDetections = sortedDetections.filter(
    (detection) => Date.parse(detection['@timestamp']) <= raisedTime
  );
  const laterDetections = sortedDetections.filter(
    (detection) => Date.parse(detection['@timestamp']) > raisedTime
  );
  const transitions = getStatusTransitions({
    versions: data.events,
    deactivations: data.deactivations,
  });
  const afterRaised = [
    ...laterDetections.map((detection) => ({
      time: Date.parse(detection['@timestamp']),
      item: toDetectionItem(detection),
    })),
    ...transitions.map((transition, index) => ({
      time: Date.parse(transition.at),
      item: toTransitionItem(transition, index),
    })),
  ]
    .map((entry, order) => ({ ...entry, order }))
    .sort((first, second) => first.time - second.time || first.order - second.order);

  const items: EuiTimelineItemProps[] = [
    ...leadingDetections.map(toDetectionItem),
    raisedItem,
    ...afterRaised.map(({ item }) => item),
  ];

  return <EuiTimeline items={items} gutterSize="l" />;
};
