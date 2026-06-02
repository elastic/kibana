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

import { useKibana } from '../../hooks/use_kibana';
import {
  EXPIRING_API_KEYS,
  NIGHTSHIFT_API_KEY_TYPE,
} from './agent_brief/nightshift_api_key_constants';
import {
  NIGHTSHIFT_CREATE_API_KEY_TYPE,
  type NightshiftCreateApiKeyAttachmentData,
} from './agent_brief/nightshift_create_api_key_constants';
import type { NightshiftAttachmentPayload } from './nightshift_attachments';
import { NightshiftExpiringKeysSummary } from './nightshift_expiring_keys_summary';
import { NightshiftSearchHomepageInput } from './nightshift_search_homepage_input';
import { ShellSpinner } from './shell_spinner';

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
 * Prompt sent to Agent Builder when the user clicks the footer's
 * "Create new API keys" CTA — kicks off a guided rotation flow asking
 * the agent to create new keys with the same scopes as the ones that
 * are about to expire, and to walk the user through rotating them
 * safely (i.e. without breaking active integrations).
 */
const ROTATE_API_KEYS_PROMPT = i18n.translate(
  'xpack.searchHomepage.nightshift.rotateApiKeysPrompt',
  {
    defaultMessage:
      'Two API keys in my project are about to expire (`ingest-pipeline` in 1 day and `production-read-write` in 3 days). Please create replacement keys with the same scopes and walk me through rotating them safely so my integrations don\u2019t break.',
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
    variant: 'subdued',
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
    (initialMessage: string, initialAttachments?: NightshiftAttachmentPayload[]) => {
      if (timeoutRef.current) return;
      setIsExiting(true);

      /*
       * Always seed the new conversation with a "Create API key" ticket
       * so the user has an in-conversation affordance to mint a key
       * via the platform-shared `ApiKeyFlyout`. Each conversation gets
       * its own ticket id so the per-attachment "created" store state
       * (see `nightshift_created_api_keys_store`) doesn't bleed across
       * sessions.
       */
      const createTicketId = `nightshift-create-api-key-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
      const createTicket: NightshiftAttachmentPayload<NightshiftCreateApiKeyAttachmentData> = {
        id: createTicketId,
        type: NIGHTSHIFT_CREATE_API_KEY_TYPE,
        data: { id: createTicketId },
      };

      const combinedAttachments: NightshiftAttachmentPayload[] = [
        ...(initialAttachments ?? []),
        createTicket,
      ];

      timeoutRef.current = setTimeout(() => {
        application.navigateToApp(AGENT_BUILDER_APP_ID, {
          path: `/agents/${NIGHTSHIFT_AGENT_ID}/conversations/new`,
          state: {
            initialMessage,
            agentId: NIGHTSHIFT_AGENT_ID,
            sidebarCondensed: true,
            /*
             * `initialAttachments` is consumed by Agent Builder's
             * `RoutedConversationsProvider`: each entry's `type` maps
             * to a registered `AttachmentUIDefinition` and the `data`
             * is rendered by that definition. We always include the
             * blank "Create API key" ticket and append any payloads
             * the user staged via paperclip (existing API keys) or
             * the footer CTA (one ticket per expiring key).
             */
            initialAttachments: combinedAttachments,
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
            /*
             * Critical: keep \`transform\` as \`none\` in the rest state.
             * \`translateY(0)\` looks like a no-op but creates a new
             * containing block for any descendant with \`position: fixed\`,
             * which broke EuiFlyout (type="push") — the flyout pinned
             * itself to this 753px column instead of the viewport edge.
             * Browsers happily interpolate between \`none\` and
             * \`translateY(...)\`, so the exit transition still plays.
             */
            transform: ${isExiting ? 'translateY(-6px)' : 'none'};
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
                    background: ${euiTheme.colors.backgroundBasePrimary};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <EuiIcon type="workplaceSearchApp" size="l" color={euiTheme.colors.textPrimary} />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="m">
                  <h2>
                    {i18n.translate('xpack.searchHomepage.nightshift.title', {
                      defaultMessage: 'Welcome to your VectorDB workspace',
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
                        "VectorDB is keeping an eye on your project — vector data, indices, agents, tools, and workflows.",
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

              {/*
               * Footer section — VectorDB "Expiring API keys" summary.
               * Mirrors the obs Nightshift Morning footer (accordion of
               * actionable items + single AI CTA): two keys nearing
               * expiry, with a primary button that hands off to the
               * Elastic AI Agent to mint replacements and walk the user
               * through rotating them.
               */}
              <div
                css={css`
                  padding: ${euiTheme.size.base} ${euiTheme.size.l};
                  background: ${euiTheme.colors.backgroundBasePlain};
                `}
                data-test-subj="nightshiftSearchHomepageExpiringKeysFooter"
              >
                <NightshiftExpiringKeysSummary
                  isExiting={isExiting}
                  onRotateKeys={() =>
                    start(
                      ROTATE_API_KEYS_PROMPT,
                      /*
                       * Footer "Create new API keys" CTA: hand off to
                       * the agent with one attachment per expiring
                       * key, mirroring the obs Nightshift "Morning"
                       * pattern where every fixed event ships as its
                       * own attachment on the new conversation.
                       */
                      EXPIRING_API_KEYS.map((apiKey) => ({
                        id: `nightshift-api-key-${apiKey.id}`,
                        type: NIGHTSHIFT_API_KEY_TYPE,
                        data: apiKey,
                      }))
                    )
                  }
                />
              </div>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={bottomBarStyles}>
        <NightshiftSearchHomepageInput
          onSubmit={(prompt, attachments) => start(prompt, attachments)}
          isDisabled={isExiting}
        />
      </div>
    </div>
  );
};
