/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import type { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { ONBOARDING_PATH } from '../../../common/constants';
import type { OnboardingRouteParams } from '../types';
import { OnboardingTopicId } from '../constants';
import { getCardIdFromHash, useUrlDetail } from './hooks/use_url_detail';
import { useOnboardingContext } from './onboarding_context';
import { OnboardingHeader } from './onboarding_header';
import { OnboardingBody } from './onboarding_body';

export const OnboardingRouter = React.memo(() => {
  const { config } = useOnboardingContext();

  const topicPathParam = useMemo(() => {
    const availableTopics = [...config.values()]
      .map(({ id }) => id) // available topic ids
      .filter((val) => val !== OnboardingTopicId.default) // except "default"
      .join('|');
    if (availableTopics) {
      return `/:topicId(${availableTopics})?`; // optional parameter}
    }
    return ''; // only default topic available, no need for topic path parameter
  }, [config]);

  return (
    <Routes>
      <Route path={`${ONBOARDING_PATH}${topicPathParam}`} exact component={OnboardingRoute} />
      <Route path={`${ONBOARDING_PATH}/*`} render={() => <Redirect to={ONBOARDING_PATH} />} />
    </Routes>
  );
});
OnboardingRouter.displayName = 'OnboardingRouter';

type OnboardingRouteProps = RouteComponentProps<OnboardingRouteParams>;

const OnboardingRoute = React.memo<OnboardingRouteProps>(({ match, location }) => {
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
