/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { FlyoutSessionContextProvider } from '../../../flyout_v2/session_context';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { getOpenConversationFlyoutWidth } from './conversation_flyout_width';

export interface ConversationFlyoutHostProps {
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  children: ReactNode;
}

/**
 * Starts Security for a flyout opened from the conversation overview, which renders outside the app shell.
 */
export const ConversationFlyoutHost = ({
  resolveSecurityCanvasContext,
  children,
}: ConversationFlyoutHostProps) => {
  const [bundle, setBundle] = useState<SecurityCanvasEmbeddedBundle>();

  useEffect(() => {
    let isMounted = true;
    resolveSecurityCanvasContext()
      .then((resolved) => {
        if (isMounted) {
          setBundle(resolved);
        }
      })
      .catch((error) => {
        // Mounted out of view, so there is nowhere to surface this; the row just does not open.
        window.console.warn('Conversation flyout could not start Security', error);
      });
    return () => {
      isMounted = false;
    };
  }, [resolveSecurityCanvasContext]);

  if (!bundle) {
    return null;
  }

  const measuredWidth = getOpenConversationFlyoutWidth();

  return flyoutProviders({
    services: bundle.kibanaServices,
    store: bundle.store,
    children: (
      <FlyoutSessionContextProvider
        value={{
          session: 'start',
          historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
          type: 'push',
          // Omit size when the panel cannot be measured. A fallback of 's' would still
          // skip the stored Security width.
          ...(measuredWidth !== undefined ? { size: measuredWidth } : {}),
        }}
      >
        {children}
      </FlyoutSessionContextProvider>
    ),
  });
};
