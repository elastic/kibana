/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useKibana } from '../../common/lib/kibana';

/**
 * Hand off into the Elastic AI Agent in Agent Builder with an
 * auto-sent initial prompt. 1:1 parallel of the obs Nightshift hook
 * (`useStartNightshiftConversation`) and the Search homepage's local
 * `useStartAgentConversation` — same pattern, just co-located here
 * so Daybreak doesn't have to cross plugin boundaries.
 *
 * Side effects on `start()`:
 *  - flips `isExiting` to `true` so the page can fade itself out
 *  - after a short `EXIT_FADE_DURATION_MS` window, calls
 *    `application.navigateToApp` to the agent's "new conversation"
 *    route, passing `initialMessage` (auto-sent on Agent Builder
 *    mount) and `sidebarCondensed: true` so the side panel opens
 *    collapsed.
 */

/** Kibana app id of the Agent Builder application. */
const AGENT_BUILDER_APP_ID = 'agent_builder';
/** Agent id used as the "Daybreak host" — opens a conversation with this agent. */
const DAYBREAK_AGENT_ID = 'elastic-ai-agent';

/** Short fade applied to the page contents before navigating away. */
const EXIT_FADE_DURATION_MS = 225;

export function useStartDaybreakConversation() {
  const {
    services: { application },
  } = useKibana();
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timeout if the component using this hook
  // unmounts before navigation completes (e.g. fast click + route
  // change).
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const start = useCallback(
    (initialMessage: string) => {
      if (timeoutRef.current) return; // already in progress
      setIsExiting(true);
      timeoutRef.current = setTimeout(() => {
        application.navigateToApp(AGENT_BUILDER_APP_ID, {
          path: `/agents/${DAYBREAK_AGENT_ID}/conversations/new`,
          state: {
            initialMessage,
            agentId: DAYBREAK_AGENT_ID,
            sidebarCondensed: true,
          },
        });
      }, EXIT_FADE_DURATION_MS);
    },
    [application]
  );

  return { isExiting, start, exitDurationMs: EXIT_FADE_DURATION_MS };
}
