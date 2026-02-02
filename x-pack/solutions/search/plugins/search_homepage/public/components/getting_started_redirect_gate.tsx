/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { GETTING_STARTED_LOCALSTORAGE_KEY } from '@kbn/search-shared-ui';

interface Props {
  coreStart: CoreStart;
  children: React.ReactNode;
}

export const GettingStartedRedirectGate = ({ coreStart, children }: Props) => {
  const hasRedirected = useRef(false);
  const visited = localStorage.getItem(GETTING_STARTED_LOCALSTORAGE_KEY);
  const shouldRedirect = !visited || visited === 'false';
  // Check if we should redirect BEFORE rendering children to avoid race condition

  useEffect(() => {
    if (shouldRedirect && !hasRedirected.current) {
      hasRedirected.current = true;
      coreStart.application.navigateToApp('searchGettingStarted');
    }
  }, [coreStart, shouldRedirect]);

  if (shouldRedirect) {
    // Don't render children if we're going to redirect immediately.
    // This prevents mounting the homepage (with its console) only to unmount it milliseconds later.
    return null;
  }

  return <>{children}</>;
};
