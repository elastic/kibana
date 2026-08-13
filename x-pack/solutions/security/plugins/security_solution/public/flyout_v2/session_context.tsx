/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useIsInSecurityApp } from '../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from './shared/constants/flyout_history';

export type MainFlyoutSession = 'start' | 'inherit';

/**
 * Ambient state threaded from a flyout into whatever it opens next, so nested opens can inherit it
 * without every call site having to pass it down explicitly through props.
 */
export interface FlyoutSessionContextValue {
  /** Whether the next flyout should start a fresh session or inherit the current one. */
  session: MainFlyoutSession;
  /**
   * Ambient override for the `historyKey` passed to `openSystemFlyout`. `undefined` means "no
   * ambient override in scope" - `useFlyoutSessionContext` resolves that down to the app-wide
   * default before returning, so consumers never have to do that fallback themselves.
   *
   * This is what lets Timeline provide its own `timelineFlyoutHistoryKey` around the flyouts it
   * opens: it keeps that whole chain's back/history navigation and close-all-in-group behavior
   * scoped to itself, isolated from whatever flyout was already open before Timeline was shown.
   */
  historyKey?: symbol;
}

const FlyoutSessionContext = createContext<FlyoutSessionContextValue>({ session: 'start' });

export const FlyoutSessionContextProvider: FC<
  PropsWithChildren<{ value: FlyoutSessionContextValue }>
> = ({ value, children }) => (
  <FlyoutSessionContext.Provider value={value}>{children}</FlyoutSessionContext.Provider>
);

/**
 * Reads the ambient `{ session, historyKey }` state. `historyKey` is always resolved to a concrete
 * symbol here: if no `FlyoutSessionContextProvider` above set one, it falls back to the app-wide
 * default - shared by alert/event/IOC flyouts when inside Security, or Discover's document viewer
 * key when outside it.
 */
export const useFlyoutSessionContext = (): Required<FlyoutSessionContextValue> => {
  const { session, historyKey: ambientHistoryKey } = useContext(FlyoutSessionContext);
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey =
    ambientHistoryKey ??
    (isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY);
  return { session, historyKey };
};
