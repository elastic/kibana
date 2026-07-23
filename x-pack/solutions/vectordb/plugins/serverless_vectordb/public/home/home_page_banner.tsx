/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiIllustration, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { cloudRocketDeploy as cloudRocketDeployIllustration } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import { useKibana } from '../hooks/use_kibana';
import { useLocalStorage } from '../hooks/use_local_storage';
import { BANNER_DISMISSED_KEY, HOME_PAGE_BANNER_COPY } from '../constants';

interface HomePageBannerProps {
  hasData: boolean;
  isLoading: boolean;
}

export const HomePageBanner = ({ hasData, isLoading }: HomePageBannerProps) => {
  const {
    services: { application, docLinks },
  } = useKibana();
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(BANNER_DISMISSED_KEY, false);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, [setIsDismissed]);

  const handleGetStarted = useCallback(() => {
    application.navigateToApp('vectordb', { path: '/tutorials' });
  }, [application]);

  if (isLoading) {
    return (
      <>
        <EuiSpacer size="xxl" />
        <EuiLoadingSpinner size="m" />
      </>
    );
  }

  if (hasData && isDismissed) {
    return null;
  }

  const { title, description, buttonLabel } = hasData
    ? HOME_PAGE_BANNER_COPY.hasData
    : HOME_PAGE_BANNER_COPY.noData;

  return (
    <>
      <EuiSpacer size="xxl" />
      <AnnouncementBanner
        data-test-subj="homePageBanner"
        color="plain"
        title={title}
        text={description}
        onDismiss={hasData ? handleDismiss : undefined}
        media={<EuiIllustration type={cloudRocketDeployIllustration} />}
        actionProps={{
          primary: hasData
            ? {
              children: buttonLabel,
              href: docLinks.links.enterpriseSearch.elasticInferenceServiceSupportedModels,
              target: '_blank',
              'data-test-subj': 'homePageBannerViewSupportedModelsBtn',
              // 'data-telemetry-id': 'serverlessVectordb-home-banner-viewSupportedModels-btn',
            }
            : {
              children: buttonLabel,
              fill: true,
              iconType: 'rocket',
              onClick: handleGetStarted,
              'data-test-subj': 'homePageBannerGetStartedBtn',
              // 'data-telemetry-id': 'serverlessVectordb-home-banner-getStarted-btn',
            },
        }}
      />
    </>
  );
};
