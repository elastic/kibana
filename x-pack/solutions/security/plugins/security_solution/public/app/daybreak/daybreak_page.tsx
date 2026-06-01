/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

import { DaybreakCritical } from './daybreak_critical';
import { DaybreakHealthy } from './daybreak_healthy';
import { DaybreakInput } from './daybreak_input';
import { daybreakStatus$, type DaybreakStatus } from './daybreak_state';
import { useStartDaybreakConversation } from './use_start_daybreak_conversation';

/**
 * Common props every status page receives. The page owns one
 * `useStartDaybreakConversation` instance and shares it with each
 * mounted status page so any CTA — the bottom chat input, the
 * Critical footer "Investigate" button, future per-row actions —
 * triggers the same page-level fade + Agent Builder hand-off.
 */
interface DaybreakStatusPageProps {
  onStartConversation: (prompt: string) => void;
  isExiting: boolean;
}

/**
 * Daybreak landing page for the Security solution.
 *
 * Mounted at `/app/security/daybreak`. Subscribes to the global
 * `daybreakStatus$` BehaviorSubject (driven by the chrome dropdown
 * registered in the security plugin's `start` lifecycle) and
 * delegates to the matching content component:
 *
 *   healthy  → DaybreakHealthy   ("steady" overview + stat grid)
 *   critical → DaybreakCritical  (impact summary + risk + queue)
 *
 * Layout mirrors obs Nightshift / Search VectorDB:
 *  - Column flex container at least one viewport tall (uses Kibana's
 *    `--kbn-application--content-height` custom property when present)
 *    so the input can sticky-pin to the bottom even on short content.
 *  - Top section is `flex: 1` and renders the active status page.
 *  - Bottom section is `position: sticky; bottom: 0` so the agent
 *    chat input bar stays visible when the page content scrolls.
 *
 * Submitting the input — from any state — flips `isExiting`, fades
 * the page out, then `navigateToApp('agent_builder', …)` opens a new
 * conversation with the prompt pre-staged. Same behaviour as the obs
 * Nightshift and Search VectorDB surfaces.
 *
 * Direct subscription to the status observable (not `useObservable`)
 * is deliberate: the chrome dropdown lives in a separate React root
 * and we want both ends to share the exact same BehaviorSubject
 * instance and re-render reliably.
 */
const STATUS_PAGES: Record<DaybreakStatus, React.FC<DaybreakStatusPageProps>> = {
  healthy: DaybreakHealthy,
  critical: DaybreakCritical,
};

export const DaybreakPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [status, setStatus] = useState<DaybreakStatus>(() => daybreakStatus$.getValue());
  useEffect(() => {
    const subscription = daybreakStatus$.subscribe(setStatus);
    return () => subscription.unsubscribe();
  }, []);

  const { isExiting, start, exitDurationMs } = useStartDaybreakConversation();

  /*
   * Bottom-anchored input bar. The opaque page-color background
   * prevents scrolling content from bleeding through, and the
   * subtle top border separates the bar from the content scrolling
   * beneath it. Negative horizontal margin + matching padding
   * extend the background to the full content width.
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

  const StatusPage = STATUS_PAGES[status];

  return (
    <div
      data-test-subj="daybreakPage"
      data-daybreak-status={status}
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
          /*
           * Top-align so the Critical view (taller — header +
           * impact overview + risk + queue) doesn't push the
           * header off-screen on shorter viewports. The Healthy
           * view still looks naturally placed because its content
           * is short.
           */
          justify-content: flex-start;
          width: 100%;
          padding-bottom: 16px;
          /*
           * Fade applied to the status page on hand-off. Avoids
           * 'transform: translateY(0)' in the rest state so the
           * EuiFlyout (type push) and other fixed-positioned
           * descendants aren't trapped by a new containing block.
           */
          opacity: ${isExiting ? 0 : 1};
          transform: ${isExiting ? 'translateY(-6px)' : 'none'};
          transition: opacity ${exitDurationMs}ms ease-out, transform ${exitDurationMs}ms ease-out;
          pointer-events: ${isExiting ? 'none' : 'auto'};
          @media (prefers-reduced-motion: reduce) {
            transition: opacity ${exitDurationMs}ms linear;
            transform: none;
          }
        `}
      >
        {/*
         * `key={status}` forces React to fully unmount the previous
         * status page and mount the new one whenever the chrome
         * dropdown flips. Same pattern obs Nightshift uses — keeps
         * each status's internal state isolated and any entry
         * animations play cleanly on switch.
         */}
        <div key={status} css={css`width: 100%`}>
          <StatusPage onStartConversation={start} isExiting={isExiting} />
        </div>
      </div>
      <div css={bottomBarStyles}>
        <DaybreakInput onSubmit={(prompt) => start(prompt)} isDisabled={isExiting} />
      </div>
    </div>
  );
};
