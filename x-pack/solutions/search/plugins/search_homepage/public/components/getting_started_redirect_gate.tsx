/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { GETTING_STARTED_LOCALSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useSearchGettingStartedFeatureFlag } from '../hooks/use_search_getting_started_feature_flag';

interface Props {
  coreStart: CoreStart;
  children: React.ReactNode;
}

export const GettingStartedRedirectGate = ({ coreStart, children }: Props) => {
  const isFeatureFlagEnabled = useSearchGettingStartedFeatureFlag();

  // Check if we should redirect BEFORE rendering children to avoid race condition
  const shouldRedirect = useMemo(() => {
    const visited = localStorage.getItem(GETTING_STARTED_LOCALSTORAGE_KEY);
    return isFeatureFlagEnabled && (!visited || visited === 'false');
  }, [isFeatureFlagEnabled]);

  useEffect(() => {
    if (shouldRedirect) {
      coreStart.application.navigateToApp('searchGettingStarted');
    }
  }, [coreStart, isFeatureFlagEnabled, shouldRedirect]);

  // Don't render children if we're going to redirect immediately.
  // This prevents mounting the homepage (with its console) only to unmount it milliseconds later.
  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
};
