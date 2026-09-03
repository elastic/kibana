/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiIllustration, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { cloudRocketDeploy } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';
import { useLocalStorage } from '../hooks/use_local_storage';
import { BANNER_DISMISSED_KEY } from '../constants';
import { GETTING_STARTED_DEEP_LINK_ID, VECTORDB_APP_ID } from '../../common/constants';

interface HomePageBannerProps {
  hasData: boolean;
  isLoading: boolean;
}

export const HomePageBanner = ({ hasData, isLoading }: HomePageBannerProps) => {
  const {
    services: { application },
  } = useKibana();
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(BANNER_DISMISSED_KEY, false);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, [setIsDismissed]);

  const handleGetStarted = useCallback(() => {
    application.navigateToApp(VECTORDB_APP_ID, { deepLinkId: GETTING_STARTED_DEEP_LINK_ID });
  }, [application]);

  if (isLoading) {
    return (
      <>
        <EuiSpacer size="xxl" />
        <EuiLoadingSpinner size="m" />
      </>
    );
  }

  if (hasData || isDismissed) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="xxl" />
      <AnnouncementBanner
        data-test-subj="vectordbHomePageBanner"
        title={i18n.translate('xpack.serverlessVectordb.home.banner.title', {
          defaultMessage: 'Set up your Elasticsearch Vector Database in 2 simple steps',
        })}
        text={i18n.translate('xpack.serverlessVectordb.home.banner.description', {
          defaultMessage:
            'Use our getting started guides or browse documentation, articles and notebooks to generate embeddings from your content or store your current vectors in an optimized index.',
        })}
        media={<EuiIllustration type={cloudRocketDeploy} alt="" />}
        color="highlighted"
        onDismiss={handleDismiss}
        dismissButtonProps={{ 'data-telemetry-id': 'serverlessVectordb-home-banner-dismiss' }}
        actionProps={{
          primary: {
            children: i18n.translate('xpack.serverlessVectordb.home.banner.button', {
              defaultMessage: 'Get started',
            }),
            fill: true,
            iconType: 'rocket',
            onClick: handleGetStarted,
            'data-test-subj': 'vectordbHomePageBannerGetStartedBtn',
            'data-telemetry-id': 'serverlessVectordb-home-getStartedBtn',
          },
        }}
      />
    </>
  );
};
