/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

/**
 * Opens Agent Builder's conversation details flyout for the conversation named in the URL.
 *
 * An investigation is a templated conversation, so its details flyout is Agent Builder's: it loads
 * the conversation and renders the tabs, header and footer this solution registered against the
 * `investigation` template. Nothing here fetches the investigation.
 *
 * Driven by the URL rather than by the click that opened it, so a cold landing on a shared link and
 * a click on a card run the same code.
 */
export const useInvestigationDetails = ({
  conversationId,
  onClose,
}: {
  conversationId?: string;
  onClose: () => void;
}): void => {
  const {
    services: { agentBuilder },
  } = useKibana<{ agentBuilder?: AgentBuilderPluginStart }>();

  // Held in a ref so a new callback identity cannot retrigger the effect: reopening the flyout
  // would discard whichever tab the analyst had switched to.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!conversationId || !agentBuilder) {
      return;
    }

    let closeFlyout: (() => void) | undefined;
    let isStale = false;
    /**
     * Agent Builder calls `onClose` however the flyout closes, including when we close it
     * ourselves below. Only a dismissal by the user should clear the URL — clearing it during
     * teardown would fight the navigation that caused the teardown.
     */
    let isTearingDown = false;

    void agentBuilder
      .openConversationDetails({
        conversationId,
        onClose: () => {
          if (!isTearingDown) {
            onCloseRef.current();
          }
        },
      })
      .then((close) => {
        // The id changed, or the page unmounted, before the flyout finished opening. Without this
        // the flyout would appear for a conversation that is no longer selected, with no handle
        // left to close it.
        if (isStale) {
          isTearingDown = true;
          close();
          return;
        }
        closeFlyout = close;
      });

    return () => {
      isStale = true;
      isTearingDown = true;
      closeFlyout?.();
    };
  }, [agentBuilder, conversationId]);
};
