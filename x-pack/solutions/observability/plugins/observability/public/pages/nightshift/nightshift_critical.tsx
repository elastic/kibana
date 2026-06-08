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

import {
  IN_PROGRESS_EVENTS,
  SIGNIFICANT_EVENTS,
  type SignificantEvent,
} from './nightshift_critical_events';
import { SignificantEventRow } from './nightshift_significant_event_row';
import { ShellSpinner } from './shell_spinner';
import { useStartNightshiftConversation } from './use_start_nightshift_conversation';

/* ----------------------------------------------------------------------- *
 * Static mock data — mirrors the Figma nodes 1152:82875 (events panel)
 * and 1152:82850 (Overview panel). Real data wiring is intentionally
 * deferred (Nightshift is still a prototype).
 * ----------------------------------------------------------------------- */

/**
 * Affected entity shown in the Overview panel — a service / piece of
 * infrastructure currently implicated in a critical significant event.
 */
interface AffectedEntity {
  id: string;
  /** Category label ("Service" / "Infrastructure"). */
  category: string;
  /** Glyph next to the category — layers for service, kubernetesPod for infra. */
  icon: IconType;
  /** Bold entity name — the subject of the incident (e.g. "payment"). */
  name: string;
}

const AFFECTED_ENTITIES: AffectedEntity[] = [
  { id: 'payment', category: 'Service', icon: 'layers', name: 'payment' },
  { id: 'fleet-service', category: 'Service', icon: 'layers', name: 'fleet-service' },
  {
    id: 'kubernetes',
    category: 'Infrastructure',
    icon: 'kubernetesPod',
    name: 'kubernetes',
  },
  { id: 'checkout', category: 'Service', icon: 'layers', name: 'checkout' },
];

type RiskTone = 'danger' | 'warning' | 'subdued';

interface RiskSummaryStat {
  id: string;
  label: string;
  value: string;
  iconType?: IconType;
  tone: RiskTone;
}

const RISK_SUMMARY: RiskSummaryStat[] = [
  { id: 'critical', label: 'Critical risk', value: '5', iconType: 'radar', tone: 'danger' },
  { id: 'high', label: 'High risk', value: '1', iconType: 'warning', tone: 'warning' },
  { id: 'medium', label: 'Medium', value: '3', tone: 'subdued' },
  { id: 'low', label: 'Low', value: '12', tone: 'subdued' },
];


const FILTER_OPTIONS = [
  { id: 'active', label: 'Active' },
  { id: 'inProgress', label: 'In Progress' },
  { id: 'archived', label: 'Archived' },
] as const;

const REMEDIATE_PROMPT = i18n.translate(
  'xpack.observability.nightshift.critical.remediatePrompt',
  {
    defaultMessage: 'Investigate all significant events.',
  }
);

/* ----------------------------------------------------------------------- *
 * Subcomponents
 * ----------------------------------------------------------------------- */

/**
 * Pink "affected entity" card — one of the 4 tiles in the Overview
 * panel. Uses the same light-danger background and danger text colors
 * as the Figma reference (1152:82850).
 */
const AffectedEntityCard: React.FC<{ entity: AffectedEntity }> = ({ entity }) => {
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
      data-test-subj={`nightshiftCriticalEntity-${entity.id}`}
    >
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiAvatar
                name={entity.category}
                size="s"
                color={euiTheme.colors.backgroundBaseDanger}
                iconType={entity.icon}
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
                {entity.category}
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
            `}
          >
            {entity.name}
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
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
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
 * Compact row for the "In Progress" tab. Same chrome as
 * `SignificantEventRow` but with a `ShellSpinner` on the left in place
 * of the expand icon (signals "task is being worked on right now") and
 * only an overflow menu on the right — there is no severity badge or
 * other actions on in-progress items.
 */
const InProgressEventRow: React.FC<{ event: SignificantEvent; isLast: boolean }> = ({
  event,
  isLast,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        padding: 12px;
        background: ${euiTheme.colors.backgroundBasePlain};
        border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
      `}
      data-test-subj={`nightshiftCriticalInProgressEvent-${event.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <ShellSpinner size={16} aria-label={`${event.title} in progress`} />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
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
              'xpack.observability.nightshift.critical.inProgressMoreAriaLabel',
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
 * "Critical" Nightshift page. Mounted by `NightshiftPage` when the chrome
 * status dropdown is set to `'critical'`.
 *
 * Mirrors the Figma layout at node 1080:78874:
 *
 *   1. Header — productAgent avatar (red tint) + "You have significant
 *      events that require escalation" title.
 *   2. State panel — 4 pink "affected entity" cards in a row
 *      (Service / Infrastructure).
 *   3. Significant events panel:
 *        - Active / In Progress / Archived button group
 *        - Risk summary (Critical / High / Medium / Low)
 *        - Featured event card with circular risk score
 *        - Compact list of significant events with action icons
 *   4. Footer summary with "Remediate all" (AiButton) and "Go to
 *      Significant events" actions.
 */
export const NightshiftCritical: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { isExiting, start, exitDurationMs } = useStartNightshiftConversation();
  const [filter, setFilter] = useState<string>(FILTER_OPTIONS[0].id);

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="l"
      responsive={false}
      data-test-subj="nightshiftCriticalPage"
      aria-hidden={isExiting ? 'true' : undefined}
      css={css`
        width: 100%;
        max-width: 753px;
        margin: 0 auto;
        opacity: ${isExiting ? 0 : 1};
        transform: ${isExiting ? 'translateY(-6px)' : 'translateY(0)'};
        transition: opacity ${exitDurationMs}ms ease-out, transform ${exitDurationMs}ms ease-out;
        pointer-events: ${isExiting ? 'none' : 'auto'};
        @media (prefers-reduced-motion: reduce) {
          transition: opacity ${exitDurationMs}ms linear;
          transform: none;
        }
      `}
    >
      {/* ---------- Header — matches the Loading / Healthy pages ---------- */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
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
              <EuiIcon type="productAgent" size="l" color={euiTheme.colors.textDanger} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2
                css={css`
                  text-align: center;
                `}
              >
                {i18n.translate('xpack.observability.nightshift.critical.title', {
                  defaultMessage: 'You have significant events that require escalation',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* ---------- Overview panel: affected entities (Figma 1152:82850) ---------- */}
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
        >
          <EuiText
            size="s"
            css={css`
              color: ${euiTheme.colors.textSubdued};
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {i18n.translate('xpack.observability.nightshift.critical.overviewLabel', {
              defaultMessage: 'Overview',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={4} gutterSize="s">
            {AFFECTED_ENTITIES.map((entity) => (
              <EuiFlexItem key={entity.id}>
                <AffectedEntityCard entity={entity} />
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
          {/* Top: filter + go-to link */}
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
                    'xpack.observability.nightshift.critical.filterLegend',
                    { defaultMessage: 'Filter significant events' }
                  )}
                  buttonSize="compressed"
                  color="primary"
                  idSelected={filter}
                  onChange={setFilter}
                  options={FILTER_OPTIONS.map((opt) => ({
                    id: opt.id,
                    label: opt.label,
                  }))}
                  data-test-subj="nightshiftCriticalFilter"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => {}}
                  data-test-subj="nightshiftCriticalGoToSignificantEventsTop"
                >
                  {i18n.translate(
                    'xpack.observability.nightshift.critical.goToSignificantEvents',
                    { defaultMessage: 'Go to Significant events' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>

            {/*
             * Risk summary + featured event are part of the Active tab
             * only. The In Progress and Archived tabs render a simpler
             * list without these summary panels.
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
           *  - active     → severity-tagged significant events
           *  - inProgress → conversations / tasks currently being worked
           *                 on (Figma node 902:77309) — shell-spinner
           *                 row + title + overflow menu, no badges
           *  - archived   → simple empty state (no archived events yet)
           */}
          {filter === 'active' && (
            <div data-test-subj="nightshiftCriticalActiveList">
              {SIGNIFICANT_EVENTS.map((event, idx) => (
                <SignificantEventRow
                  key={event.id}
                  event={event}
                  isLast={idx === SIGNIFICANT_EVENTS.length - 1}
                />
              ))}
            </div>
          )}
          {filter === 'inProgress' && (
            <div data-test-subj="nightshiftCriticalInProgressList">
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
              data-test-subj="nightshiftCriticalArchivedList"
              css={css`
                padding: ${euiTheme.size.xl} ${euiTheme.size.l};
                background: ${euiTheme.colors.backgroundBasePlain};
                text-align: center;
              `}
            >
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.observability.nightshift.critical.archivedEmpty',
                    { defaultMessage: 'No archived significant events yet.' }
                  )}
                </p>
              </EuiText>
            </div>
          )}

          <EuiHorizontalRule margin="none" />

          {/*
           * Footer copy + actions.
           *
           * Active / Archived tabs get the call-to-action footer
           * (Remediate all + Go to Significant events). The In Progress
           * tab swaps that for a passive text-only footer — there's
           * nothing to remediate, the work is already happening, so the
           * footer just explains the state.
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
                    'xpack.observability.nightshift.critical.inProgressSummary',
                    {
                      defaultMessage:
                        'Currently these tasks are being handled by agents, you can follow the progress by opening the conversations for it.',
                    }
                  )}
                </p>
              </EuiText>
            ) : (
              <>
                <EuiText size="s">
                  <p>
                    {i18n.translate('xpack.observability.nightshift.critical.summary', {
                      defaultMessage:
                        'You can start remediation with Agent Builder now, and get those problems fixed. If you want to see all Significant events, go to the hub.',
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
                      data-test-subj="nightshiftCriticalRemediateAll"
                      isDisabled={isExiting}
                      onClick={() =>
                        start({ initialMessage: REMEDIATE_PROMPT, briefMode: 'critical' })
                      }
                    >
                      {i18n.translate(
                        'xpack.observability.nightshift.critical.remediateAll',
                        { defaultMessage: 'Investigate' }
                      )}
                    </AiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      color="text"
                      data-test-subj="nightshiftCriticalGoToSignificantEvents"
                      onClick={() => {}}
                    >
                      {i18n.translate(
                        'xpack.observability.nightshift.critical.goToSignificantEvents',
                        { defaultMessage: 'Go to Significant events' }
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
