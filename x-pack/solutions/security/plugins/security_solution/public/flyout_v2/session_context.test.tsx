/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useIsInSecurityApp } from '../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from './shared/constants/flyout_history';
import {
  FlyoutSessionContextProvider,
  type FlyoutSessionContextValue,
  useFlyoutSessionContext,
} from './session_context';

jest.mock('../common/hooks/is_in_security_app');

const renderWithProvider = (value?: FlyoutSessionContextValue) =>
  renderHook(() => useFlyoutSessionContext(), {
    wrapper: ({ children }: PropsWithChildren<{}>) =>
      value ? (
        <FlyoutSessionContextProvider value={value}>{children}</FlyoutSessionContextProvider>
      ) : (
        <>{children}</>
      ),
  });

describe('session_context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIsInSecurityApp as jest.Mock).mockReturnValue(true);
  });

  describe('useFlyoutSessionContext', () => {
    it('defaults to a "start" session with no provider above it', () => {
      const { result } = renderWithProvider();

      expect(result.current.session).toBe('start');
    });

    it('resolves historyKey to documentFlyoutHistoryKey when inside the Security app and no provider is set', () => {
      const { result } = renderWithProvider();

      expect(result.current.historyKey).toBe(documentFlyoutHistoryKey);
    });

    it('resolves historyKey to DOC_VIEWER_FLYOUT_HISTORY_KEY when outside the Security app and no provider is set', () => {
      (useIsInSecurityApp as jest.Mock).mockReturnValue(false);

      const { result } = renderWithProvider();

      expect(result.current.historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
    });

    it('reads the session propagated by a provider', () => {
      const { result } = renderWithProvider({
        session: 'inherit',
        historyKey: documentFlyoutHistoryKey,
      });

      expect(result.current.session).toBe('inherit');
    });

    it('uses the ambient historyKey from a provider instead of the app-wide default', () => {
      const timelineHistoryKey = Symbol('timeline');

      const { result } = renderWithProvider({ session: 'start', historyKey: timelineHistoryKey });

      expect(result.current.historyKey).toBe(timelineHistoryKey);
    });

    it('falls back to the app-wide default when a provider does not set an ambient historyKey', () => {
      (useIsInSecurityApp as jest.Mock).mockReturnValue(false);

      const { result } = renderWithProvider({ session: 'start' } as FlyoutSessionContextValue);

      expect(result.current.historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
    });
  });
});
