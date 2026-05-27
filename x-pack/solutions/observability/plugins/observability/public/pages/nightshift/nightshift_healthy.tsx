/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NightshiftContextLayerTasksPanel } from './nightshift_context_layer_tasks_panel';
import { NightshiftFixedEventsSummary } from './nightshift_fixed_events_summary';
import { useStartNightshiftConversation } from './use_start_nightshift_conversation';
import type { NightshiftStatus } from './nightshift_state';

const HEALTHY_DESCRIPTION = i18n.translate(
  'xpack.observability.nightshift.healthy.description',
  {
    defaultMessage:
      'Currently your systems seems stable and there are no underlying significant events detected.',
  }
);

export type NightshiftHealthySummarySection = 'default' | 'fixedEvents';

export interface NightshiftHealthyProps {
  dataTestSubj?: string;
  description?: string;
  /** Passed to Agent Builder as the agent-brief attachment mode. */
  briefMode?: Extract<NightshiftStatus, 'healthy' | 'morning'>;
  /**
   * `default` — overview stats only; context layer panel below.
   * `fixedEvents` — accordion of resolved significant events + Summarise.
   */
  summarySection?: NightshiftHealthySummarySection;
}

const STAT_GLYPH_BG_SIZE = 24;

/**
 * Visual variants for an Overview stat tile. Drives the colour of the
 * small icon badge next to the value, modeled after the Figma design
 * (node 934:80103 — Nightshift › Healthy state).
 *
 * - `success`  — green tile (e.g. Entities, Critical risk = 0)
 * - `warning`  — amber tile (e.g. High risk = 0)
 * - `subdued`  — neutral grey tile (default for low-signal metrics)
 * - `none`     — value-only, no icon tile rendered
 */
type StatVariant = 'success' | 'warning' | 'subdued' | 'none';

interface OverviewStat {
  id: string;
  label: string;
  value: string;
  iconType?: IconType;
  variant: StatVariant;
}

/**
 * Stats shown in the 2×4 Overview grid. Values are illustrative —
 * Nightshift is still a prototype, so these are placeholders that
 * mirror the Figma reference rather than live data.
 */
const OVERVIEW_STATS: OverviewStat[] = [
  { id: 'entities', label: 'Entities', iconType: 'layers', value: '24', variant: 'success' },
  { id: 'service', label: 'Service', iconType: 'node', value: '4', variant: 'subdued' },
  {
    id: 'technologies',
    label: 'Technologies',
    iconType: 'package',
    value: '8',
    variant: 'subdued',
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    iconType: 'kubernetesPod',
    value: '8',
    variant: 'subdued',
  },
  {
    id: 'criticalRisk',
    label: 'Critical risk',
    iconType: 'radar',
    value: '0',
    variant: 'success',
  },
  { id: 'highRisk', label: 'High risk', iconType: 'warning', value: '0', variant: 'warning' },
  { id: 'mediumRisk', label: 'Medium risk', value: '1', variant: 'none' },
  { id: 'lowRisk', label: 'Low risk', value: '12', variant: 'none' },
];

const SUMMARISE_PROMPT = i18n.translate('xpack.observability.nightshift.morning.summarisePrompt', {
  defaultMessage:
    'Summarise the significant events that were fixed overnight and what happened in the last 8 hours.',
});

/**
 * Resolve the background + foreground colour pair for a stat glyph,
 * based on the stat's `variant`. We map onto EUI semantic background
 * tokens so the colours stay coherent in light/dark mode.
 */
const getStatGlyphColors = (
  variant: StatVariant,
  theme: ReturnType<typeof useEuiTheme>['euiTheme']
): { background: string; iconColor: string } => {
  switch (variant) {
    case 'success':
      return {
        background: theme.colors.backgroundBaseSuccess,
        iconColor: theme.colors.textSuccess,
      };
    case 'warning':
      return {
        background: theme.colors.backgroundBaseWarning,
        iconColor: theme.colors.textWarning,
      };
    case 'subdued':
    default:
      return {
        background: theme.colors.borderBaseSubdued,
        iconColor: theme.colors.textSubdued,
      };
  }
};

/**
 * "Healthy" Nightshift page. Mounted by `NightshiftPage` when the chrome
 * status dropdown is set to `'healthy'`.
 *
 * Mirrors the Figma layout at node 934:80103: header (smiley avatar +
 * title + description) + Overview panel with a 2×4 stat grid + summary
 * section (morning only) or context layer tasks panel (healthy).
 */
export const NightshiftHealthy: React.FC<NightshiftHealthyProps> = ({
  dataTestSubj = 'nightshiftHealthyPage',
  description = HEALTHY_DESCRIPTION,
  briefMode = 'healthy',
  summarySection = 'default',
}) => {
  const { euiTheme } = useEuiTheme();
  const { isExiting, start, exitDurationMs } = useStartNightshiftConversation();

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="l"
      responsive={false}
      data-test-subj={dataTestSubj}
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
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              aria-hidden
              css={css`
                width: 40px;
                height: 40px;
                border-radius: 20px;
                background: ${euiTheme.colors.backgroundBaseSuccess};
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              <EuiIcon type="faceHappy" size="l" color={euiTheme.colors.textSuccess} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.observability.nightshift.healthy.title', {
                  defaultMessage: 'You have no critical significant events',
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
                {description}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

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
          <div
            css={css`
              background: ${euiTheme.colors.backgroundBaseSubdued};
              padding: ${euiTheme.size.l};
              border-bottom: ${summarySection === 'fixedEvents' ? euiTheme.border.thin : 'none'};
            `}
          >
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h6>
                    {i18n.translate('xpack.observability.nightshift.healthy.overviewLabel', {
                      defaultMessage: 'Overview',
                    })}
                  </h6>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="sun" color="subdued" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGrid columns={4} gutterSize="s">
              {OVERVIEW_STATS.map((stat) => {
                const showGlyph = stat.variant !== 'none' && Boolean(stat.iconType);
                const { background, iconColor } = getStatGlyphColors(stat.variant, euiTheme);
                return (
                  <EuiFlexItem key={stat.id}>
                    <EuiPanel paddingSize="s" hasShadow={false} hasBorder color="plain">
                      <EuiText size="xs">
                        <strong>{stat.label}</strong>
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                        {showGlyph && (
                          <EuiFlexItem grow={false}>
                            <span
                              css={css`
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                width: ${STAT_GLYPH_BG_SIZE}px;
                                height: ${STAT_GLYPH_BG_SIZE}px;
                                border-radius: ${euiTheme.border.radius.small};
                                background: ${background};
                              `}
                            >
                              <EuiIcon
                                type={stat.iconType ?? 'empty'}
                                size="s"
                                color={iconColor}
                              />
                            </span>
                          </EuiFlexItem>
                        )}
                        <EuiFlexItem grow={false}>
                          <EuiText size="m">
                            <strong>{stat.value}</strong>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGrid>
          </div>
          {summarySection === 'fixedEvents' ? (
            <div
              css={css`
                padding: ${euiTheme.size.base} ${euiTheme.size.l};
              `}
            >
              <NightshiftFixedEventsSummary
                isExiting={isExiting}
                onSummarise={() => start({ initialMessage: SUMMARISE_PROMPT, briefMode })}
              />
            </div>
          ) : null}
        </EuiPanel>
      </EuiFlexItem>

      {summarySection === 'default' ? <NightshiftContextLayerTasksPanel isExiting={isExiting} /> : null}
    </EuiFlexGroup>
  );
};
