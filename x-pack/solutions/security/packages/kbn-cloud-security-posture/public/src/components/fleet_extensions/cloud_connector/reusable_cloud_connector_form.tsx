/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CloudConnectorFormProps } from './types';
import { AWSReusableConnectorForm } from './aws_reusable_connector_form';

export const ReusableCloudConnectorForm: React.FC<CloudConnectorFormProps> = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  isEditPage = false,
  hasInvalidRequiredVars,
  cloud,
  cloudProvider,
  templateName,
}) => {
  // Default to AWS if no cloudProvider is specified
  const provider = cloudProvider || 'aws';

  switch (provider) {
    case 'aws':
      return (
        <AWSReusableConnectorForm
          templateName={templateName}
          input={input}
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          cloud={cloud}
          cloudProvider={provider}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      );
    case 'gcp':
    case 'azure':
      // TODO: Implement GCP and Azure reusable cloud connector forms
      return null;
    default:
      return null;
  }
};
