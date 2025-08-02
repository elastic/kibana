/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo, useCallback, useEffect } from 'react';
import { EuiScreenReaderLive } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { ScreenReaderAnnouncementsContext } from '../hooks/use_screen_reader_context';
import { selectAnnouncement, setScreenReaderMessage } from '../a11y_announcements.slice';
import type { State } from '../../common/store';

/**
 * Provider component that manages a11y screen reader announcements via context.
 */
export const ScreenReaderAnnouncements: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const dispatch = useDispatch();
  const announce = useCallback(
    (message: string) => {
      dispatch(setScreenReaderMessage(message));
    },
    [dispatch]
  );

  const { screenReaderMessage } = useSelector((state: State) => selectAnnouncement(state));
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
