/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { AWSReusableConnectorForm } from '../aws_cloud_connector/aws_reusable_connector_form';
import { AzureReusableConnectorForm } from '../azure_cloud_connector/azure_reusable_connector_form';
import type { CloudConnectorCredentials } from '../types';

export const ReusableCloudConnectorForm: React.FC<{
  credentials: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
  newPolicy: NewPackagePolicy;
  cloudProvider?: string;
  isEditPage: boolean;
}> = ({ credentials, setCredentials, cloudProvider, newPolicy, isEditPage }) => {
  const provider = cloudProvider || 'aws';

  switch (provider) {
    case 'aws':
      return (
        <AWSReusableConnectorForm
          isEditPage={isEditPage}
          credentials={credentials}
          cloudConnectorId={newPolicy.cloud_connector_id || undefined}
          setCredentials={setCredentials}
        />
      );
    case 'azure':
      return (
        <AzureReusableConnectorForm
          isEditPage={isEditPage}
          credentials={credentials}
          cloudConnectorId={newPolicy.cloud_connector_id || undefined}
          setCredentials={setCredentials}
        />
      );
    case 'gcp':
      // TODO: Implement GCP cloud connector forms
      return null;
    default:
      return null;
  }
};
