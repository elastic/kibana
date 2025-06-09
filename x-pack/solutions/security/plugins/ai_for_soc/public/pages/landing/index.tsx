/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OnboardingPage } from '@kbn/security-solution-plugin/public/onboarding/components/onboarding';
import { SecuritySolutionPageWrapper } from '@kbn/security-solution-plugin/public/common/components/page_wrapper';
import { SpyRoute } from '@kbn/security-solution-plugin/public/common/utils/route/spy_routes';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { StartServices } from '../../types';

interface LandingPageWrapperProps {
  services: StartServices;
}

export const AiForSocLandingPage: React.FC<LandingPageWrapperProps> = ({ services }) => {
  return (
    <SecuritySolutionPageWrapper>
      <OnboardingPage />
      <SpyRoute pageName={SecurityPageName.landing} />
    </SecuritySolutionPageWrapper>
  );
};
