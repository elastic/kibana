/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { markOnboardingSeen } from '../first_load';
import { ConnectToProject } from '../connection_details/connect_to_project';
import { useOnboardingCredentials } from '../hooks/use_onboarding_credentials';
import { OnboardingPaths } from './components/onboarding_paths';

export const OnboardingLandingPage = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { elasticsearchUrl, apiKey, isLoading } = useOnboardingCredentials();

  useEffect(() => {
    markOnboardingSeen();
  }, []);

  return (
    <EuiPageTemplate panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiSpacer size="xxl" />
        <EuiSpacer size="m" />
        <EuiTitle size="l">
          <h1>
            {i18n.translate('vectordbOnboarding.pathSelection.title', {
              defaultMessage: 'The fastest path to vector search',
            })}
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" css={{ maxWidth: euiTheme.base * 36 }}>
          <p>
            {i18n.translate('vectordbOnboarding.pathSelection.description', {
              defaultMessage:
                'Production-grade defaults for vector workloads, hybrid search and two ways to get embeddings.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <ConnectToProject
          elasticsearchUrl={elasticsearchUrl}
          apiKey={apiKey}
          isLoading={isLoading}
        />
        <EuiSpacer size="xl" />
        <OnboardingPaths />
        <EuiSpacer size="l" />
        <EuiButtonEmpty
          flush="left"
          onClick={() => history.push('/')}
          data-test-subj="vectordbPathSelectionSkip"
          data-telemetry-id="vectordbOnboarding-pathSelection-skip"
        >
          {i18n.translate('vectordbOnboarding.pathSelection.skip', {
            defaultMessage: 'Skip the setup guide',
          })}
        </EuiButtonEmpty>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
