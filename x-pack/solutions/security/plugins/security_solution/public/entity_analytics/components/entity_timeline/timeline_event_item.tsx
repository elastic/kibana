/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTimelineItem,
  useEuiTheme,
} from '@elastic/eui';
import { SEVERITY_COLOR } from '../../../common/utils/risk_color_palette';
import { RiskScoreLevel } from '../severity/common';
import { DiscussionNote, type DiscussionNoteId } from './discussion_notes';
import {
  CATEGORY_BY_KIND,
  KIND_ICONS,
  KIND_LABELS,
  formatContribution,
  formatDuration,
  formatEventTime,
  isUncased,
  type GroupingUnit,
} from './lens';
import type { AlertZeroStatus, EntityTimelineEvent, EntityTimelineLens } from './types';
import { useCategoryColors } from './use_category_colors';

const CRITICALITY_LABELS: Record<string, string> = {
  unassigned: 'Unassigned',
  low_impact: 'Low impact',
  medium_impact: 'Medium impact',
  high_impact: 'High impact',
  extreme_impact: 'Extreme impact',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  closed: 'Closed',
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export interface TimelineEventItemProps {
  event: EntityTimelineEvent;
  lens: EntityTimelineLens;
  unit: GroupingUnit;
  isZoomed: boolean;
  scoreAfter?: number;
  exclusionReason?: string;
  /** In the attack window and matching it, but not correlated by Attack discovery. */
  isOutsideAttack?: boolean;
  alertZeroStatus?: AlertZeroStatus;
  onAlertZeroDecision?: (eventId: string, status: AlertZeroStatus) => void;
  onZoomAttack?: (attackId: string) => void;
  onOpenAlert?: (event: EntityTimelineEvent) => void;
  onOpenAttack?: (attackId: string) => void;
}

const discussionNoteFor = (
  event: EntityTimelineEvent,
  lens: EntityTimelineLens,
  isOutsideAttack: boolean
): DiscussionNoteId | undefined => {
  if (isOutsideAttack) return 'notInAttack';
  if (event.kind === 'attack') return 'attackZoom';
  if (event.kind === 'alertzero' && event.watch === 'Triage') return 'alertZero';
  if (event.kind === 'alert_burst') return lens === 'risk' ? 'topInputs' : 'volume';
  if (event.id === 'burst-dcsync' || event.id === 'al-asn') return 'keyEvents';
  if (event.kind === 'resolution' && event.record === 'Okta') return 'resolution';
  if (event.kind === 'identity' && event.id === 'id-first-seen') return 'retention';
  return undefined;
};

export const TimelineEventItem: React.FC<TimelineEventItemProps> = ({
  event,
  lens,
  unit,
  isZoomed,
  scoreAfter,
  exclusionReason,
  isOutsideAttack = false,
  alertZeroStatus,
  onAlertZeroDecision,
  onOpenAlert,
  onOpenAttack,
}) => {
  const { euiTheme } = useEuiTheme();
  const categoryColors = useCategoryColors();
  const isExcluded = exclusionReason != null;
  const isKey = event.keyReason != null;
  const discussionNote = discussionNoteFor(event, lens, isOutsideAttack);
  const contribution = event.contribution ?? event.contributionDelta;
  const showContribution = contribution != null && (lens === 'risk' || event.contribution != null);
  const onOpen =
    event.kind === 'alert' && onOpenAlert
      ? () => onOpenAlert(event)
      : event.kind === 'attack' && event.attackId && onOpenAttack
      ? () => onOpenAttack(event.attackId as string)
      : undefined;
  const onCardClick = (clickEvent: React.MouseEvent<HTMLDivElement>) => {
    if ((clickEvent.target as HTMLElement).closest('button, a, [role="button"]')) return;
    onOpen?.();
  };

  const icon = (
    <EuiAvatar
      name={KIND_LABELS[event.kind]}
      size="m"
      iconType={KIND_ICONS[event.kind]}
      iconColor={
        isExcluded ? euiTheme.colors.textSubdued : categoryColors[CATEGORY_BY_KIND[event.kind]]
      }
      color={euiTheme.colors.backgroundBaseSubdued}
      css={
        isKey
          ? { boxShadow: `inset 0 0 0 ${euiTheme.border.width.thick} ${euiTheme.colors.accent}` }
          : undefined
      }
    />
  );

  return (
    <EuiTimelineItem
      icon={icon}
      verticalAlign="top"
      data-test-subj={`entityTimelineEvent-${event.id}`}
    >
      <EuiPanel
        hasBorder
        paddingSize="s"
        color={isExcluded ? 'subdued' : 'plain'}
        onClickCapture={onOpen ? onCardClick : undefined}
        css={[
          isKey && !isExcluded
            ? { borderInlineStart: `3px solid ${euiTheme.colors.accent}` }
            : isOutsideAttack
            ? { borderStyle: 'dashed', borderColor: euiTheme.colors.warning }
            : undefined,
          onOpen && {
            cursor: 'pointer',
            transition: `box-shadow ${euiTheme.animation.fast}`,
            '&:hover': {
              boxShadow: `0 0 0 ${euiTheme.border.width.thin} ${euiTheme.colors.borderStrongPrimary}`,
            },
          },
        ]}
        data-test-subj={onOpen ? `entityTimelineOpen-${event.id}` : undefined}
      >
        <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
          <EuiFlexItem>
            <EuiText size="s" color={isExcluded ? 'subdued' : undefined}>
              {onOpen ? (
                <EuiLink color="text" onClick={onOpen}>
                  <strong>{event.title}</strong>
                </EuiLink>
              ) : (
                <strong>{event.title}</strong>
              )}
            </EuiText>
          </EuiFlexItem>
          {showContribution && (
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color={isExcluded ? 'subdued' : contribution < 0 ? 'success' : 'danger'}
              >
                <strong>{formatContribution(contribution)}</strong>
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {formatEventTime(event, unit)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xs" />
        <EventBadges
          event={event}
          lens={lens}
          isZoomed={isZoomed}
          isOutsideAttack={isOutsideAttack}
          exclusionReason={exclusionReason}
          discussionNote={discussionNote}
          onOpenAttack={onOpenAttack}
        />

        {event.description && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color={isExcluded ? 'subdued' : undefined}>
              {event.description}
            </EuiText>
          </>
        )}

        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {[event.source, event.host, event.record && `${event.record} record`]
            .filter(Boolean)
            .join(' · ')}
        </EuiText>

        {isKey && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs">
              <EuiIcon
                type="starFilled"
                color={euiTheme.colors.accent}
                size="s"
                aria-hidden={true}
              />{' '}
              <strong>Key event</strong> — {event.keyReason}
            </EuiText>
          </>
        )}

        {lens === 'risk' && scoreAfter != null && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              Score after this event: <strong>{scoreAfter.toFixed(1)}</strong>
            </EuiText>
          </>
        )}

        {event.kind === 'alert_burst' && event.burstRules && (
          <>
            <EuiSpacer size="s" />
            <EuiAccordion
              id={`entityTimelineBurst-${event.id}`}
              buttonContent={
                <EuiText size="xs">{`Expand ${event.burstRules.length} rules`}</EuiText>
              }
              paddingSize="s"
            >
              <EuiDescriptionList
                compressed
                type="column"
                columnWidths={[4, 1]}
                listItems={event.burstRules.map((rule) => ({
                  title: rule.name,
                  description: `${rule.count} alerts`,
                }))}
              />
            </EuiAccordion>
          </>
        )}

        {event.kind === 'alertzero' && (
          <>
            <EuiSpacer size="s" />
            {alertZeroStatus === 'pending' ? (
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    color="primary"
                    onClick={() => onAlertZeroDecision?.(event.id, 'approved')}
                  >
                    Approve
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    color="text"
                    onClick={() => onAlertZeroDecision?.(event.id, 'rejected')}
                  >
                    Dismiss
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiBadge
                color={alertZeroStatus === 'approved' ? 'success' : 'hollow'}
                iconType={alertZeroStatus === 'approved' ? 'check' : 'cross'}
              >
                {alertZeroStatus === 'approved' ? 'Approved by you' : 'Dismissed by you'}
              </EuiBadge>
            )}
          </>
        )}
      </EuiPanel>
    </EuiTimelineItem>
  );
};

const EventBadges: React.FC<{
  event: EntityTimelineEvent;
  lens: EntityTimelineLens;
  isZoomed: boolean;
  isOutsideAttack: boolean;
  exclusionReason?: string;
  discussionNote?: DiscussionNoteId;
  onOpenAttack?: (attackId: string) => void;
}> = ({
  event,
  lens,
  isZoomed,
  isOutsideAttack,
  exclusionReason,
  discussionNote,
  onOpenAttack,
}) => {
  const badges: React.ReactNode[] = [];

  if (event.severity && event.kind !== 'anomaly') {
    const score = event.attackRiskScore ?? event.ruleScore;
    badges.push(
      <EuiBadge key="severity" color={SEVERITY_COLOR[event.severity]}>
        {score != null ? `${score} · ${capitalize(event.severity)}` : capitalize(event.severity)}
      </EuiBadge>
    );
  }
  if (event.kind === 'alert_burst' && event.alertCount) {
    badges.push(
      <EuiBadge key="count" color="hollow" iconType="aggregate">
        {`${event.alertCount} alerts`}
      </EuiBadge>
    );
  }
  if (event.kind === 'attack') {
    badges.push(
      <EuiBadge key="alerts" color="hollow">{`Correlates ${event.alertCount} alerts`}</EuiBadge>
    );
    if (event.attackStart && event.attackEnd) {
      badges.push(
        <EuiBadge key="duration" color="hollow" iconType="clock">
          {formatDuration(event.attackStart, event.attackEnd)}
        </EuiBadge>
      );
    }
  }
  if (event.mlJob && event.kind !== 'anomaly') {
    badges.push(
      <EuiBadge key="ml" color="hollow" iconType="machineLearningApp">
        ML
      </EuiBadge>
    );
  }
  if (event.kind === 'anomaly' && event.anomalyScore != null) {
    badges.push(
      <EuiBadge key="anomaly" color="hollow" iconType="machineLearningApp">
        {`Anomaly score ${event.anomalyScore}`}
      </EuiBadge>
    );
  }
  if (event.kind === 'risk_level' && event.riskFrom && event.riskTo) {
    badges.push(
      <EuiFlexGroup key="risk" gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <RiskScoreLevel severity={event.riskFrom.level} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{`${event.riskFrom.score} →`}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RiskScoreLevel severity={event.riskTo.level} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{event.riskTo.score}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  if (event.kind === 'criticality' && event.criticalityTo) {
    badges.push(
      <EuiBadge key="criticality" color="hollow" iconType="flag">
        {`${CRITICALITY_LABELS[event.criticalityFrom ?? 'unassigned']} → ${
          CRITICALITY_LABELS[event.criticalityTo]
        }`}
      </EuiBadge>
    );
  }
  if (event.kind === 'watchlist' && event.watchlist) {
    badges.push(
      <EuiBadge key="watchlist" color="hollow" iconType="eye">
        {event.watchlist}
      </EuiBadge>
    );
  }
  if (event.kind === 'alertzero' && event.watch) {
    badges.push(
      <EuiBadge key="watch" color="accent" iconType="sparkles">
        {`${event.watch} Watch`}
      </EuiBadge>
    );
  }
  if (event.status && (event.kind === 'alert' || event.kind === 'alert_burst')) {
    badges.push(
      <EuiBadge key="status" color="hollow">
        {STATUS_LABELS[event.status]}
      </EuiBadge>
    );
  }
  if (isUncased(event)) {
    badges.push(
      <EuiBadge key="uncased" color="warning">
        Uncased
      </EuiBadge>
    );
  }
  if (event.caseId && event.kind !== 'case') {
    badges.push(
      <EuiBadge
        key="case"
        color="hollow"
        iconType="casesApp"
        onClick={() => {}}
        onClickAriaLabel={`Open ${event.caseId}`}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} component="span">
          <EuiFlexItem grow={false} component="span">
            {event.caseId}
          </EuiFlexItem>
          <EuiFlexItem grow={false} component="span">
            <EuiIcon type="external" size="s" aria-hidden={true} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    );
  }
  if (event.attackId && !isZoomed && event.kind !== 'attack' && event.kind !== 'case') {
    badges.push(
      <EuiBadge
        key="attack"
        color="hollow"
        iconType="securitySignalDetected"
        onClick={() => onOpenAttack?.(event.attackId as string)}
        onClickAriaLabel="Open attack details"
      >
        In attack
      </EuiBadge>
    );
  }
  if (isOutsideAttack) {
    badges.push(
      <EuiBadge key="outside" color="warning" iconType="securitySignalDetected">
        Not in this attack
      </EuiBadge>
    );
  }
  if (event.contribution != null && lens === 'full') {
    badges.push(
      <EuiBadge key="contributes" color="hollow" iconType="visLine">
        Counts toward risk
      </EuiBadge>
    );
  }
  if (exclusionReason) {
    badges.push(
      <EuiBadge key="excluded" color="default" iconType="minus">
        {`Doesn’t count: ${exclusionReason}`}
      </EuiBadge>
    );
  }
  if (discussionNote) {
    badges.push(<DiscussionNote key="discuss" id={discussionNote} />);
  }

  if (badges.length === 0) return null;
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
      {badges.map((badge, index) => (
        <EuiFlexItem key={index} grow={false}>
          {badge}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
