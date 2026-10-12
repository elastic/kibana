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
import type {
  Fact,
  FactKind,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { useBriefActions } from '../actions/brief_actions_context';
import { FactEvidenceChip } from './evidence_chip';
import { getFactTactics } from './resolve';

/**
 * Collapsed timelines keep how it started and where it stands now; the middle sits behind a gap
 * item. Without actions (print layouts) every event is shown.
 */
export const PREVIEW_HEAD_COUNT = 2;
export const PREVIEW_TAIL_COUNT = 2;

type EventColor = 'warning' | 'risk' | 'primary' | 'accent' | 'success';

export const FACT_ICON: Record<FactKind, { iconType: string; color: EventColor }> = {
  attack_discovery: { iconType: 'sparkles', color: 'accent' },
  alert_activity: { iconType: 'warning', color: 'warning' },
  high_risk_entity: { iconType: 'flag', color: 'risk' },
  alert_response: { iconType: 'checkCircleFill', color: 'success' },
  case: { iconType: 'casesApp', color: 'success' },
  relationship_first_seen: { iconType: 'link', color: 'primary' },
  risk_jump: { iconType: 'sortUp', color: 'risk' },
  lead: { iconType: 'search', color: 'primary' },
};

const SHOW_FEWER = 'Show fewer events';
const MORE_EVENTS = 'More events';
const showMoreLabel = (count: number): string =>
  `Show ${count} more ${count === 1 ? 'event' : 'events'}`;

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}Z`;
};

const humaniseKind = (kind: FactKind): string => kind.replace(/_/g, ' ');

interface FactTimelineProps {
  /** Facts in the order to show them (time order). */
  facts: readonly Fact[];
}

/** EuiTimeline of facts: first and latest events with an expandable gap between them. */
export const FactTimeline: React.FC<FactTimelineProps> = ({ facts }) => {
  const { euiTheme } = useEuiTheme();
  const actions = useBriefActions();
  const canToggle = Boolean(actions);
  const [showAll, setShowAll] = useState(false);

  // Hiding a single event saves nothing, so only truncate when at least two would be hidden.
  const isLong = facts.length > PREVIEW_HEAD_COUNT + PREVIEW_TAIL_COUNT + 1;
  const isTruncated = isLong && canToggle && !showAll;
  const hiddenCount = isTruncated ? facts.length - PREVIEW_HEAD_COUNT - PREVIEW_TAIL_COUNT : 0;
  const canCollapse = isLong && canToggle && showAll;

  const colorOf = (fact: Fact, color: EventColor): string => {
    const { colors } = euiTheme;
    if (
      fact.kind === 'alert_activity' &&
      (fact.severity === 'critical' || fact.severity === 'high')
    ) {
      return colors.danger;
    }
    return {
      warning: colors.warning,
      risk: colors.severity.risk,
      primary: colors.primary,
      accent: colors.accent,
      success: colors.success,
    }[color];
  };

  const toItem = (fact: Fact): EuiTimelineItemProps => {
    const { iconType, color } = FACT_ICON[fact.kind];
    const tactics = getFactTactics(fact);
    const hasActionableSource = fact.source?.type === 'case' || fact.source?.type === 'rule';
    return {
      icon: (
        <EuiAvatar
          name={humaniseKind(fact.kind)}
          iconType={iconType}
          iconColor={colorOf(fact, color)}
          color="plain"
          size="m"
          data-test-subj={`executiveBriefEventIcon-${fact.kind}`}
        />
      ),
      iconAriaLabel: humaniseKind(fact.kind),
      verticalAlign: 'top',
      children: (
        <EuiPanel paddingSize="s" hasBorder data-test-subj={`executiveBriefEvent-${fact.id}`}>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            {fact.at && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="executiveBriefEventTime">
                  {formatTime(fact.at)}
                </EuiText>
              </EuiFlexItem>
            )}
            {tactics.map((tactic) => (
              <EuiFlexItem grow={false} key={tactic}>
                <EuiBadge color="hollow">{tactic}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiText size="s">
            {hasActionableSource ? <FactEvidenceChip fact={fact} /> : fact.title}
          </EuiText>
        </EuiPanel>
      ),
    };
  };

  const gapItem: EuiTimelineItemProps = {
    icon: <EuiAvatar name={MORE_EVENTS} iconType="boxesVertical" color="subdued" size="m" />,
    iconAriaLabel: MORE_EVENTS,
    verticalAlign: 'center',
    children: (
      <EuiButtonEmpty
        size="xs"
        flush="left"
        onClick={() => setShowAll(true)}
        data-test-subj="executiveBriefStepsShowAll"
      >
        {showMoreLabel(hiddenCount)}
      </EuiButtonEmpty>
    ),
  };

  const items: EuiTimelineItemProps[] = isTruncated
    ? [
        ...facts.slice(0, PREVIEW_HEAD_COUNT).map(toItem),
        gapItem,
        ...facts.slice(-PREVIEW_TAIL_COUNT).map(toItem),
      ]
    : facts.map(toItem);

  if (facts.length === 0) return null;

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
          {SHOW_FEWER}
        </EuiButtonEmpty>
      )}
    </div>
  );
};
