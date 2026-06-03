/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';

import {
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';

import { DaybreakShellSpinner } from './daybreak_shell_spinner';

/* ----------------------------------------------------------------------- *
 * "Critical" Daybreak page content.
 *
 * 1:1 layout/structure parallel of the obs Nightshift Critical surface
 * (`x-pack/solutions/observability/plugins/observability/public/pages/nightshift/nightshift_critical.tsx`):
 *
 *   1. Page header — danger-tinted sun avatar + escalation copy.
 *   2. Single significant-events panel containing
 *        - Active / In Progress / Archived filter + "Go to alerts" link
 *        - Risk summary row (Critical / High / Medium / Low) — Active tab only
 *        - Body list — content depends on the active filter
 *        - Footer text + Investigate (AiButton) + Go-to-Alerts CTA
 *
 * Static fixtures for now; per-event handoff to the Elastic AI Agent
 * lands with a follow-up Daybreak attachment.
 * ----------------------------------------------------------------------- */

/* ----------------------------------------------------------------------- *
 * Affected impact — Overview panel cards.
 *
 * 1:1 visual parallel of the obs Critical "Affected entities" panel
 * (`AffectedEntityCard` in `nightshift_critical.tsx`) — danger-tinted
 * card with a category label on top and a bold value on the bottom.
 * The semantics swap from "service / infrastructure entity" to
 * security impact metrics so SOC / IR users can answer the first
 * triage questions at a glance: *who is affected, where, and how
 * many external actors are involved?*
 * ----------------------------------------------------------------------- */

interface AffectedImpact {
  id: string;
  /** Category label (e.g. "Users"). */
  category: string;
  /** Glyph next to the category. */
  icon: IconType;
  /** Bold value below — number or short string. */
  value: string;
}

const AFFECTED_IMPACT: AffectedImpact[] = [
  {
    id: 'usersImpacted',
    category: i18n.translate('xpack.securitySolution.daybreak.critical.impact.users', {
      defaultMessage: 'Users impacted',
    }),
    icon: 'users',
    value: '3',
  },
  {
    id: 'hostsAffected',
    category: i18n.translate('xpack.securitySolution.daybreak.critical.impact.hosts', {
      defaultMessage: 'Hosts affected',
    }),
    icon: 'storage',
    value: '2',
  },
  {
    id: 'externalIps',
    category: i18n.translate('xpack.securitySolution.daybreak.critical.impact.externalIps', {
      defaultMessage: 'External IPs',
    }),
    icon: 'globe',
    value: '5',
  },
  {
    id: 'endpointsAtRisk',
    category: i18n.translate(
      'xpack.securitySolution.daybreak.critical.impact.endpointsAtRisk',
      { defaultMessage: 'Endpoints at risk' }
    ),
    icon: 'desktop',
    value: '12',
  },
];

/* ---------- Risk summary ---------- */

type RiskTone = 'danger' | 'warning' | 'subdued';

interface RiskSummaryStat {
  id: string;
  label: string;
  value: string;
  iconType?: IconType;
  tone: RiskTone;
}

const RISK_SUMMARY: RiskSummaryStat[] = [
  {
    id: 'critical',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.riskSummary.critical', {
      defaultMessage: 'Critical risk',
    }),
    value: '5',
    iconType: 'securitySignal',
    tone: 'danger',
  },
  {
    id: 'high',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.riskSummary.high', {
      defaultMessage: 'High risk',
    }),
    value: '1',
    iconType: 'warning',
    tone: 'warning',
  },
  {
    id: 'medium',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.riskSummary.medium', {
      defaultMessage: 'Medium',
    }),
    value: '3',
    tone: 'subdued',
  },
  {
    id: 'low',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.riskSummary.low', {
      defaultMessage: 'Low',
    }),
    value: '12',
    tone: 'subdued',
  },
];

/* ---------- Filter tabs ---------- */

const FILTER_OPTIONS = [
  {
    id: 'active',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.filter.active', {
      defaultMessage: 'Active',
    }),
  },
  {
    id: 'inProgress',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.filter.inProgress', {
      defaultMessage: 'In Progress',
    }),
  },
  {
    id: 'archived',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.filter.archived', {
      defaultMessage: 'Archived',
    }),
  },
] as const;

/* ---------- Significant events (security flavoured) ---------- */

type EventSeverity = 'critical' | 'medium' | 'low';
type EventType = 'attack' | 'alert';
/** Per-row primary action — surfaced as an `xs` empty button. */
type EventActionId = 'blockIp' | 'addToCase' | 'investigate';

interface SecurityEvent {
  id: string;
  title: string;
  severity: EventSeverity;
  /** Classification badge — Alert (suspicious) vs Attack (confirmed malicious). */
  type: EventType;
  /** Primary action surfaced on the row. */
  action: EventActionId;
}

const SECURITY_EVENTS: SecurityEvent[] = [
  {
    id: 'tor-exit-c2',
    title: i18n.translate('xpack.securitySolution.daybreak.critical.event.torExitC2', {
      defaultMessage: 'Outbound C2 traffic to Tor exit node, port 443',
    }),
    severity: 'critical',
    type: 'attack',
    action: 'blockIp',
  },
  {
    id: 'cobalt-strike-srvwin07',
    title: i18n.translate('xpack.securitySolution.daybreak.critical.event.cobaltStrike', {
      defaultMessage: 'Cobalt Strike beacon detected on SRVWIN07',
    }),
    severity: 'critical',
    type: 'attack',
    action: 'addToCase',
  },
  {
    id: 'lateral-movement',
    title: i18n.translate('xpack.securitySolution.daybreak.critical.event.lateralMovement', {
      defaultMessage: 'Suspicious lateral movement from FINANCE-WS01',
    }),
    severity: 'medium',
    type: 'alert',
    action: 'investigate',
  },
  {
    id: 'failed-logons',
    title: i18n.translate('xpack.securitySolution.daybreak.critical.event.failedLogons', {
      defaultMessage: 'Repeated failed logon attempts on DC-NYC01',
    }),
    severity: 'low',
    type: 'alert',
    action: 'investigate',
  },
];

const IN_PROGRESS_EVENTS: SecurityEvent[] = [
  {
    id: 'cobalt-strike-contain',
    title: i18n.translate('xpack.securitySolution.daybreak.critical.event.cobaltStrikeContain', {
      defaultMessage: 'Containing Cobalt Strike infection on payment-prod',
    }),
    severity: 'critical',
    type: 'attack',
    action: 'addToCase',
  },
  {
    id: 'cred-stuffing',
    title: i18n.translate('xpack.securitySolution.daybreak.critical.event.credStuffing', {
      defaultMessage: 'Investigating credential stuffing attack on auth-service',
    }),
    severity: 'critical',
    type: 'attack',
    action: 'investigate',
  },
];

const SEVERITY_BADGE: Record<EventSeverity, { color: 'danger' | 'warning' | 'hollow'; label: string }> = {
  critical: {
    color: 'danger',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.severity.critical', {
      defaultMessage: 'Critical',
    }),
  },
  medium: {
    color: 'warning',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.severity.medium', {
      defaultMessage: 'Medium',
    }),
  },
  low: {
    color: 'hollow',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.severity.low', {
      defaultMessage: 'Low',
    }),
  },
};

/**
 * Type badge: "Attack" (bug glyph) is confirmed malicious behaviour,
 * "Alert" (alert glyph) is suspicious-but-not-confirmed. Both render
 * as hollow badges — the icon carries the meaning, not the colour, so
 * the severity badge to the right is the only colourful tag on the
 * row.
 */
const TYPE_BADGE: Record<EventType, { iconType: IconType; label: string }> = {
  attack: {
    iconType: 'bolt',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.type.attack', {
      defaultMessage: 'Attack',
    }),
  },
  alert: {
    iconType: 'alert',
    label: i18n.translate('xpack.securitySolution.daybreak.critical.type.alert', {
      defaultMessage: 'Alert',
    }),
  },
};

/**
 * Per-row primary action shown as an `xs` empty button. Static
 * placeholders for now; the click handlers will eventually wire into
 * the security solution's case / list / agent flows.
 */
const ACTION_LABELS: Record<EventActionId, string> = {
  blockIp: i18n.translate('xpack.securitySolution.daybreak.critical.action.blockIp', {
    defaultMessage: 'Block IP',
  }),
  addToCase: i18n.translate('xpack.securitySolution.daybreak.critical.action.addToCase', {
    defaultMessage: 'Add to Case',
  }),
  investigate: i18n.translate('xpack.securitySolution.daybreak.critical.action.investigate', {
    defaultMessage: 'Investigate',
  }),
};

/* ----------------------------------------------------------------------- *
 * Sub-components
 * ----------------------------------------------------------------------- */

/**
 * Danger-tinted card showing one affected-impact metric — category
 * label on top, bold value below. Mirrors the obs `AffectedEntityCard`
 * styling so the two surfaces read identically across solutions.
 */
const AffectedImpactCard: React.FC<{ impact: AffectedImpact }> = ({ impact }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="s"
      css={css`
        background: ${euiTheme.colors.backgroundBaseDanger};
        border-color: ${euiTheme.colors.borderBaseSubdued};
        border-radius: 8px;
      `}
      data-test-subj={`daybreakCriticalImpact-${impact.id}`}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiAvatar
                name={impact.category}
                size="s"
                color={euiTheme.colors.backgroundBaseDanger}
                iconType={impact.icon}
                iconColor={euiTheme.colors.textDanger}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                css={css`
                  color: ${euiTheme.colors.textDanger};
                  font-weight: ${euiTheme.font.weight.medium};
                `}
              >
                {impact.category}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            css={css`
              color: ${euiTheme.colors.textDanger};
              font-weight: ${euiTheme.font.weight.semiBold};
              padding-left: 8px;
            `}
          >
            {impact.value}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

/** Resolve tile bg/icon color for a risk-summary stat. */
const useRiskToneColors = () => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => ({
      danger: {
        background: euiTheme.colors.backgroundBaseDanger,
        icon: euiTheme.colors.textDanger,
      },
      warning: {
        background: euiTheme.colors.backgroundBaseWarning,
        icon: euiTheme.colors.textWarning,
      },
      subdued: {
        background: euiTheme.colors.borderBaseSubdued,
        icon: euiTheme.colors.textSubdued,
      },
    }),
    [euiTheme]
  );
};

/** One inline "Critical risk · 5" stat with a left-tile icon. */
const RiskStat: React.FC<{ stat: RiskSummaryStat }> = ({ stat }) => {
  const { euiTheme } = useEuiTheme();
  const toneColors = useRiskToneColors();
  const tone = toneColors[stat.tone];
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      responsive={false}
      data-test-subj={`daybreakCriticalRisk-${stat.id}`}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>{stat.label}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {stat.iconType && (
            <EuiFlexItem grow={false}>
              <span
                css={css`
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  width: 24px;
                  height: 24px;
                  border-radius: ${euiTheme.border.radius.small};
                  background: ${tone.background};
                `}
              >
                <EuiIcon type={stat.iconType} size="s" color={tone.icon} />
              </span>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <strong>{stat.value}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Active / Archived row — link title + severity badge + per-row action
 * icons (attach to input, ask agent, more). Mirrors obs
 * `SignificantEventRow` 1:1 so the two surfaces read identically.
 */
/*
 * Per-column fixed widths so every row lines up vertically — the type
 * column always ends at the same x, the severity column always ends
 * at the same x, etc., regardless of which action label or which
 * badge text the row carries. Tuned so the widest label in each
 * column (`Attack` / `Critical` / `Investigate`) fits without
 * truncation but doesn't leave dead space around the shorter ones.
 */
const TABLE_COLUMN = {
  maximize: 24,
  type: 96,
  severity: 96,
  /*
   * Single trailing-actions column hosting the action text button + the
   * paperclip + the overflow menu icons in a tight flex group. Width
   * is sized for the widest action label (`Investigate`) plus the two
   * `xs` icon buttons and their inner gutter; the cluster aligns
   * flush to the row's right edge.
   */
  actions: 180,
} as const;

const tableColumn = (px: number) => css`
  flex: 0 0 ${px}px;
  min-width: ${px}px;
  max-width: ${px}px;
  display: flex;
  align-items: flex-end;
`;

const SecurityEventRow: React.FC<{ event: SecurityEvent; isLast: boolean }> = ({
  event,
  isLast,
}) => {
  const { euiTheme } = useEuiTheme();
  const sev = SEVERITY_BADGE[event.severity];
  const typeBadge = TYPE_BADGE[event.type];
  const actionLabel = ACTION_LABELS[event.action];

  return (
    <div
      css={css`
        width: 100%;
        box-sizing: border-box;
        padding: 12px ${euiTheme.size.l};
        background: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
      `}
      data-test-subj={`daybreakCriticalEvent-${event.id}`}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          min-width: 0;
        `}
      >
        {/* Col 1 — maximize icon (fixed width) */}
        <EuiFlexItem grow={false} css={tableColumn(TABLE_COLUMN.maximize)}>
          <EuiIcon type="maximize" size="s" color={euiTheme.colors.textPrimary} />
        </EuiFlexItem>
        {/* Col 2 — title, fills remaining row width */}
        <EuiFlexItem
          css={css`
            min-width: 0;
            flex: 1 1 0;
          `}
        >
          {/*
           * Title rendered as the same `xs` `EuiButtonEmpty` shape used
           * by the "Go to alerts" CTA at the top of the queue and the
           * per-row action button at the end of the row, so all primary
           * in-row affordances read as the same button family with the
           * same hover footprint (default `EuiButtonEmpty` padding, no
           * `flush` override). The button still ellipses long titles
           * via `.euiButtonEmpty__text` so the column constraint wins.
           */}
          <EuiButtonEmpty
            size="xs"
            data-test-subj={`daybreakCriticalEvent-${event.id}-title`}
            onClick={() => {}}
            title={event.title}
            css={css`
              max-width: 100%;
              font-weight: ${euiTheme.font.weight.semiBold};
              .euiButtonEmpty__text {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            `}
          >
            {event.title}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {/*
         * Col 3 — type badge (Attack / Alert). Both hollow; the
         * left-side icon (`bug` vs `alert`) carries the meaning so
         * the only colourful tag on the row is severity.
         */}
        <EuiFlexItem grow={false} css={tableColumn(TABLE_COLUMN.type)}>
          <EuiBadge
            color="hollow"
            iconType={typeBadge.iconType}
            iconSide="left"
            data-test-subj={`daybreakCriticalEvent-${event.id}-typeBadge`}
          >
            {typeBadge.label}
          </EuiBadge>
        </EuiFlexItem>
        {/* Col 4 — severity badge */}
        <EuiFlexItem grow={false} css={tableColumn(TABLE_COLUMN.severity)}>
          <EuiBadge
            color={sev.color}
            data-test-subj={`daybreakCriticalEvent-${event.id}-badge`}
          >
            {sev.label}
          </EuiBadge>
        </EuiFlexItem>
        {/*
         * Col 5 — trailing actions cluster. The per-row primary action
         * (Block IP / Add to Case / Investigate) plus the paperclip
         * and overflow icons live in a single fixed-width column so
         * the whole cluster aligns flush against the row's right edge
         * across every row, regardless of action label length.
         */}
        <EuiFlexItem grow={false} css={tableColumn(TABLE_COLUMN.actions)}>
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            justifyContent="flexEnd"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                data-test-subj={`daybreakCriticalEvent-${event.id}-action-${event.action}`}
                onClick={() => {}}
              >
                {actionLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="paperClip"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.securitySolution.daybreak.critical.event.attachAriaLabel',
                  {
                    defaultMessage: 'Attach "{title}" to the input',
                    values: { title: event.title },
                  }
                )}
                data-test-subj={`daybreakCriticalEvent-${event.id}-attach`}
                onClick={() => {}}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="boxesHorizontal"
                color="text"
                size="xs"
                aria-label={i18n.translate(
                  'xpack.securitySolution.daybreak.critical.event.moreAriaLabel',
                  { defaultMessage: 'More actions' }
                )}
                onClick={() => {}}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

/**
 * In Progress row — same chrome as `SecurityEventRow` but with a
 * shell-style braille spinner on the left in place of the maximize
 * icon (signals "an agent is working on this right now") and only an
 * overflow menu on the right — there's no severity badge or attach
 * actions for in-progress work.
 */
const InProgressEventRow: React.FC<{ event: SecurityEvent; isLast: boolean }> = ({
  event,
  isLast,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        width: 100%;
        box-sizing: border-box;
        padding: 12px ${euiTheme.size.l};
        background: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
      `}
      data-test-subj={`daybreakCriticalInProgressEvent-${event.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <DaybreakShellSpinner size={16} aria-label={`${event.title} in progress`} />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
            flex: 1 1 0;
          `}
        >
          <EuiText
            size="xs"
            css={css`
              color: ${euiTheme.colors.textPrimary};
              font-weight: ${euiTheme.font.weight.semiBold};
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
            title={event.title}
          >
            {event.title}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="boxesHorizontal"
            color="text"
            size="xs"
            aria-label={i18n.translate(
              'xpack.securitySolution.daybreak.critical.inProgressMoreAriaLabel',
              { defaultMessage: 'More actions' }
            )}
            onClick={() => {}}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

/* ----------------------------------------------------------------------- *
 * Main page
 * ----------------------------------------------------------------------- */

/**
 * Prompt sent to Agent Builder when the user clicks "Investigate" in
 * the footer — kicks off a guided remediation flow asking the agent
 * to triage the active alerts and walk the user through containment.
 */
const INVESTIGATE_PROMPT = i18n.translate(
  'xpack.securitySolution.daybreak.critical.investigatePrompt',
  {
    defaultMessage:
      'Investigate the critical alerts and attacks currently flagged in my queue. Prioritise containment of the active attack first, then walk me through the remaining alerts and what to do about each one.',
  }
);

interface DaybreakCriticalProps {
  /**
   * Hand off to Agent Builder with the prompt pre-staged. When set,
   * the footer "Investigate" CTA dispatches to this function;
   * otherwise it falls back to a no-op so the component still
   * renders standalone (e.g. in Storybook / Scout tests).
   */
  onStartConversation?: (prompt: string) => void;
  /** Whether the page is currently fading out for hand-off. */
  isExiting?: boolean;
}

export const DaybreakCritical: React.FC<DaybreakCriticalProps> = ({
  onStartConversation,
  isExiting = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [filter, setFilter] = useState<string>(FILTER_OPTIONS[0].id);

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="l"
      responsive={false}
      data-test-subj="daybreakCriticalPage"
      css={css`
        width: 100%;
        max-width: 753px;
        margin: 0 auto;
      `}
    >
      {/* ---------- Header — danger-tinted bug avatar + action-led copy ---------- */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            {/*
             * Bug glyph on a danger-tinted background — reads as
             * "active threat" at a glance, matching the type-badge
             * iconography used in the queue rows below.
             */}
            <div
              aria-hidden
              css={css`
                width: 40px;
                height: 40px;
                border-radius: 20px;
                background: ${euiTheme.colors.backgroundBaseDanger};
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              <EuiIcon type="bug" size="l" color={euiTheme.colors.textDanger} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2
                css={css`
                  text-align: center;
                `}
              >
                {i18n.translate('xpack.securitySolution.daybreak.critical.title', {
                  defaultMessage:
                    'You have 1 attack and 2 critical alerts that require your action',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              size="s"
              color="subdued"
              textAlign="center"
              css={css`
                max-width: 596px;
              `}
            >
              <p>
                {i18n.translate('xpack.securitySolution.daybreak.critical.description', {
                  defaultMessage:
                    'Top priority: an active attack is targeting your critical infrastructure. Containing the source and triaging the related alerts is the fastest way to limit blast radius.',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* ---------- Overview panel — affected impact cards ---------- */}
      <EuiFlexItem
        grow={false}
        css={css`
          width: 100%;
        `}
      >
        <EuiPanel
          hasShadow={false}
          hasBorder
          paddingSize="l"
          css={css`
            background: ${euiTheme.colors.backgroundBaseSubdued};
            border-color: ${euiTheme.colors.borderBaseSubdued};
            border-radius: 8px;
          `}
          data-test-subj="daybreakCriticalImpactOverview"
        >
          <EuiText
            size="s"
            css={css`
              color: ${euiTheme.colors.textSubdued};
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {i18n.translate('xpack.securitySolution.daybreak.critical.overviewLabel', {
              defaultMessage: 'Overview',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={4} gutterSize="s">
            {AFFECTED_IMPACT.map((impact) => (
              <EuiFlexItem key={impact.id}>
                <AffectedImpactCard impact={impact} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPanel>
      </EuiFlexItem>

      {/* ---------- Significant events panel ---------- */}
      <EuiFlexItem
        grow={false}
        css={css`
          width: 100%;
        `}
      >
        <EuiPanel
          paddingSize="none"
          hasShadow={false}
          hasBorder
          color="plain"
          css={css`
            overflow: hidden;
            border-radius: 12px;
            border-color: ${euiTheme.colors.borderBaseSubdued};
          `}
        >
          {/* Top: filter button group + go-to link + risk summary */}
          <div
            css={css`
              padding: ${euiTheme.size.base} ${euiTheme.size.l};
              background: ${euiTheme.colors.backgroundBaseSubdued};
              border-bottom: ${euiTheme.border.thin};
            `}
          >
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.translate(
                    'xpack.securitySolution.daybreak.critical.filterLegend',
                    { defaultMessage: 'Filter alerts and attacks' }
                  )}
                  buttonSize="compressed"
                  color="primary"
                  idSelected={filter}
                  onChange={setFilter}
                  options={FILTER_OPTIONS.map((opt) => ({
                    id: opt.id,
                    label: opt.label,
                  }))}
                  data-test-subj="daybreakCriticalFilter"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => {}}
                  data-test-subj="daybreakCriticalGoToAlertsTop"
                >
                  {i18n.translate('xpack.securitySolution.daybreak.critical.goToAlerts', {
                    defaultMessage: 'Go to alerts',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>

            {/*
             * Risk summary is only relevant for the Active tab — In
             * Progress and Archived render a simpler list without
             * the breakdown.
             */}
            {filter === 'active' && (
              <>
                <EuiSpacer size="m" />
                <EuiPanel paddingSize="m" hasShadow={false} hasBorder color="plain">
                  <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
                    {RISK_SUMMARY.map((stat, index) => (
                      <React.Fragment key={stat.id}>
                        <EuiFlexItem>
                          <RiskStat stat={stat} />
                        </EuiFlexItem>
                        {index < RISK_SUMMARY.length - 1 && (
                          <EuiFlexItem grow={false}>
                            <div
                              aria-hidden
                              css={css`
                                width: 1px;
                                height: 46px;
                                background: ${euiTheme.colors.borderBaseSubdued};
                              `}
                            />
                          </EuiFlexItem>
                        )}
                      </React.Fragment>
                    ))}
                  </EuiFlexGroup>
                </EuiPanel>
              </>
            )}
          </div>

          {/*
           * Body list — content depends on the active filter:
           *  - active     → severity-tagged security events
           *  - inProgress → shell-spinner row + title + overflow menu
           *  - archived   → empty state
           */}
          {filter === 'active' && (
            <div data-test-subj="daybreakCriticalActiveList">
              {SECURITY_EVENTS.map((event, idx) => (
                <SecurityEventRow
                  key={event.id}
                  event={event}
                  isLast={idx === SECURITY_EVENTS.length - 1}
                />
              ))}
            </div>
          )}
          {filter === 'inProgress' && (
            <div data-test-subj="daybreakCriticalInProgressList">
              {IN_PROGRESS_EVENTS.map((event, idx) => (
                <InProgressEventRow
                  key={event.id}
                  event={event}
                  isLast={idx === IN_PROGRESS_EVENTS.length - 1}
                />
              ))}
            </div>
          )}
          {filter === 'archived' && (
            <div
              data-test-subj="daybreakCriticalArchivedList"
              css={css`
                padding: ${euiTheme.size.xl} ${euiTheme.size.l};
                background: ${euiTheme.colors.backgroundBasePlain};
                text-align: center;
              `}
            >
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('xpack.securitySolution.daybreak.critical.archivedEmpty', {
                    defaultMessage: 'No archived alerts yet.',
                  })}
                </p>
              </EuiText>
            </div>
          )}

          <EuiHorizontalRule margin="none" />

          {/*
           * Footer copy + actions.
           *
           * Active / Archived tabs get the call-to-action footer
           * (Investigate + Go to alerts). The In Progress tab swaps
           * that for a passive text-only footer — there's nothing
           * left for the user to do, the agents are already on it.
           */}
          <div
            css={css`
              padding: ${euiTheme.size.base} ${euiTheme.size.l};
            `}
          >
            {filter === 'inProgress' ? (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.securitySolution.daybreak.critical.inProgressSummary',
                    {
                      defaultMessage:
                        'These investigations are being handled by agents — you can follow their progress by opening the matching conversations.',
                    }
                  )}
                </p>
              </EuiText>
            ) : (
              <>
                <EuiText size="s">
                  <p>
                    {i18n.translate('xpack.securitySolution.daybreak.critical.summary', {
                      defaultMessage:
                        'You can start remediation with Agent Builder now, and get those alerts handled. If you want to see every alert, head over to the hub.',
                    })}
                  </p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                  <EuiFlexItem grow={false}>
                    <AiButton
                      variant="base"
                      size="s"
                      iconType="productAgent"
                      data-test-subj="daybreakCriticalInvestigate"
                      isDisabled={isExiting}
                      onClick={() => onStartConversation?.(INVESTIGATE_PROMPT)}
                    >
                      {i18n.translate('xpack.securitySolution.daybreak.critical.investigate', {
                        defaultMessage: 'Investigate',
                      })}
                    </AiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      color="text"
                      data-test-subj="daybreakCriticalGoToAlerts"
                      isDisabled={isExiting}
                      onClick={() => {}}
                    >
                      {i18n.translate(
                        'xpack.securitySolution.daybreak.critical.goToAlertsButton',
                        { defaultMessage: 'Go to alerts' }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </div>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
