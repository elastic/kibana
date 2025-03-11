/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { CenteredLoadingSpinner } from '../../common/components/centered_loading_spinner';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { PAGE_CONTENT_WIDTH } from '../constants';
import { OnboardingContextProvider } from './onboarding_context';
import { OnboardingAVCBanner } from './onboarding_banner';
import { OnboardingRouter } from './onboarding_router';
import { OnboardingFooter } from './onboarding_footer';

export const OnboardingPage = React.memo(() => {
  const spaceId = useSpaceId();
  const { euiTheme } = useEuiTheme();

  if (!spaceId) {
    return <CenteredLoadingSpinner size="l" topOffset="10em" />;
  }

  return (
    <OnboardingContextProvider spaceId={spaceId}>
      <OnboardingAVCBanner />
      <KibanaPageTemplate.Section
        grow={true}
        restrictWidth={PAGE_CONTENT_WIDTH}
        paddingSize="xl"
        bottomBorder="extended"
        style={{ backgroundColor: euiTheme.colors.backgroundBaseSubdued }}
      >
        <OnboardingRouter />
      </KibanaPageTemplate.Section>
      <EuiSpacer size="l" />
      <KibanaPageTemplate.Section grow={true} restrictWidth={PAGE_CONTENT_WIDTH} paddingSize="xl">
        <OnboardingFooter />
      </KibanaPageTemplate.Section>
    </OnboardingContextProvider>
  );
});
OnboardingPage.displayName = 'OnboardingPage';
