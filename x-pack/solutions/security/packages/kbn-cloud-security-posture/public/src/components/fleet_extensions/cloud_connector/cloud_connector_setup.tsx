/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { CloudSetup } from '@kbn/cloud-plugin/public';

import { CloudConnectorForm } from './cloud_connector_form';
import type { UpdatePolicy } from '../types';
import { useCloudConnectorForm } from './hooks/use_cloud_connector_form';

export interface CloudConnectorSetupProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  cloud?: CloudSetup;
  cloudProvider?: string;
  templateName: string;
}

export const CloudConnectorSetup: React.FC<CloudConnectorSetupProps> = ({
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
  const { isCloudConnectorReusableEnabled } = useCloudConnectorForm({
    newPackagePolicy: newPolicy,
    input,
    cloud,
    cloudProvider: (cloudProvider as 'aws' | 'gcp' | 'azure') || 'aws',
    packageInfo,
    isEditPage,
    onPackagePolicyChange: (updatedPolicy) => updatePolicy({ updatedPolicy }),
    templateName,
  });

  return (
    <>
      <CloudConnectorForm
        input={input}
        templateName={templateName}
        newPolicy={newPolicy}
        packageInfo={packageInfo}
        updatePolicy={updatePolicy}
        isEditPage={isEditPage}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
        cloud={cloud}
        cloudProvider={cloudProvider}
      />

      {isCloudConnectorReusableEnabled && (
        <>
          <EuiSpacer size="m" />
          <div>
            <FormattedMessage
              id="securitySolutionPackages.cspmIntegration.cloudConnector.reusableInfo"
              defaultMessage="This cloud connector can be reused across multiple policies for better resource management."
            />
          </div>
        </>
      )}
    </>
  );
};
