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

  useEffect(() => {
    const visited = localStorage.getItem(GETTING_STARTED_LOCALSTORAGE_KEY);
    const shouldRedirect = !visited || visited === 'false';
    if (shouldRedirect) {
      hasRedirected.current = true;
      coreStart.application.navigateToApp('searchGettingStarted');
    }
  }, [coreStart]);

  return <>{children}</>;
};
