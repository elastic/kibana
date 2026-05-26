/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { usePluginContext } from '../../hooks/use_plugin_context';
import { NightshiftWelcome } from './nightshift_welcome';
import { NightshiftLoading } from './nightshift_loading';
import { NightshiftHealthy } from './nightshift_healthy';
import { NightshiftCritical } from './nightshift_critical';
import { NightshiftInput } from './nightshift_input';
import { useStartNightshiftConversation } from './use_start_nightshift_conversation';
import { nightshiftStatus$, type NightshiftStatus } from './nightshift_state';

export const NIGHTSHIFT_PAGE_ID = 'nightshift-welcome-container';

/** Duration of the welcome→analyzing fade transition. */
const VIEW_TRANSITION_MS = 225;

const fadeInKeyframes = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

/*
 * The analyzing view spans the full content area so the textbox at the
 * bottom can be sticky-pinned to the page edge and the central panel
 * can vertically center within the remaining area.
 *
 * `--kbn-application--content-height` is set by Kibana's chrome to the
 * actual content area height (viewport minus chrome). Using it as a
 * `min-height` is more reliable than `height: 100%`, which doesn't
 * propagate cleanly through `EuiPageSection alignment="top"` — that's
 * what was causing the input to float in the middle rather than pin to
 * the bottom.
 *
 * Layout:
 *   - The wrapper is a column flex container, at least the content
 *     area tall, so the top section can flex-grow to fill it on short
 *     status pages (loading / healthy) and keep the input pinned to
 *     the viewport bottom.
 *   - The top section is `flex: 1` so it always expands.
 *   - The bottom section is `position: sticky; bottom: 0` so it stays
 *     pinned to the viewport bottom even when the status page content
 *     (e.g. the Critical page) exceeds the viewport — the user can
 *     scroll the content underneath and the input remains visible.
 *
 * Horizontal padding (16px) matches Agent Builder's
 * `conversationElementPaddingStyles` so the textbox sits at the exact
 * same coordinate as Agent Builder — no visual jump on transition. See
 * `agent_builder/public/application/components/conversations/conversation.styles.ts`.
 *
 * Top padding (64px) is Nightshift-specific so the central analyzing
 * panel sits roughly where the Figma places it.
 */
const analyzingViewStyles = css`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-height: var(--kbn-application--content-height, 100vh);
  padding: 64px 16px 0;
  animation: ${fadeInKeyframes} 280ms ease-out both;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/*
 * The top half of the analyzing view. `flex: 1` so it expands to fill
 * the remaining space above the sticky input — when status page content
 * is shorter than the viewport, the inner content stays vertically
 * centered. The bottom padding (16px) creates breathing room between
 * the page content and the sticky input bar.
 */
const analyzingTopStyles = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-bottom: 16px;
`;

/**
 * Maps a `NightshiftStatus` value (driven by the chrome dropdown) to the
 * page component to render in the centered "content slot" of the
 * analyzing view. The bottom textbox is the same on every status.
 *
 *   loading  → NightshiftLoading   ("We are still analysing your data …")
 *   healthy  → NightshiftHealthy   ("You have no critical significant events")
 *   critical → NightshiftCritical  (TODO — populated in a follow-up)
 */
const STATUS_PAGES: Record<NightshiftStatus, React.FC> = {
  loading: NightshiftLoading,
  healthy: NightshiftHealthy,
  critical: NightshiftCritical,
};

/**
 * Landing page for the experimental Nightshift solution view.
 *
 * Replaces the standard observability overview when a space's `solution`
 * is set to `'nightshift'`. Two states:
 *
 *  1. **Welcome** — initial empty state with the moon illustration and
 *     an "Enable Nightshift" CTA. Shown only while the user hasn't
 *     enabled Nightshift and the chrome status dropdown is still on its
 *     default value (`loading`).
 *
 *  2. **Analyzing** — centered content driven directly by the chrome
 *     status dropdown (`nightshiftStatus$`). Picking `loading` /
 *     `healthy` / `critical` swaps the centered panel via `STATUS_PAGES`.
 *     The bottom textbox stays mounted across status changes so the
 *     visual layout is stable.
 *
 * The page subscribes to `nightshiftStatus$` directly (not via
 * `useObservable`) to avoid any singleton/bundling concerns — the
 * chrome status control lives in a separate React root (mounted via
 * `chrome.navControls.registerRight`) and we want both ends to share
 * the exact same BehaviorSubject instance and re-render reliably.
 */
export function NightshiftPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { euiTheme } = useEuiTheme();
  const [isWelcomeExiting, setIsWelcomeExiting] = useState(false);
  const { isExiting: isAnalyzingExiting, start } = useStartNightshiftConversation();

  /*
   * Sticky input bar — pinned to the viewport bottom and stacked above
   * page content so the user always has the agent input available even
   * when the status page (e.g. Critical) is taller than the viewport.
   *
   * The opaque page-color background prevents scrolling content from
   * bleeding through. The subtle top border separates the bar from the
   * content scrolling under it. Negative horizontal margin + padding
   * extend the background full-width to cover the wrapper's 16px side
   * padding (otherwise the page bg would peek through the sides).
   *
   * `z-index: 2` is enough to clear sibling page content; Kibana chrome
   * sits at much higher levels so the bar never overlaps the header.
   */
  const analyzingBottomStyles = useMemo(
    () => css`
      position: sticky;
      bottom: 0;
      z-index: 2;
      width: calc(100% + 32px);
      margin: 0 -16px;
      padding: 8px 16px 16px;
    `,
    [euiTheme]
  );

  // Direct subscription to the chrome dropdown's BehaviorSubject. We
  // explicitly avoid `useObservable` from `react-use` here so the
  // subscription lifecycle is unambiguous and easy to debug.
  const [status, setStatus] = useState<NightshiftStatus>(() =>
    nightshiftStatus$.getValue()
  );
  useEffect(() => {
    const subscription = nightshiftStatus$.subscribe((next) => {
      setStatus(next);
    });
    return () => subscription.unsubscribe();
  }, []);

  // The user has "enabled" Nightshift once they either click the welcome
  // CTA or pick any non-loading status from the chrome dropdown. After
  // that the analyzing view takes over and stays there for the rest of
  // the session — flipping back to `loading` does not re-show welcome.
  const [hasEnabled, setHasEnabled] = useState<boolean>(
    () => nightshiftStatus$.getValue() !== 'loading'
  );

  // Auto-enable when the chrome dropdown selects a non-loading status.
  // This is what fixes the "I don't see anything different when I pick
  // Healthy" issue — without it, the welcome view would stay mounted
  // even after the user explicitly changes the status.
  useEffect(() => {
    if (status !== 'loading' && !hasEnabled) {
      setHasEnabled(true);
    }
  }, [status, hasEnabled]);

  const handleEnable = useCallback(() => {
    setIsWelcomeExiting(true);
    window.setTimeout(() => setHasEnabled(true), VIEW_TRANSITION_MS);
  }, []);

  const handlePromptSubmit = useCallback(
    (prompt: string) => {
      // Pass the current status so the new Agent Builder conversation
      // lands with the matching Nightshift snapshot pre-attached as the
      // "Agent brief".
      start({ initialMessage: prompt, briefMode: status });
    },
    [start, status]
  );

  const StatusPage = STATUS_PAGES[status];
  const showWelcome = !hasEnabled;

  return (
    <ObservabilityPageTemplate
      data-test-subj={NIGHTSHIFT_PAGE_ID}
      isEmptyState={showWelcome}
      pageSectionProps={{
        paddingSize: 'none',
        // `grow: true` makes the EuiPageSection take all available
        // vertical space — combined with `--kbn-application--content-height`
        // on the inner wrapper this gets the textbox flush to the page
        // bottom on both views.
        grow: true,
      }}
    >
      {showWelcome ? (
        <NightshiftWelcome onEnable={handleEnable} isExiting={isWelcomeExiting} />
      ) : (
        <div
          css={analyzingViewStyles}
          data-test-subj="nightshiftAnalyzingView"
          data-nightshift-status={status}
        >
          {/*
           * `key={status}` forces React to fully unmount the previous
           * status page and mount the new one whenever the chrome
           * dropdown flips. This is intentional: each page (loading /
           * healthy / critical) has its own internal hooks + fade-in
           * animation, and remounting guarantees the animation plays
           * and there's zero risk of stale hook state across statuses.
           */}
          <div css={analyzingTopStyles} key={status}>
            <StatusPage />
          </div>
          <div css={analyzingBottomStyles}>
            <NightshiftInput onSubmit={handlePromptSubmit} isDisabled={isAnalyzingExiting} />
          </div>
        </div>
      )}
    </ObservabilityPageTemplate>
  );
}
