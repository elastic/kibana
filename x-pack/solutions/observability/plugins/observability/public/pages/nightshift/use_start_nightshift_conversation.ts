/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useKibana } from '../../utils/kibana_react';
import type { NightshiftStatus } from './nightshift_state';
import {
  NIGHTSHIFT_AGENT_BRIEF_TYPE,
  type NightshiftAgentBriefData,
} from './agent_brief/nightshift_agent_brief_definition';

/** Kibana app id of the Agent Builder application. */
const AGENT_BUILDER_APP_ID = 'agent_builder';

/** Agent id used as the "Nightshift host" — opens a conversation with this agent. */
const NIGHTSHIFT_AGENT_ID = 'elastic-ai-agent';

/**
 * Default initial prompt sent into the conversation. The Agent Builder's
 * `routed_conversations_provider` reads `location.state.initialMessage` and
 * auto-sends it (`autoSendInitialMessage: true`) when the page mounts on
 * `/conversations/new`.
 */
const DEFAULT_NIGHTSHIFT_PROMPT =
  'Hello, can you fix all my significant events in critical state from agent brief.';

/**
 * Duration of the Nightshift exit fade before we navigate away. Kept very
 * short (~225ms) so it feels like a subtle dissolve rather than a wait.
 */
const EXIT_FADE_DURATION_MS = 225;

interface StartNightshiftConversationOptions {
  /**
   * Override the initial prompt that gets auto-sent into the conversation.
   * Defaults to the standard Nightshift "fix my significant events" prompt.
   */
  initialMessage?: string;
  /**
   * Nightshift status to capture as an "Agent brief" attachment on the
   * new conversation. When provided, the new conversation lands with a
   * pre-staged `nightshift.agentBrief` attachment whose canvas renders
   * the corresponding Nightshift panel (loading / healthy / critical).
   * Omit to navigate without attaching a brief.
   */
  briefMode?: NightshiftStatus;
}

/**
 * Reusable hook that opens the Elastic AI Agent in Agent Builder with a
 * pre-filled initial message that is auto-sent on mount. Currently wired
 * to the "Enable Nightshift" button on the Nightshift welcome page; the
 * follow-on onboarding flow can reuse the same hook from a different
 * button (just call `start()` when the user completes onboarding).
 *
 * Side effects on `start()`:
 *  - flips `isExiting` to `true`, which consumers can use to fade the
 *    current page out before navigation
 *  - after `EXIT_FADE_DURATION_MS`, calls `application.navigateToApp` to
 *    the agent's "new conversation" route, passing `initialMessage`
 *    (auto-sent on mount) and `sidebarCondensed: true` in location state
 *    so the Agent Builder navigation panel opens collapsed.
 *
 * Implementation note: the deep-link pattern matches what
 * `workplace_ai_app`'s explore-agent prompt uses — `navigateToApp` with
 * a `state.initialMessage`. See
 * `x-pack/platform/plugins/shared/agent_builder/public/application/hooks/use_initial_message.ts`
 * for the consumer side.
 */
export function useStartNightshiftConversation() {
  const {
    services: { application },
  } = useKibana();
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timeout if the component using this hook unmounts
  // before navigation completes (e.g. fast click + route change).
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const start = useCallback(
    ({
      initialMessage = DEFAULT_NIGHTSHIFT_PROMPT,
      briefMode,
    }: StartNightshiftConversationOptions = {}) => {
      if (timeoutRef.current) return; // already in progress
      setIsExiting(true);

      /*
       * Build the `initialAttachments` payload Agent Builder will
       * consume in `RoutedConversationsProvider`. The brief is a single
       * `nightshift.agentBrief` attachment carrying the current
       * Nightshift mode — the registered UI definition picks the
       * right Nightshift panel to render inside the canvas flyout.
       */
      const initialAttachments = briefMode
        ? [
            {
              id: `nightshift-agent-brief-${briefMode}`,
              type: NIGHTSHIFT_AGENT_BRIEF_TYPE,
              data: { mode: briefMode } satisfies NightshiftAgentBriefData,
            },
          ]
        : undefined;

      timeoutRef.current = setTimeout(() => {
        application.navigateToApp(AGENT_BUILDER_APP_ID, {
          path: `/agents/${NIGHTSHIFT_AGENT_ID}/conversations/new`,
          state: {
            initialMessage,
            agentId: NIGHTSHIFT_AGENT_ID,
            // Tells AppLayout to render the Agent Builder side panel in
            // its condensed (collapsed) form on first mount.
            sidebarCondensed: true,
            initialAttachments,
          },
        });
      }, EXIT_FADE_DURATION_MS);
    },
    [application]
  );

  return { isExiting, start, exitDurationMs: EXIT_FADE_DURATION_MS };
}
