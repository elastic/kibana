/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiHorizontalRule, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

interface AzureSetupInfoContentProps {
  documentationLink: string;
}

export const AzureSetupInfoContent = ({ documentationLink }: AzureSetupInfoContentProps) => {
  const { shortName } = useCloudSetup();
  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.gettingStarted.setupInfoContent"
          defaultMessage="Utilize an Azure Resource Manager (ARM) template (a built-in Azure IaC tool) or a series of manual steps to set up and deploy {shortName} for assessing your Azure environment's security posture. Refer to our {gettingStartedLink} guide for details."
          values={{
            shortName,
            gettingStartedLink: (
              <EuiLink href={documentationLink} target="_blank">
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.gettingStarted.setupInfoContentLink"
                  defaultMessage="Getting Started"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};
