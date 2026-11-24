/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  useSessionsStatusState,
  type SessionsStatusState,
} from '../pages/sessions/hooks/use_sessions_status';

interface SessionsStatusContextValue {
  state: SessionsStatusState;
  /** Marks a page that shows the status as open; returns what marks it closed. */
  watch: () => () => void;
}

const SessionsStatusContext = createContext<SessionsStatusContextValue | undefined>(undefined);

/**
 * Holds the sessions status for every page of the app, so the applications list and the Sessions
 * tab read the same one, and sessions are set up at most once a visit. It's only fetched once a
 * page asks for it, and only checked back while one is open, so mobile pages, which have no
 * sessions, request none.
 */
export function SessionsStatusProvider({ children }: { children: ReactNode }) {
  const [watchers, setWatchers] = useState(0);
  const [isRequested, setRequested] = useState(false);
  const state = useSessionsStatusState({ isRequested, isWatched: watchers > 0 });

  const watch = useCallback(() => {
    setRequested(true);
    setWatchers((count) => count + 1);
    return () => setWatchers((count) => count - 1);
  }, []);
  const value = useMemo(() => ({ state, watch }), [state, watch]);

  return <SessionsStatusContext.Provider value={value}>{children}</SessionsStatusContext.Provider>;
}

/**
 * The sessions status of `SessionsStatusProvider`, fetched for the calling page unless `enabled`
 * is off, e.g. on the applications list's Mobile tab.
 */
export const useSessionsStatus = ({
  enabled = true,
}: { enabled?: boolean } = {}): SessionsStatusState => {
  const context = useContext(SessionsStatusContext);
  if (!context) {
    throw new Error('useSessionsStatus must be used within a SessionsStatusProvider');
  }
  const { state, watch } = context;
  useEffect(() => (enabled ? watch() : undefined), [enabled, watch]);
  return state;
};
