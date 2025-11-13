/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import type { AzureCloudConnectorCredentials } from '../types';
import { AZURE_PROVIDER } from '../constants';
import { CloudConnectorSelector } from '../form/cloud_connector_selector';

export const AzureReusableConnectorForm: React.FC<{
  cloudConnectorId: string | undefined;
  isEditPage: boolean;
  credentials: AzureCloudConnectorCredentials;
  setCredentials: (credentials: AzureCloudConnectorCredentials) => void;
}> = ({ credentials, setCredentials, isEditPage, cloudConnectorId }) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.azure.cloudConnectorInstructions"
          defaultMessage="To streamline your Azure integration process, you can reuse the same cloud connector for different use cases within Elastic. Simply choose the existing connection from the options below:"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <CloudConnectorSelector
        provider={AZURE_PROVIDER}
        cloudConnectorId={cloudConnectorId}
        credentials={credentials}
        setCredentials={setCredentials}
      />
      <EuiSpacer size="m" />
    </>
  );
};
