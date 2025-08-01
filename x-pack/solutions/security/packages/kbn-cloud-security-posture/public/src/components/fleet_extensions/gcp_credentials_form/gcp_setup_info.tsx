/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHorizontalRule, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { cspIntegrationDocsNavigation } from '../constants';

export const GCPSetupInfoContent = ({ isAgentless }: { isAgentless: boolean }) => (
  <>
    <EuiHorizontalRule margin="xl" />
    <EuiTitle size="xs">
      <h2>
        <FormattedMessage
          id="securitySolutionPackages.gcpIntegration.setupInfoContentTitle"
          defaultMessage="Setup Access"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="l" />
    <EuiText color={'subdued'} size="s">
      {isAgentless ? (
        <FormattedMessage
          id="securitySolutionPackages.gcpIntegration.agentlessSetupInfoContent"
          defaultMessage="The integration will need elevated access to run some CIS benchmark rules.You can follow these
    step-by-step instructions to generate the necessary credentials. Refer to our {gettingStartedLink} guide for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={cspIntegrationDocsNavigation.cspm.gcpGetStartedPath} target="_blank">
                <FormattedMessage
                  id="securitySolutionPackages.azureIntegration.gettingStarted.agentlessSetupInfoContentLink"
                  defaultMessage="Getting Started"
                />
              </EuiLink>
            ),
          }}
        />
      ) : (
        <FormattedMessage
          id="securitySolutionPackages.gcpIntegration.setupInfoContent"
          defaultMessage="The integration will need elevated access to run some CIS benchmark rules. Select your preferred
method of providing the GCP credentials this integration will use. You can follow these
step-by-step instructions to generate the necessary credentials. Refer to our {gettingStartedLink} guide for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={cspIntegrationDocsNavigation.cspm.gcpGetStartedPath} target="_blank">
                <FormattedMessage
                  id="securitySolutionPackages.azureIntegration.gettingStarted.setupInfoContentLink"
                  defaultMessage="Getting Started"
                />
              </EuiLink>
            ),
          }}
        />
      )}
    </EuiText>
  </>
);
