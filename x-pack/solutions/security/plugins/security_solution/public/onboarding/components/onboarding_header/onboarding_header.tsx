/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { useCurrentUser } from '../../../common/lib/kibana/hooks';
import { OnboardingHeaderTopicSelector } from './onboarding_header_topic_selector';
import { useOnboardingHeaderStyles } from './onboarding_header.styles';
import rocketImage from './images/header_rocket.png';
import rocketDarkImage from './images/header_rocket_dark.png';
import { TeammatesCard } from './cards/teammates_card';
import { VideoCard } from './cards/video_card';
import { DemoCard } from './cards/demo_card';
import { defaultHeaderConfig, headerConfig } from './onboarding_header_configs';
import { hasCapabilities } from '../../../common/lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';

export const OnboardingHeader = React.memo(() => {
  const currentUser = useCurrentUser();
  const isDarkMode = useKibanaIsDarkMode();

  const styles = useOnboardingHeaderStyles();

  // Full name could be null, user name should always exist
  const currentUserName = currentUser?.fullName || currentUser?.username;

  const { capabilities } = useKibana().services.application;

  const filteredHeaderConfig = useMemo(() => {
    return (
      headerConfig.find(
        (item) =>
          !item.capabilitiesRequired ||
          (item.capabilitiesRequired && hasCapabilities(capabilities, item.capabilitiesRequired))
      ) ?? defaultHeaderConfig
    );
  }, [capabilities]);
  return (
    <>
      <EuiFlexGroup justifyContent="center" alignItems="center" className={styles}>
        <EuiFlexItem grow={false}>
          <EuiImage
            src={isDarkMode ? rocketDarkImage : rocketImage}
            size={128}
            alt={filteredHeaderConfig.subTitle}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="onboardingHeaderTitleWrapper">
          {currentUserName && (
            <EuiTitle size="xs" className="onboardingHeaderGreetings">
              <span>{filteredHeaderConfig.getTitle(currentUserName)}</span>
            </EuiTitle>
          )}
          <EuiSpacer size="s" />
          <EuiTitle size="l">
            <h1>{filteredHeaderConfig.subTitle}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="m" color="subdued">
            <span>{filteredHeaderConfig.description}</span>
          </EuiText>
          <EuiSpacer size="m" />
          <OnboardingHeaderTopicSelector />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup justifyContent="center" alignItems="center" wrap>
        <EuiFlexItem>
          <VideoCard isDarkMode={isDarkMode} />
        </EuiFlexItem>
        <EuiFlexItem>
          <TeammatesCard isDarkMode={isDarkMode} />
        </EuiFlexItem>
        <EuiFlexItem>
          <DemoCard isDarkMode={isDarkMode} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});
OnboardingHeader.displayName = 'OnboardingHeader';
