/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { GETTING_STARTED_LOCALSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useSearchGettingStartedFeatureFlag } from '../hooks/use_search_getting_started_feature_flag';

interface Props {
  coreStart: CoreStart;
  children: React.ReactNode;
}

export const GettingStartedRedirectGate = ({ coreStart, children }: Props) => {
  const isFeatureFlagEnabled = useSearchGettingStartedFeatureFlag();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hasCheckedRole, setHasCheckedRole] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Get user role
    coreStart.userProfile.getCurrent().then((userProfile) => {
      const roles = userProfile?.user.roles || [];
      setUserRoles([...roles]); // Spread to convert readonly array to mutable
      setHasCheckedRole(true);
    });
  }, [coreStart]);

  useEffect(() => {
    // Only attempt redirect once we've checked the role
    if (!hasCheckedRole || hasRedirected.current) {
      return;
    }

    const visited = localStorage.getItem(GETTING_STARTED_LOCALSTORAGE_KEY);
    const isViewerRole = userRoles.length === 1 && userRoles.includes('viewer');
    const shouldRedirect =
      isFeatureFlagEnabled && !isViewerRole && (!visited || visited === 'false');

    if (shouldRedirect) {
      hasRedirected.current = true;
      coreStart.application.navigateToApp('searchGettingStarted');
    }
  }, [coreStart, isFeatureFlagEnabled, userRoles, hasCheckedRole]);

  return <>{children}</>;
};
