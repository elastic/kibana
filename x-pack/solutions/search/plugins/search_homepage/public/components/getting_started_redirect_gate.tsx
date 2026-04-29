/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { GETTING_STARTED_SESSIONSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useStats } from '../hooks/api/use_stats';
import { useKibana } from '../hooks/use_kibana';
import { useGetLicenseInfo } from '../hooks/use_get_license_info';

interface Props {
  coreStart: CoreStart;
  children: React.ReactNode;
}

export const GettingStartedRedirectGate = ({ coreStart, children }: Props) => {
  const { cloud } = useKibana().services;
  const { data: storageStats, isLoading, isError } = useStats();

  const hasRedirected = useRef(false);
  const { isTrial } = useGetLicenseInfo();

  const visitedGettingStartedPage = sessionStorage.getItem(GETTING_STARTED_SESSIONSTORAGE_KEY);
  const shouldVisitGettingStartedPage =
    !visitedGettingStartedPage || visitedGettingStartedPage === 'false'; // visit if null or value is false

  const shouldRedirect =
    storageStats !== undefined &&
    ((cloud?.isCloudEnabled ? cloud?.isInTrial() : isTrial) || storageStats.hasNoDocuments) &&
    shouldVisitGettingStartedPage;

  useEffect(() => {
    if (shouldRedirect && !hasRedirected.current) {
      hasRedirected.current = true;
      coreStart.application.navigateToApp('searchGettingStarted');
    }
  }, [coreStart, shouldRedirect]);

  // While stats are loading, suppress children to avoid mounting the homepage
  // only to immediately unmount it if a redirect is needed. If the stats call
  // fails, fall through and render children (fail open).
  if (
    (isLoading && shouldVisitGettingStartedPage && !isError) ||
    (shouldRedirect && shouldVisitGettingStartedPage)
  ) {
    // Don't render children if we're going to redirect immediately.
    // This prevents mounting the homepage (with its console) only to unmount it milliseconds later.
    return null;
  }

  return <>{children}</>;
};
