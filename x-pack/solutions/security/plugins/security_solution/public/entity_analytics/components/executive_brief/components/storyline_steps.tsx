/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTimeline,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiTimelineItemProps } from '@elastic/eui';
import { MAX_STORYLINE_EVENTS } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefSnapshot,
  StoryEvent,
  StoryEventType,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { BRIEF_CUT_ATTRIBUTE } from '../constants';
import { getTacticName } from '../utils/resolve_evidence';
import { useIsPrintMode } from './brief_context';
import { EvidenceChip } from './evidence_chip';

/**
 * Collapsed timelines keep how it started and where it stands now; the middle is summarised by the
 * attack stages in the card header. Print and PDF always show every event.
 */
export const PREVIEW_HEAD_COUNT = 2;
export const PREVIEW_TAIL_COUNT = 2;

export const EVENT_ICON: Record<StoryEventType, { iconType: string; color: EventColor }> = {
  alert_first: { iconType: 'warning', color: 'warning' },
  risk_jump: { iconType: 'sortUp', color: 'risk' },
  relationship_first_seen: { iconType: 'link', color: 'primary' },
  ad_generated: { iconType: 'sparkles', color: 'accent' },
  lead_created: { iconType: 'search', color: 'primary' },
  case_opened: { iconType: 'casesApp', color: 'success' },
  case_status: { iconType: 'casesApp', color: 'success' },
  alerts_closed: { iconType: 'checkCircleFill', color: 'success' },
};

type EventColor = 'warning' | 'risk' | 'primary' | 'accent' | 'success';

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}Z`;
};

/** EuiTimeline of the storyline's events: first and latest events with an expandable gap; capped server-side with a "+N more" note. */
export const StorylineSteps: React.FC<{ storyline: Storyline; snapshot: BriefSnapshot }> = ({
  storyline,
  snapshot,
}) => {
  const { euiTheme } = useEuiTheme();
  const isPrintMode = useIsPrintMode();
  const [showAll, setShowAll] = useState(false);
  const allEvents = storyline.events.slice(0, MAX_STORYLINE_EVENTS);
  // Hiding a single event saves nothing, so only truncate when at least two would be hidden.
  const isLong = allEvents.length > PREVIEW_HEAD_COUNT + PREVIEW_TAIL_COUNT + 1;
  const isTruncated = isLong && !isPrintMode && !showAll;
  const hiddenCount = isTruncated ? allEvents.length - PREVIEW_HEAD_COUNT - PREVIEW_TAIL_COUNT : 0;
  const canCollapse = isLong && !isPrintMode && showAll;
  const isSevere = storyline.severity === 'critical' || storyline.severity === 'high';
  const colorOf = (type: StoryEventType, color: EventColor): string => {
    if (type === 'alert_first' && isSevere) return euiTheme.colors.danger;
    const { colors } = euiTheme;
    return {
      warning: colors.warning,
      risk: colors.severity.risk,
      primary: colors.primary,
      accent: colors.accent,
      success: colors.success,
    }[color];
  };

  const toItem = (event: StoryEvent, eventIndex: number): EuiTimelineItemProps => ({
    icon: (
      <EuiAvatar
        name={event.type.replace(/_/g, ' ')}
        iconType={EVENT_ICON[event.type].iconType}
        iconColor={colorOf(event.type, EVENT_ICON[event.type].color)}
        color="plain"
        size="m"
        data-test-subj={`executiveBriefEventIcon-${event.type}`}
      />
    ),
    iconAriaLabel: event.type.replace(/_/g, ' '),
    verticalAlign: 'top',
    children: (
      <div {...(eventIndex > 0 ? { [BRIEF_CUT_ATTRIBUTE]: '' } : {})}>
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
      </div>
    ),
  });

  const gapItem: EuiTimelineItemProps = {
    icon: <EuiAvatar name="More events" iconType="boxesVertical" color="subdued" size="m" />,
    iconAriaLabel: 'More events',
    verticalAlign: 'center',
    children: (
      <EuiButtonEmpty
        size="xs"
        flush="left"
        onClick={() => setShowAll(true)}
        data-test-subj="executiveBriefStepsShowAll"
      >
        {`Show ${hiddenCount} more ${hiddenCount === 1 ? 'event' : 'events'}`}
      </EuiButtonEmpty>
    ),
  };

  const items: EuiTimelineItemProps[] = isTruncated
    ? [
        ...allEvents.slice(0, PREVIEW_HEAD_COUNT).map(toItem),
        gapItem,
        ...allEvents
          .slice(-PREVIEW_TAIL_COUNT)
          .map((event, index) => toItem(event, PREVIEW_HEAD_COUNT + index)),
      ]
    : allEvents.map(toItem);

  return (
    <div data-test-subj="executiveBriefSteps">
      <EuiTimeline items={items} />
      {canCollapse && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="chevronSingleUp"
          onClick={() => setShowAll(false)}
          data-test-subj="executiveBriefStepsShowFewer"
        >
          {'Show fewer events'}
        </EuiButtonEmpty>
      )}
      {!isTruncated && storyline.eventsTruncated > 0 && (
        <EuiText size="xs" color="subdued" data-test-subj="executiveBriefStepsMore">
          {`+${storyline.eventsTruncated} more`}
        </EuiText>
      )}
    </div>
  );
};
