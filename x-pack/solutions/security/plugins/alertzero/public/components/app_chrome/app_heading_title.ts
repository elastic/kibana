/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext, useLayoutEffect } from 'react';

/**
 * Setter for a page-owned app heading title. `AppChromeLayout` picks the title by route, which
 * can't tell apart pages that share one: `/` renders either the queue or onboarding.
 */
export const AppHeadingTitleContext = createContext<(title: string | undefined) => void>(() => {});

/**
 * Shows `title` as the app heading while the calling page is mounted, and restores the route's
 * title when it unmounts. A layout effect, so the route's title never paints first.
 */
export const useAppHeadingTitle = (title: string): void => {
  const setTitle = useContext(AppHeadingTitleContext);

  useLayoutEffect(() => {
    setTitle(title);
    return () => setTitle(undefined);
  }, [setTitle, title]);
};
