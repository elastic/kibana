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
import { AiButton } from '@kbn/shared-ux-ai-components';

import { useStartNightshiftConversation } from './use_start_nightshift_conversation';

/**
 * Prompt sent to Agent Builder when the user clicks "Onboard with Agent" —
 * kicks off a guided flow that asks the agent to walk the user through
 * creating an API key and connecting their Elasticsearch project.
 */
const ONBOARD_WITH_AGENT_PROMPT = i18n.translate(
  'xpack.observability.nightshift.search.onboardWithAgentPrompt',
  {
    defaultMessage:
      'Help me connect my Elasticsearch project: create an API key and walk me through the next steps.',
  }
);

/* ----------------------------------------------------------------------- *
 * Overview stats — Search / VectorDB resource counts. Values are
 * illustrative; the Search variant of Nightshift is still a prototype
 * and has no live wiring yet, so these mirror the Figma placeholders.
 * ----------------------------------------------------------------------- */

type StatVariant = 'success' | 'warning' | 'subdued' | 'none';

interface OverviewStat {
  id: string;
  label: string;
  iconType?: IconType;
  value: string;
  variant: StatVariant;
}

const OVERVIEW_STATS: OverviewStat[] = [
  {
    id: 'vectorDocuments',
    label: i18n.translate('xpack.observability.nightshift.search.stat.vectorDocuments', {
      defaultMessage: 'Vector documents',
    }),
    iconType: 'tokenVectorDense',
    value: '1.4M',
    variant: 'success',
  },
  {
    id: 'indices',
    label: i18n.translate('xpack.observability.nightshift.search.stat.indices', {
      defaultMessage: 'Indices',
    }),
    iconType: 'indexOpen',
    value: '12',
    variant: 'subdued',
  },
  {
    id: 'storage',
    label: i18n.translate('xpack.observability.nightshift.search.stat.storage', {
      defaultMessage: 'Storage',
    }),
    iconType: 'storage',
    value: '2.4 GB',
    variant: 'subdued',
  },
  {
    id: 'agents',
    label: i18n.translate('xpack.observability.nightshift.search.stat.agents', {
      defaultMessage: 'Agents',
    }),
    iconType: 'users',
    value: '4',
    variant: 'subdued',
  },
  {
    id: 'tools',
    label: i18n.translate('xpack.observability.nightshift.search.stat.tools', {
      defaultMessage: 'Tools',
    }),
    iconType: 'wrench',
    value: '18',
    variant: 'subdued',
  },
  {
    id: 'workflows',
    label: i18n.translate('xpack.observability.nightshift.search.stat.workflows', {
      defaultMessage: 'Workflows',
    }),
    iconType: 'branch',
    value: '7',
    variant: 'subdued',
  },
];

const STAT_GLYPH_BG_SIZE = 24;

/**
 * Resolve the background + foreground colour pair for a stat glyph,
 * based on the stat's `variant`. Same mapping as `NightshiftHealthy` so
 * the visual language stays consistent across the Nightshift surface.
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
 * "Search" Nightshift page. Mounted by `NightshiftPage` when the chrome
 * status dropdown is set to `'search'` — the option only appears in
 * spaces whose `solution` is `'es'` (Search).
 *
 * Mirrors the Healthy layout (header avatar + title + description, one
 * consolidated Overview panel with a stat grid and a footer CTA), but
 * the content is Search/VectorDB-flavoured: vector documents / indices
 * / storage / agents / tools / workflows in the grid, and a "Connect
 * Elasticsearch" footer with two buttons (Onboard with Agent, Go to
 * Management) for the empty-project onboarding case.
 */
export const NightshiftSearch: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { isExiting, start, exitDurationMs } = useStartNightshiftConversation();

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="l"
      responsive={false}
      data-test-subj="nightshiftSearchPage"
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
              <EuiIcon type="search" size="l" color={euiTheme.colors.textSuccess} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.observability.nightshift.search.title', {
                  defaultMessage: 'Your search workspace is ready',
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
                {i18n.translate('xpack.observability.nightshift.search.description', {
                  defaultMessage:
                    'Nightshift is keeping an eye on your project — vector data, indices, agents, tools, and workflows. Connect Elasticsearch to start ingesting your data.',
                })}
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
          {/*
           * Overview section — header (label + icon) + 3-column stat
           * grid. Visually identical to Healthy's Overview, just with
           * the Search/VectorDB stats and a 3×2 grid (Healthy uses 4×2).
           */}
          <div
            css={css`
              background: ${euiTheme.colors.backgroundBaseSubdued};
              padding: ${euiTheme.size.l};
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
                <EuiTitle size="xxs">
                  <h6>
                    {i18n.translate('xpack.observability.nightshift.search.overviewLabel', {
                      defaultMessage: 'Overview',
                    })}
                  </h6>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="search" color="subdued" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGrid columns={3} gutterSize="s">
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

          {/*
           * Footer — onboarding CTA. Same panel structure as the Loading
           * page's follow-up footer: short summary copy followed by a
           * primary (AI) action and a secondary (empty) action.
           */}
          <div
            css={css`
              padding: ${euiTheme.size.base} ${euiTheme.size.l};
              background: ${euiTheme.colors.backgroundBasePlain};
            `}
            data-test-subj="nightshiftSearchConnectFooter"
          >
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.observability.nightshift.search.connectCopy', {
                  defaultMessage:
                    'You can connect Elasticsearch to your project by creating an API key.',
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
                  data-test-subj="nightshiftSearchOnboardWithAgent"
                  isDisabled={isExiting}
                  onClick={() => start({ initialMessage: ONBOARD_WITH_AGENT_PROMPT })}
                >
                  {i18n.translate('xpack.observability.nightshift.search.onboardWithAgent', {
                    defaultMessage: 'Onboard with Agent',
                  })}
                </AiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AiButton
                  variant="empty"
                  size="s"
                  data-test-subj="nightshiftSearchGoToManagement"
                  isDisabled={isExiting}
                  // Placeholder — wire to the Search/Management deep link
                  // (e.g. API keys management) when the destination app
                  // is finalised for the Search Nightshift surface.
                  onClick={() => {}}
                >
                  {i18n.translate('xpack.observability.nightshift.search.goToManagement', {
                    defaultMessage: 'Go to Management',
                  })}
                </AiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
