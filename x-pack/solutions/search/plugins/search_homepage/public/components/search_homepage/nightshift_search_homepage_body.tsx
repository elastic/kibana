/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';

import {
  EuiButtonEmpty,
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

import { useKibana } from '../../hooks/use_kibana';
import { NightshiftSearchHomepageInput } from './nightshift_search_homepage_input';
import { ShellSpinner } from './shell_spinner';
import searchLabsHero from './search_labs_hero.webp';

/* ----------------------------------------------------------------------- *
 * Nightshift "Search" homepage — mirrors the obs Nightshift Healthy
 * layout (header avatar + title + description, one consolidated Overview
 * panel with a stat grid and an inline footer CTA), but the content is
 * VectorDB / Search-flavoured: vector documents / indices / storage /
 * agents / tools / workflows in the grid, and a "Connect Elasticsearch"
 * footer with two buttons (Onboard with Agent, Go to Management).
 *
 * Co-located inside the `searchHomepage` plugin (rather than imported
 * from the observability Nightshift module) because cross-solution
 * imports are forbidden by the module visibility rules. The visual
 * language is intentionally identical to the obs `NightshiftSearch`
 * page so the two surfaces stay in sync as the prototype evolves.
 * ----------------------------------------------------------------------- */

/** Kibana app id of the Agent Builder application. */
const AGENT_BUILDER_APP_ID = 'agent_builder';
/** Agent id used as the "Nightshift host" — opens a conversation with this agent. */
const NIGHTSHIFT_AGENT_ID = 'elastic-ai-agent';

/** Short fade applied to the page contents before navigating away. */
const EXIT_FADE_DURATION_MS = 225;

/**
 * Prompt sent to Agent Builder when the user clicks "Onboard with Agent" —
 * kicks off a guided flow that asks the agent to walk the user through
 * creating an API key and connecting their Elasticsearch project.
 */
const ONBOARD_WITH_AGENT_PROMPT = i18n.translate(
  'xpack.searchHomepage.nightshift.onboardWithAgentPrompt',
  {
    defaultMessage:
      'Help me connect my Elasticsearch project: create an API key and walk me through the next steps.',
  }
);

type StatVariant = 'success' | 'warning' | 'subdued' | 'none';

interface OverviewStat {
  id: string;
  label: string;
  iconType?: IconType;
  /**
   * Render the terminal-style `ShellSpinner` instead of an EUI icon —
   * used for stats that represent an actively running background job
   * (e.g. workflows). Mutually exclusive with `iconType`.
   */
  isSpinner?: boolean;
  value: string;
  variant: StatVariant;
}

const OVERVIEW_STATS: OverviewStat[] = [
  {
    id: 'vectorDocuments',
    label: i18n.translate('xpack.searchHomepage.nightshift.stat.vectorDocuments', {
      defaultMessage: 'Vector documents',
    }),
    iconType: 'tokenVectorDense',
    value: '1.4M',
    variant: 'success',
  },
  {
    id: 'indices',
    label: i18n.translate('xpack.searchHomepage.nightshift.stat.indices', {
      defaultMessage: 'Indices',
    }),
    iconType: 'indexOpen',
    value: '12',
    variant: 'subdued',
  },
  {
    id: 'storage',
    label: i18n.translate('xpack.searchHomepage.nightshift.stat.storage', {
      defaultMessage: 'Storage',
    }),
    iconType: 'storage',
    value: '2.4 GB',
    variant: 'subdued',
  },
  {
    id: 'agents',
    label: i18n.translate('xpack.searchHomepage.nightshift.stat.agents', {
      defaultMessage: 'Agents',
    }),
    iconType: 'users',
    value: '4',
    variant: 'subdued',
  },
  {
    id: 'tools',
    label: i18n.translate('xpack.searchHomepage.nightshift.stat.tools', {
      defaultMessage: 'Tools',
    }),
    iconType: 'wrench',
    value: '18',
    variant: 'subdued',
  },
  {
    id: 'workflows',
    label: i18n.translate('xpack.searchHomepage.nightshift.stat.workflows', {
      defaultMessage: 'Workflows',
    }),
    // The workflows row uses the terminal-style shell loader to signal
    // that one or more workflows are actively running in the background.
    isSpinner: true,
    value: '7',
    variant: 'subdued',
  },
];

const STAT_GLYPH_BG_SIZE = 24;

/**
 * Resolve the background + foreground colour pair for a stat glyph,
 * based on the stat's `variant`. Same mapping as the obs Nightshift
 * Healthy/Search pages so the visual language stays consistent.
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
 * Hand off to the Elastic AI Agent in Agent Builder with an auto-sent
 * initial prompt — same pattern as the obs Nightshift handoff. Pure
 * `navigateToApp` so we don't have to take a hard dep on Agent Builder
 * (it stays an optional plugin on `searchHomepage`).
 */
const useStartAgentConversation = () => {
  const {
    services: { application },
  } = useKibana();
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const start = useCallback(
    (initialMessage: string) => {
      if (timeoutRef.current) return;
      setIsExiting(true);
      timeoutRef.current = setTimeout(() => {
        application.navigateToApp(AGENT_BUILDER_APP_ID, {
          path: `/agents/${NIGHTSHIFT_AGENT_ID}/conversations/new`,
          state: {
            initialMessage,
            agentId: NIGHTSHIFT_AGENT_ID,
            sidebarCondensed: true,
          },
        });
      }, EXIT_FADE_DURATION_MS);
    },
    [application]
  );

  return { isExiting, start, exitDurationMs: EXIT_FADE_DURATION_MS };
};

/**
 * Nightshift-style body for the Search homepage. Renders the header,
 * Overview stat grid, the Connect-Elasticsearch footer CTA, plus a
 * sticky-bottom agent chat input — see top-of-file comment for the
 * visual contract with the obs Nightshift page.
 *
 * Layout mirrors the obs `NightshiftPage` analyzing view:
 *  - Column flex container at least one viewport tall (uses Kibana's
 *    `--kbn-application--content-height` custom property when present)
 *    so the input can sticky-pin to the bottom even on short content.
 *  - Top section is `flex: 1` and vertically centers the Nightshift
 *    content (header + Overview panel).
 *  - Bottom section is `position: sticky; bottom: 0` so the input bar
 *    stays visible when the page content scrolls.
 *
 * Both the footer "Onboard with Agent" button and the bottom input
 * dispatch the same `start(prompt)` flow — they share `isExiting` so
 * the whole surface fades together before navigating to Agent Builder.
 */
export const NightshiftSearchHomepageBody: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { isExiting, start, exitDurationMs } = useStartAgentConversation();

  /*
   * Bottom-anchored input bar. The opaque page-color background prevents
   * scrolling content from bleeding through, and the subtle top border
   * separates the bar from the content scrolling beneath it.
   *
   * Negative horizontal margin + matching padding extend the background
   * to the full content width (otherwise the surrounding page bg would
   * peek through the column's side padding).
   */
  /*
   * Use `backgroundBasePlain` (white in light mode) to match the
   * `KibanaPageTemplate` content area. Earlier this used
   * `euiTheme.colors.body` which resolves to the global Kibana body
   * colour (~rgb(246, 249, 252)) and visibly differed from the page bg.
   */
  const bottomBarStyles = useMemo(
    () => css`
      position: sticky;
      bottom: 0;
      z-index: 2;
      width: calc(100% + 32px);
      margin: 0 -16px;
      padding: 8px 16px 16px;
      background: ${euiTheme.colors.backgroundBasePlain};
    `,
    [euiTheme]
  );

  return (
    <div
      data-test-subj="nightshiftSearchHomepage"
      css={css`
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        min-height: var(--kbn-application--content-height, 100vh);
        padding: 64px 16px 0;
        position: relative;
        isolation: isolate;
        /*
         * Hero background — Elastic Search Labs' \`hp-header::before\`
         * webp (sanity-hosted, downloaded locally during prototype
         * setup). Pinned to the top of the column and faded so the
         * Nightshift content + sticky input stay legible. The fade
         * is implemented with a mask-image bottom-to-top gradient
         * instead of touching the image asset itself, so swapping
         * the webp is a one-line change.
         */
        &::before {
          content: '';
          position: absolute;
          inset: 0 0 auto 0;
          height: 520px;
          background-image: url('${searchLabsHero}');
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center top;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 100%);
          -webkit-mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0) 100%
          );
          opacity: 0.65;
          pointer-events: none;
          z-index: -1;
        }
      `}
    >
      <div
        css={css`
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding-bottom: 16px;
        `}
      >
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          gutterSize="l"
          responsive={false}
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
                  <EuiIcon type="productAgent" size="l" color={euiTheme.colors.textSuccess} />
                </div>
              </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.searchHomepage.nightshift.title', {
                  defaultMessage: 'All systems operating as expected',
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
                {i18n.translate('xpack.searchHomepage.nightshift.description', {
                  defaultMessage:
                    "No big spikes or drops to flag \u2014 this is the steady pattern we'd expect based on the recent activity in the Overview below.",
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
                    {i18n.translate('xpack.searchHomepage.nightshift.overviewLabel', {
                      defaultMessage: 'Overview',
                    })}
                  </h6>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  color="text"
                  data-test-subj="nightshiftSearchGoToAgents"
                  // Placeholder — wire to the Agents deep link in
                  // Agent Builder when the destination is finalised.
                  onClick={() => {}}
                >
                  {i18n.translate('xpack.searchHomepage.nightshift.goToAgents', {
                    defaultMessage: 'Go to Agents',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
            <EuiFlexGrid columns={3} gutterSize="s">
              {OVERVIEW_STATS.map((stat) => {
                const showGlyph =
                  stat.variant !== 'none' && (Boolean(stat.iconType) || stat.isSpinner);
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
                              {stat.isSpinner ? (
                                <ShellSpinner size={14} aria-label={`${stat.label} running`} />
                              ) : (
                                <EuiIcon
                                  type={stat.iconType ?? 'empty'}
                                  size="s"
                                  color={iconColor}
                                />
                              )}
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

              <div
                css={css`
                  padding: ${euiTheme.size.base} ${euiTheme.size.l};
                  background: ${euiTheme.colors.backgroundBasePlain};
                `}
                data-test-subj="nightshiftSearchHomepageConnectFooter"
              >
                <EuiText size="s">
                  <p>
                    {i18n.translate('xpack.searchHomepage.nightshift.connectCopy', {
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
                      data-test-subj="nightshiftSearchHomepageOnboardWithAgent"
                      isDisabled={isExiting}
                      onClick={() => start(ONBOARD_WITH_AGENT_PROMPT)}
                    >
                      {i18n.translate('xpack.searchHomepage.nightshift.onboardWithAgent', {
                        defaultMessage: 'Onboard with Agent',
                      })}
                    </AiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <AiButton
                      variant="empty"
                      size="s"
                      data-test-subj="nightshiftSearchHomepageGoToManagement"
                      isDisabled={isExiting}
                      // Placeholder — wire to the API keys / Stack Management
                      // deep link when the destination is finalised for the
                      // Search Nightshift surface.
                      onClick={() => {}}
                    >
                      {i18n.translate('xpack.searchHomepage.nightshift.goToManagement', {
                        defaultMessage: 'Go to Management',
                      })}
                    </AiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={bottomBarStyles}>
        <NightshiftSearchHomepageInput
          onSubmit={(prompt) => start(prompt)}
          isDisabled={isExiting}
        />
      </div>
    </div>
  );
};
