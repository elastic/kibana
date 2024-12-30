/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import type { RouteComponentProps } from 'react-router-dom';
import { OnboardingHeader } from './onboarding_header';
import { OnboardingBody } from './onboarding_body';
import type { OnboardingRouteParams } from '../types';
import { getCardIdFromHash, useUrlDetail } from './hooks/use_url_detail';

type OnboardingRouteProps = RouteComponentProps<OnboardingRouteParams>;

export const OnboardingRoute = React.memo<OnboardingRouteProps>(({ match, location }) => {
  const { syncUrlDetails } = useUrlDetail();

  /**
   * This effect syncs the URL details with the stored state, it only needs to be executed once per page load.
   */
  useEffect(() => {
    const pathTopicId = match.params.topicId || null;
    const hashCardId = getCardIdFromHash(location.hash);
    syncUrlDetails(pathTopicId, hashCardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <OnboardingHeader />
      <OnboardingBody />
    </>
  );
});
OnboardingRoute.displayName = 'OnboardingContent';
