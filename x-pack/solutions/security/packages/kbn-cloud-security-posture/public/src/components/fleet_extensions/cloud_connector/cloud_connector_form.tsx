/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CloudConnectorFormProps } from './types';
import { AWSCloudConnectorForm } from './aws_cloud_connector_form';

export const CloudConnectorForm: React.FC<CloudConnectorFormProps> = ({
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
  switch (cloudProvider) {
    case 'aws':
      return (
        <AWSCloudConnectorForm
          templateName={templateName}
          input={input}
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          cloud={cloud}
          cloudProvider={cloudProvider}
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
