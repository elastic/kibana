/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import { getAlertSeverityColor } from './common';
import { SectionLabel } from './components';
import type { GraphEntityKind, TimeRangePreset } from './graph_state';
import { timelineStepEntrance } from './animations';
import { useEntityTimeline } from './hooks/use_entity_timeline';
import type { ActivityKind } from './event_context';
import { groupTimelineSteps } from './timeline_model';
import type {
  SignificanceReason,
  TimelineGroup,
  TimelineModel,
  TimelineStep,
} from './timeline_model';

const STEP_INDENT_PX = 16;
const VISUAL_MAX_DEPTH = 3;
const DEFAULT_VISIBLE_GROUPS = 3;

/**
 * The entity a timeline step is "about" — used to cross-highlight and focus the
 * matching node in the relationship graph. Falls back to host, then user.
 */
export interface TimelineEntityRef {
  kind: GraphEntityKind;
  name: string;
}

/** EUI icon for each raw-event category (mirrors the graph's activity icons). */
const categoryIcon = (category: ActivityKind | undefined): string => {
  switch (category) {
    case 'network':
      return 'globe';
    case 'authentication':
      return 'user';
    case 'process':
      return 'commandLine';
    case 'file':
      return 'document';
    default:
      return 'alert';
  }
};

const reasonLabel = (reason: SignificanceReason): string => {
  switch (reason) {
    case 'alert-correlated':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineReasonAlert',
        { defaultMessage: 'Near an alert' }
      );
    case 'auth-logon':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineReasonAuth',
        { defaultMessage: 'Logon' }
      );
    case 'notable-process':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineReasonProcess',
        { defaultMessage: 'Notable process' }
      );
    case 'outbound-network':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineReasonNetwork',
        { defaultMessage: 'Outbound to new destination' }
      );
    case 'sensitive-file':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineReasonFile',
        { defaultMessage: 'Sensitive file' }
      );
  }
};

export interface EntityTimelineProps {
  entity: IntelligenceEntity;
  timeRange: TimeRangePreset;
  /** Called when a step is activated so the host can open its evidence. */
  onStepSelect?: (step: TimelineStep) => void;
  /** Currently selected step id (for highlight sync with the evidence drawer). */
  selectedStepId?: string;
  /** Hovering / leaving a step; emits the entity it involves (or undefined). */
  onStepHighlight?: (ref: TimelineEntityRef | undefined) => void;
  /** Clicking a step's focus affordance; asks the graph to focus that node. */
  onStepFocus?: (ref: TimelineEntityRef) => void;
  /** Opens the underlying raw document for a step (raw `_source` / Discover). */
  onStepViewRaw?: (step: TimelineStep) => void;
  /** Externally highlighted entity key (`<kind>:<name>`) from the graph side. */
  highlightedEntityKey?: string;
  /** Wide/expanded presentation with more breathing room and metadata. */
  expanded?: boolean;
  /** Reports the current timeline model up (for the panel's AI explain context). */
  onModelChange?: (model: TimelineModel) => void;
}

/** Stable `<kind>:<name>` key matching the graph's entity node ids. */
export const entityRefKey = (ref: TimelineEntityRef): string => `${ref.kind}:${ref.name}`;

/**
 * The entity node a step maps to in the graph. Host steps map to the host node;
 * otherwise the user node. IPs are not first-class step entities here.
 */
export const stepEntityRef = (
  step: TimelineStep,
  focus: IntelligenceEntity
): TimelineEntityRef | undefined => {
  if (focus.type === EntityType.host && step.host) {
    return { kind: EntityType.host, name: step.host };
  }
  if (step.user) return { kind: EntityType.user, name: step.user };
  if (step.host) return { kind: EntityType.host, name: step.host };
  return undefined;
};

interface TimelineStepRowProps {
  step: TimelineStep;
  index: number;
  isSelected: boolean;
  isHighlighted: boolean;
  interactive: boolean;
  onSelect: (step: TimelineStep) => void;
  onHoverRef: (ref: TimelineEntityRef | undefined) => void;
  onFocusRef: ((ref: TimelineEntityRef) => void) | undefined;
  onViewRaw: ((step: TimelineStep) => void) | undefined;
  entityRef: TimelineEntityRef | undefined;
}

/**
 * One step on the vertical time-rail: a marker dot + connector on the rail, the
 * absolute + relative time, a severity-accented card with a category icon,
 * human label, concrete detail, alert-linkage / reason badges, and per-step
 * "focus in graph" + "view raw" actions.
 */
const TimelineStepRow: React.FC<TimelineStepRowProps> = ({
  step,
  index,
  isSelected,
  isHighlighted,
  interactive,
  onSelect,
  onHoverRef,
  onFocusRef,
  onViewRaw,
  entityRef,
}) => {
  const { euiTheme } = useEuiTheme();
  const accent = step.severity
    ? getAlertSeverityColor(euiTheme, step.severity)
    : euiTheme.colors.borderBasePlain;
  const iconAccent = step.severity
    ? getAlertSeverityColor(euiTheme, step.severity)
    : euiTheme.colors.textSubdued;
  const visualDepth = Math.min(step.depth, VISUAL_MAX_DEPTH);

  const rowStyle = css`
    position: relative;
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: ${euiTheme.size.s};
    padding-left: ${visualDepth * STEP_INDENT_PX}px;
  `;

  const railStyle = css`
    position: relative;
    display: flex;
    justify-content: center;
    /* Vertical rail line running through the marker. */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      width: ${euiTheme.border.width.thin};
      background: ${euiTheme.colors.borderBasePlain};
    }
  `;

  const markerStyle = css`
    position: relative;
    z-index: 1;
    width: 12px;
    height: 12px;
    margin-top: 6px;
    border-radius: 50%;
    background: ${step.kind === 'alert' ? accent : euiTheme.colors.backgroundBasePlain};
    border: ${euiTheme.border.width.thick} solid ${accent};
    box-shadow: 0 0 0 3px ${transparentize(accent, isHighlighted ? 0.35 : 0)};
    transition: box-shadow ${euiTheme.animation.fast} ease;
  `;

  const cardStyle = css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: ${euiTheme.size.s};
    border: ${euiTheme.border.thin};
    border-left: ${euiTheme.border.width.thick} solid ${accent};
    border-radius: ${euiTheme.border.radius.small};
    background: ${isSelected
      ? transparentize(euiTheme.colors.primary, 0.1)
      : isHighlighted
      ? transparentize(euiTheme.colors.primary, 0.06)
      : euiTheme.colors.backgroundBaseSubdued};
    cursor: ${interactive ? 'pointer' : 'default'};
    transition: background-color ${euiTheme.animation.fast} ease,
      border-color ${euiTheme.animation.fast} ease, transform ${euiTheme.animation.fast} ease;

    &:hover {
      background: ${transparentize(euiTheme.colors.primary, 0.08)};
      transform: translateY(-1px);
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
      &:hover {
        transform: none;
      }
    }
  `;

  const labelStyle = css`
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textParagraph};
    overflow-wrap: anywhere;
  `;

  return (
    <div
      css={[rowStyle, timelineStepEntrance(index)]}
      onMouseEnter={() => onHoverRef(entityRef)}
      onMouseLeave={() => onHoverRef(undefined)}
      data-test-subj={`timelineStep-${step.kind}`}
    >
      <div css={railStyle}>
        <span css={markerStyle}>
          <EuiIcon
            type={step.kind === 'alert' ? 'warning' : categoryIcon(step.category)}
            size="s"
            color={step.kind === 'alert' ? euiTheme.colors.emptyShade : iconAccent}
            css={css`
              position: absolute;
              inset: 50% auto auto 50%;
              transform: translate(-50%, -50%) scale(0.62);
            `}
            aria-hidden={true}
          />
        </span>
      </div>
      <div
        css={cardStyle}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? () => onSelect(step) : undefined}
        onKeyDown={
          interactive
            ? (eventKey) => {
                if (eventKey.key === 'Enter' || eventKey.key === ' ') {
                  eventKey.preventDefault();
                  onSelect(step);
                }
              }
            : undefined
        }
      >
        <div
          css={css`
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: ${euiTheme.size.s};
          `}
        >
          <EuiToolTip position="top" content={step.label}>
            <span tabIndex={0} css={labelStyle}>
              {step.label}
            </span>
          </EuiToolTip>
          <EuiToolTip
            position="left"
            content={<PreferenceFormattedDate value={new Date(step.timestamp)} />}
          >
            <span
              tabIndex={0}
              css={css`
                flex-shrink: 0;
                font-size: 11px;
                color: ${euiTheme.colors.textSubdued};
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
              `}
            >
              <FormattedRelative value={new Date(step.timestamp)} />
            </span>
          </EuiToolTip>
        </div>
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            font-variant-numeric: tabular-nums;
          `}
        >
          <PreferenceFormattedDate value={new Date(step.timestamp)} />
        </EuiText>
        {step.detail ? (
          <EuiText size="xs" color="subdued">
            <span
              css={css`
                overflow-wrap: anywhere;
              `}
            >
              {step.detail}
            </span>
          </EuiText>
        ) : null}
        <div
          css={css`
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: ${euiTheme.size.xs};
            margin-top: 2px;
          `}
        >
          {step.kind === 'alert' ? (
            <EuiBadge color={getAlertSeverityColor(euiTheme, step.severity)}>
              {step.severity ??
                i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineSeverityUnknown',
                  { defaultMessage: 'alert' }
                )}
            </EuiBadge>
          ) : null}
          {step.contributedToAlertId ? (
            <EuiBadge color="hollow" iconType="warning">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineContributedBadge',
                { defaultMessage: 'Tied to alert' }
              )}
            </EuiBadge>
          ) : null}
          {step.reasons.map((reason) => (
            <EuiBadge key={reason} color="default">
              {reasonLabel(reason)}
            </EuiBadge>
          ))}
          <div
            css={css`
              margin-left: auto;
              display: flex;
              gap: 2px;
            `}
          >
            {onFocusRef && entityRef ? (
              <EuiToolTip
                disableScreenReaderOutput
                content={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineFocusNode',
                  { defaultMessage: 'Focus this entity in the graph' }
                )}
              >
                <EuiButtonIcon
                  iconType="crosshair"
                  size="xs"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineFocusNode',
                    { defaultMessage: 'Focus this entity in the graph' }
                  )}
                  onClick={(clickEvent: React.MouseEvent) => {
                    clickEvent.stopPropagation();
                    onFocusRef(entityRef);
                  }}
                />
              </EuiToolTip>
            ) : null}
            {onViewRaw ? (
              <EuiToolTip
                disableScreenReaderOutput
                content={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineViewRaw',
                  { defaultMessage: 'View raw document' }
                )}
              >
                <EuiButtonIcon
                  iconType="inspect"
                  size="xs"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineViewRaw',
                    { defaultMessage: 'View raw document' }
                  )}
                  data-test-subj="timelineStepViewRaw"
                  onClick={(clickEvent: React.MouseEvent) => {
                    clickEvent.stopPropagation();
                    onViewRaw(step);
                  }}
                />
              </EuiToolTip>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const tacticLabel = (group: TimelineGroup): string | undefined => group.dominantTactic ?? undefined;

interface TimelineGroupHeaderProps {
  group: TimelineGroup;
}

/** Session header: date range, worst severity, dominant tactic, alert count. */
const TimelineGroupHeader: React.FC<TimelineGroupHeaderProps> = ({ group }) => {
  const { euiTheme } = useEuiTheme();
  const tactic = tacticLabel(group);
  return (
    <div
      css={css`
        position: sticky;
        top: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: ${euiTheme.size.xs};
        padding: ${euiTheme.size.xs} 0;
        margin-top: ${euiTheme.size.s};
        background: ${euiTheme.colors.backgroundBasePlain};
      `}
      data-test-subj="entityIntelligenceTimelineGroupHeader"
    >
      <EuiIcon type="calendar" size="s" color="subdued" aria-hidden={true} />
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
          color: ${euiTheme.colors.textParagraph};
          font-variant-numeric: tabular-nums;
        `}
      >
        <PreferenceFormattedDate value={new Date(group.startTimestamp)} />
      </EuiText>
      {group.worstSeverity ? (
        <EuiBadge color={getAlertSeverityColor(euiTheme, group.worstSeverity)}>
          {group.worstSeverity}
        </EuiBadge>
      ) : null}
      {tactic ? <EuiBadge color="hollow">{tactic}</EuiBadge> : null}
      <span
        css={css`
          margin-left: auto;
          font-size: 11px;
          color: ${euiTheme.colors.textSubdued};
        `}
      >
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineGroupSummary',
          {
            defaultMessage:
              '{steps, plural, one {# step} other {# steps}} · {alerts, plural, =0 {no alerts} one {# alert} other {# alerts}}',
            values: { steps: group.steps.length, alerts: group.alertCount },
          }
        )}
      </span>
    </div>
  );
};

/**
 * Premium, grouped, timestamped causal waterfall for a single entity. Renders
 * the {@link useEntityTimeline} model as day/session groups (via the pure
 * {@link groupTimelineSteps}), each a vertical time-rail of severity-accented
 * step cards showing absolute + relative time, category icons, alert linkage,
 * and per-step "focus in graph" / "view raw" actions. Hover cross-highlights
 * the matching graph node; the graph can highlight rows back via
 * {@link EntityTimelineProps.highlightedEntityKey}.
 */
export const EntityTimeline: React.FC<EntityTimelineProps> = ({
  entity,
  timeRange,
  onStepSelect,
  selectedStepId,
  onStepHighlight,
  onStepFocus,
  onStepViewRaw,
  highlightedEntityKey,
  expanded = false,
  onModelChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const [visibleGroups, setVisibleGroups] = useState(DEFAULT_VISIBLE_GROUPS);
  const { model, isLoading, isError, refetch } = useEntityTimeline({ entity, timeRange });

  useEffect(() => {
    onModelChange?.(model);
  }, [model, onModelChange]);

  const groups = useMemo(() => groupTimelineSteps(model.steps), [model.steps]);
  const shownGroups = groups.slice(0, visibleGroups);
  const hiddenGroupCount = groups.length - shownGroups.length;

  const handleHover = useCallback(
    (ref: TimelineEntityRef | undefined) => onStepHighlight?.(ref),
    [onStepHighlight]
  );

  const header = (
    <SectionLabel>
      {i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineTitle',
        { defaultMessage: 'Causal timeline' }
      )}
    </SectionLabel>
  );

  if (isLoading) {
    return (
      <div data-test-subj="entityIntelligenceTimeline">
        {header}
        <EuiSpacer size="s" />
        <EuiSkeletonText lines={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-test-subj="entityIntelligenceTimeline">
        {header}
        <EuiSpacer size="s" />
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          title={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineError',
            { defaultMessage: 'The timeline could not be loaded.' }
          )}
        >
          <EuiButtonEmpty size="xs" onClick={() => refetch()}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineRetry',
              { defaultMessage: 'Retry' }
            )}
          </EuiButtonEmpty>
        </EuiCallOut>
      </div>
    );
  }

  if (model.steps.length === 0) {
    return (
      <div data-test-subj="entityIntelligenceTimeline">
        {header}
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineEmpty',
              { defaultMessage: 'No significant activity for this entity in the selected range.' }
            )}
          </p>
        </EuiText>
      </div>
    );
  }

  return (
    <div data-test-subj="entityIntelligenceTimeline">
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${euiTheme.size.s};
        `}
      >
        {header}
        <EuiText size="xs" color="subdued">
          <span>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineCount',
              {
                defaultMessage:
                  '{count, plural, one {# significant step} other {# significant steps}} · {groups, plural, one {# session} other {# sessions}}',
                values: { count: model.totalSignificant, groups: groups.length },
              }
            )}
          </span>
        </EuiText>
      </div>
      <EuiSpacer size="s" />
      <div
        css={css`
          display: grid;
          grid-template-columns: ${expanded ? 'repeat(auto-fill, minmax(420px, 1fr))' : '1fr'};
          gap: ${expanded ? euiTheme.size.l : '0'};
        `}
      >
        {shownGroups.map((group) => (
          <div key={group.id}>
            <TimelineGroupHeader group={group} />
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${euiTheme.size.xs};
              `}
            >
              {group.steps.map((step, index) => {
                const ref = stepEntityRef(step, entity);
                return (
                  <TimelineStepRow
                    key={step.id}
                    step={step}
                    index={index}
                    isSelected={step.id === selectedStepId}
                    isHighlighted={
                      highlightedEntityKey !== undefined &&
                      ref !== undefined &&
                      entityRefKey(ref) === highlightedEntityKey
                    }
                    interactive={!!onStepSelect}
                    onSelect={(selected) => onStepSelect?.(selected)}
                    onHoverRef={handleHover}
                    onFocusRef={onStepFocus}
                    onViewRaw={onStepViewRaw}
                    entityRef={ref}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {hiddenGroupCount > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="xs"
            iconType="chevronSingleDown"
            onClick={() => setVisibleGroups((current) => current + DEFAULT_VISIBLE_GROUPS)}
            data-test-subj="entityIntelligenceTimelineShowMore"
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineShowMoreSessions',
              {
                defaultMessage:
                  'Show {count, plural, one {# earlier session} other {# earlier sessions}}',
                values: { count: hiddenGroupCount },
              }
            )}
          </EuiButtonEmpty>
        </>
      ) : null}
      {model.overflowCount > 0 ? (
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.timelineOverflowHint',
              {
                defaultMessage:
                  '{count, plural, one {# additional step is} other {# additional steps are}} beyond the display cap. Narrow the time range to see them.',
                values: { count: model.overflowCount },
              }
            )}
          </p>
        </EuiText>
      ) : null}
    </div>
  );
};
