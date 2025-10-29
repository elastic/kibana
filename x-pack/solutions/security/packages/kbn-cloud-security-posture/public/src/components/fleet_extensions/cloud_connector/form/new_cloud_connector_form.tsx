/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { NewCloudConnectorFormProps } from '../types';
import { AWSCloudConnectorForm } from '../aws_cloud_connector/aws_cloud_connector_form';

export const NewCloudConnectorForm: React.FC<NewCloudConnectorFormProps> = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  isEditPage = false,
  cloud,
  cloudProvider,
  templateName,
  credentials,
  setCredentials,
  hasInvalidRequiredVars,
}) => {
  // Default to AWS if no cloudProvider is specified
  const provider = cloudProvider || 'aws';

  switch (provider) {
    case 'aws':
      return (
        <AWSCloudConnectorForm
          templateName={templateName || ''}
          input={input}
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          cloud={cloud}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          cloudProvider={provider}
          credentials={credentials}
          setCredentials={setCredentials}
        />
      );
    case 'gcp':
    case 'azure':
      // TODO: Implement GCP and Azure cloud connector forms
      return null;
    default:
      return null;
  }
};
