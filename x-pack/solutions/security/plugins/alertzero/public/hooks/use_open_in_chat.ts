/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

/**
 * An investigation's chat is its Agent Builder conversation, so it opens in Agent Builder rather
 * than in a host of our own: the embeddable conversation cannot be pointed at an existing
 * conversation (it resolves one from `sessionTag` plus local storage), so embedding it here could
 * only ever start a new, empty chat.
 *
 * The agent-scoped route is built inline because Agent Builder's own `appPaths` helper is private
 * to that plugin; this mirrors what its `openFullscreenConversation` does.
 */
const OPEN_DETAILS_PARAM = 'openConversationDetails=true';

const conversationPath = (conversationId: string, agentId?: string): string => {
  const base = agentId
    ? `/agents/${encodeURIComponent(agentId)}/conversations/${encodeURIComponent(conversationId)}`
    : // Without an agent id, Agent Builder's legacy route resolves the conversation's own agent
      // and redirects to the canonical URL.
      `/conversations/${encodeURIComponent(conversationId)}`;
  return `${base}?${OPEN_DETAILS_PARAM}`;
};

export interface OpenInChat {
  /** `undefined` when there is no conversation to link to, so callers can omit the href. */
  getChatHref: (conversationId?: string, agentId?: string) => string | undefined;
  openChat: (conversationId?: string, agentId?: string) => void;
}

/**
 * Href builder and navigate callback for a conversation's Agent Builder page.
 *
 * Both are returned because the control is a link: the href makes it openable in a new tab and
 * readable on hover, while the click is intercepted so navigation stays in-app.
 */
export const useOpenInChat = (): OpenInChat => {
  const {
    services: { application },
  } = useKibana<CoreStart>();

  const getChatHref = useCallback(
    (conversationId?: string, agentId?: string): string | undefined => {
      if (!conversationId) {
        return undefined;
      }
      // Throws when Agent Builder is not registered, which a disabled plugin makes possible even
      // though it is a required dependency. A missing href degrades to a non-link, not a crash.
      try {
        return application.getUrlForApp(AGENTBUILDER_APP_ID, {
          path: conversationPath(conversationId, agentId),
        });
      } catch {
        return undefined;
      }
    },
    [application]
  );

  const openChat = useCallback(
    (conversationId?: string, agentId?: string) => {
      if (!conversationId) {
        return;
      }
      application.navigateToApp(AGENTBUILDER_APP_ID, {
        path: conversationPath(conversationId, agentId),
      });
    },
    [application]
  );

  return useMemo(() => ({ getChatHref, openChat }), [getChatHref, openChat]);
};
