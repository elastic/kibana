/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTimeline } from '@elastic/eui';
import type { EuiTimelineItemProps } from '@elastic/eui';
import { MAX_STORYLINE_EVENTS } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefSnapshot,
  StoryEventType,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { getTacticName } from '../utils/resolve_evidence';
import { EvidenceChip } from './evidence_chip';

const ICON_BY_EVENT: Record<StoryEventType, string> = {
  alert_first: 'securitySignal',
  ad_generated: 'bolt',
  lead_created: 'lightbulb',
  risk_jump: 'sortUp',
  relationship_first_seen: 'push',
  case_opened: 'casesApp',
  case_status: 'casesApp',
  alerts_closed: 'checkInCircleFilled',
};

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}Z`;
};

/** EuiTimeline of the storyline's events (capped, with a "+N more" note). */
export const StorylineSteps: React.FC<{ storyline: Storyline; snapshot: BriefSnapshot }> = ({
  storyline,
  snapshot,
}) => {
  const events = storyline.events.slice(0, MAX_STORYLINE_EVENTS);

  const items: EuiTimelineItemProps[] = events.map((event) => ({
    icon: ICON_BY_EVENT[event.type],
    iconAriaLabel: event.type,
    verticalAlign: 'top',
    children: (
      <EuiPanel
        paddingSize="s"
        hasBorder
        data-test-subj={`executiveBriefEvent-${event.evidenceId}`}
      >
        <EuiText size="xs" color="subdued">
          {formatTime(event.at)}{' '}
          {event.tacticId && (
            <EuiBadge color="hollow">{getTacticName(snapshot, event.tacticId)}</EuiBadge>
          )}
        </EuiText>
        <EuiText size="s">{event.summary}</EuiText>
        {event.sourceEvidenceIds.length > 0 && (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {event.sourceEvidenceIds.map((id) => (
              <EuiFlexItem grow={false} key={id}>
                <EvidenceChip id={id} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiPanel>
    ),
  }));

  return (
    <div data-test-subj="executiveBriefSteps">
      <EuiTimeline items={items} />
      {storyline.eventsTruncated > 0 && (
        <EuiText size="xs" color="subdued" data-test-subj="executiveBriefStepsMore">
          {`+${storyline.eventsTruncated} more`}
        </EuiText>
      )}
    </div>
  );
};
