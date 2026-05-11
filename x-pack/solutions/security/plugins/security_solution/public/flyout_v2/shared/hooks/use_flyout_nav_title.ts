/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { getFlyoutManagerStore } from '@elastic/eui';

/**
 * Returns a function that builds the EUI history title for a child flyout
 * opened from the current session:
 *   - When a session is active: `"<session title> -> <childTitle>"`
 *   - When no session: `fallback ?? childTitle`
 *
 * Composition is always flat — callers never accumulate ancestry chains.
 */
export const useFlyoutNavTitle = (): ((childTitle: string, fallback?: string) => string) => {
  const state = useSyncExternalStore(
    (listener) => getFlyoutManagerStore().subscribe(listener),
    () => getFlyoutManagerStore().getState()
  );

  const { sessions } = state;
  const currentSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const navTitle = currentSession?.title;

  return useCallback(
    (childTitle: string, fallback?: string) =>
      navTitle ? `${navTitle} -> ${childTitle}` : fallback ?? childTitle,
    [navTitle]
  );
};
