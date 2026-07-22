/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
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
import { useKibana } from '../services';
import { ONBOARDING_PATH } from '../routes';

export const OnboardingLandingPage = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { elasticsearchUrl, apiKey, isLoading } = useOnboardingCredentials();
  const { services } = useKibana();
  const vectorSearchDocsUrl = services.docLinks.links.enterpriseSearch.vectorSearch;

  useEffect(() => {
    markOnboardingSeen();
  }, []);

  return (
    <EuiPageTemplate panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiFlexGroup gutterSize="l" direction="column">
          <EuiSpacer size="xl" />
          <EuiIcon size="xxl" type="logoVectorDB" aria-hidden={true} />

          <EuiFlexGroup gutterSize="m" direction="column">
            <EuiTitle size="l">
              <h1>
                {i18n.translate('vectordbOnboarding.pathSelection.title', {
                  defaultMessage: 'Set up your Elasticsearch Vector Database',
                })}
              </h1>
            </EuiTitle>
            <EuiText color="subdued" css={{ maxWidth: euiTheme.base * 36 }}>
              <p>
                {i18n.translate('vectordbOnboarding.pathSelection.description', {
                  defaultMessage:
                    'Production-grade defaults, hybrid search, and your choice of generating embeddings or bringing your own.',
                })}
              </p>
            </EuiText>
            <EuiFlexItem>
              <ConnectToProject
                elasticsearchUrl={elasticsearchUrl}
                apiKey={apiKey}
                isLoading={isLoading}
                telemetryPage="pathSelection"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiFlexItem>
            <OnboardingPaths origin={ONBOARDING_PATH} />
          </EuiFlexItem>

          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLink
                href={vectorSearchDocsUrl}
                target="_blank"
                external
                data-test-subj="vectordbPathSelectionDocumentation"
                data-telemetry-id="vectordbOnboarding-pathSelection-documentation"
              >
                {i18n.translate('vectordbOnboarding.pathSelection.documentation', {
                  defaultMessage: 'Vector Database documentation',
                })}
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                iconType="sortRight"
                iconSide="right"
                flush="right"
                onClick={() => history.push('/')}
                data-test-subj="vectordbPathSelectionSkip"
                data-telemetry-id="vectordbOnboarding-pathSelection-skip"
              >
                {i18n.translate('vectordbOnboarding.pathSelection.skip', {
                  defaultMessage: 'Skip the setup guide',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
