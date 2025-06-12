/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { ONBOARDING_PATH } from '../../../common/constants';
import type { OnboardingRouteParams } from '../types';
import { OnboardingTopicId } from '../constants';
import { getCardIdFromHash, useSyncUrlDetails } from './hooks/use_url_detail';
import { useOnboardingContext } from './onboarding_context';
import { OnboardingHeader } from './onboarding_header';
import { OnboardingBody } from './onboarding_body';
import { CenteredLoadingSpinner } from '../../common/components/centered_loading_spinner';

export const OnboardingRouter = React.memo(() => {
  const { config } = useOnboardingContext();

  const topicPathParam = useMemo(() => {
    const availableTopics = [...config.values()]
      .map(({ id }) => id) // available topic ids
      .filter((id) => id !== OnboardingTopicId.default) // except "default"
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

const OnboardingRoute = React.memo<OnboardingRouteProps>(({ match: { params }, location }) => {
  const { isLoading } = useSyncUrlDetails({
    pathTopicId: params.topicId || null,
    hashCardId: getCardIdFromHash(location.hash),
  });

  if (isLoading) {
    return <CenteredLoadingSpinner />;
  }

  return (
    <>
      <OnboardingHeader />
      <OnboardingBody />
    </>
  );
});
OnboardingRoute.displayName = 'OnboardingContent';
