/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  NewPackagePolicy,
  PackageInfo,
  NewPackagePolicyInput,
} from '@kbn/fleet-plugin/common';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { getCloudConnectorRemoteRoleTemplate } from '../utils';

export interface CloudConnectorFormProps {
  newPackagePolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  isEditPage?: boolean;
  onPackagePolicyChange?: (updatedPolicy: NewPackagePolicy) => void;
  input: NewPackagePolicyInput;
  cloud?: CloudSetup;
  templateName: string;
  cloudProvider: 'aws' | 'gcp' | 'azure';
}

export interface CloudConnectorForm {
  isCloudConnectorReusableEnabled: boolean;
  packageInfo: PackageInfo;
  newPackagePolicy: NewPackagePolicy;
  isEditPage?: boolean;
  cloudConnectorRemoteRoleTemplate?: string;
  cloudProvider: 'aws' | 'gcp' | 'azure';
}

export const useCloudConnectorForm = ({
  newPackagePolicy,
  packageInfo,
  isEditPage = false,
  onPackagePolicyChange,
  templateName,
  input,
  cloud,
  cloudProvider,
}: CloudConnectorFormProps): CloudConnectorForm => {
  const isCloudConnectorReusableEnabled = useMemo(() => {
    // check for aws cloud provider and package version
    return true;
  }, []);

  const cloudConnectorRemoteRoleTemplate = cloud
    ? getCloudConnectorRemoteRoleTemplate({
        input,
        cloud,
        templateName,
        packageInfo,
      }) || undefined
    : undefined;

  return {
    cloudProvider,
    cloudConnectorRemoteRoleTemplate,
    isCloudConnectorReusableEnabled,
    packageInfo,
    newPackagePolicy,
    isEditPage,
  };
};
