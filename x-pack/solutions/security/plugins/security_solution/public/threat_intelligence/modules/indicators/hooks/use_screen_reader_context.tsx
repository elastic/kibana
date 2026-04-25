/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

export interface ScreenReaderAnnouncementsContextValue {
  /**
   * Announces a message to screen readers.
   * @param message - The text to announce.
   */
  announce: (message: string) => void;
}

/**
 * Context for triggering screen reader announcements.
 */
export const ScreenReaderAnnouncementsContext = createContext<
  ScreenReaderAnnouncementsContextValue | undefined
>(undefined);

/**
 * Hook to access the screen reader announcements context.
 * @throws Error if used outside of ScreenReaderAnnouncementsProvider.
 */
export const useScreenReaderAnnouncements = (): ScreenReaderAnnouncementsContextValue => {
  const contextValue = useContext(ScreenReaderAnnouncementsContext);

  if (!contextValue) {
    throw new Error(
      'useScreenReaderAnnouncements must be used within a ScreenReaderAnnouncementsProvider'
    );
  }

  return contextValue;
};
