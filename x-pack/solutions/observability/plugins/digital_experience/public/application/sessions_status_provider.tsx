/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {
  useSessionsStatusState,
  type SessionsStatusState,
} from '../pages/sessions/hooks/use_sessions_status';

const SessionsStatusContext = createContext<SessionsStatusState | undefined>(undefined);

/**
 * Holds the sessions status for every page of the app, so the applications list and the Sessions
 * tab read the same one, and sessions are set up at most once a visit.
 */
export function SessionsStatusProvider({ children }: { children: ReactNode }) {
  const state = useSessionsStatusState();
  return <SessionsStatusContext.Provider value={state}>{children}</SessionsStatusContext.Provider>;
}

/** The sessions status of `SessionsStatusProvider`. */
export const useSessionsStatus = (): SessionsStatusState => {
  const state = useContext(SessionsStatusContext);
  if (!state) {
    throw new Error('useSessionsStatus must be used within a SessionsStatusProvider');
  }
  return state;
};
