/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useState, useMemo, useCallback } from 'react';
import { EuiScreenReaderLive } from '@elastic/eui';
import type { ScreenReaderAnnouncementsContextValue } from '../hooks/use_screen_reader_context';
import { ScreenReaderAnnouncementsContext } from '../hooks/use_screen_reader_context';

/**
 * Provider component that manages a11y screen reader announcements via context.
 */
export const ScreenReaderAnnouncements: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const [screenReaderMessage, setScreenReaderMessage] = useState('');

  const announce = useCallback<ScreenReaderAnnouncementsContextValue['announce']>((message) => {
    setScreenReaderMessage(message);
  }, []);

  const contextValue = useMemo(() => ({ announce }), [announce]);

  return (
    <ScreenReaderAnnouncementsContext.Provider value={contextValue}>
      {/* Live region for a11y screen reader announcements */}
      <EuiScreenReaderLive aria-live="assertive" aria-atomic="true" focusRegionOnTextChange>
        {screenReaderMessage}
      </EuiScreenReaderLive>
      {children}
    </ScreenReaderAnnouncementsContext.Provider>
  );
};
