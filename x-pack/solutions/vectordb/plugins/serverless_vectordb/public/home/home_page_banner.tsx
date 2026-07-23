/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../hooks/use_kibana';
import { useLocalStorage } from '../hooks/use_local_storage';
import searchRocketIcon from './assets/search-rocket.svg';
import { BANNER_DISMISSED_KEY, HOME_PAGE_BANNER_COPY } from '../constants';
import { bannerCallOutStyle, bannerButtonFlexItemStyle } from './home_page_banner_styles';

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
      <EuiCallOut
        announceOnMount={false}
        css={bannerCallOutStyle}
        onDismiss={hasData ? handleDismiss : undefined}
        data-test-subj="homePageBanner"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiImage src={searchRocketIcon} alt="" size="original" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={bannerButtonFlexItemStyle}>
            {hasData ? (
              <EuiButton
                href={docLinks.links.enterpriseSearch.elasticInferenceServiceSupportedModels}
                target="_blank"
                data-test-subj="homePageBannerViewSupportedModelsBtn"
                data-telemetry-id="serverlessVectordb-home-banner-viewSupportedModels-btn"
              >
                {buttonLabel}
              </EuiButton>
            ) : (
              <EuiButton
                fill
                iconType="rocket"
                onClick={handleGetStarted}
                data-test-subj="homePageBannerGetStartedBtn"
                data-telemetry-id="serverlessVectordb-home-banner-getStarted-btn"
              >
                {buttonLabel}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    </>
  );
};
