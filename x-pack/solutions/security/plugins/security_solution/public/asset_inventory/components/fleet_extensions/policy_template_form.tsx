/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback } from 'react';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { type PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import { i18n } from '@kbn/i18n';
import { CloudSetup, type CloudSetupConfig } from '@kbn/cloud-security-posture';

import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { getFlattenedObject } from '@kbn/std';
import { useKibana } from '../../hooks/use_kibana';
import { ASSET_POLICY_TEMPLATE, CLOUDBEAT_AWS, CLOUDBEAT_AZURE, CLOUDBEAT_GCP } from './constants';

export const hasErrors = (validationResults: PackagePolicyValidationResults | undefined) => {
  if (!validationResults) return 0;

  const flattenedValidation = getFlattenedObject(validationResults);
  const errors = Object.values(flattenedValidation).filter((value) => Boolean(value)) || [];
  return errors.length;
};

export const CloudAssetInventoryPolicyTemplateForm =
  memo<PackagePolicyReplaceDefineStepExtensionComponentProps>(
    ({
      newPolicy,
      onChange,
      validationResults,
      isEditPage,
      packageInfo,
      handleSetupTechnologyChange,
      isAgentlessEnabled,
      defaultSetupTechnology,
    }) => {
      const CLOUD_CONNECTOR_PACKAGE_VERSION_ENABLED_AWS = '0.18.0';
      const CLOUD_CONNECTOR_PACKAGE_VERSION_ENABLED_AZURE = '1.1.3';
      const { cloud, uiSettings } = useKibana().services;
      const isValidFormState = !hasErrors(validationResults);

      const CLOUD_SETUP_MAPPING: CloudSetupConfig = {
        policyTemplate: ASSET_POLICY_TEMPLATE,
        defaultProvider: 'aws',
        namespaceSupportEnabled: true,
        name: i18n.translate('xpack.securitySolution.assetInventory.assetIntegration.nameTitle', {
          defaultMessage: 'Cloud Asset Discovery',
        }),
        shortName: i18n.translate(
          'xpack.securitySolution.assetInventory.assetIntegration.shortNameTitle',
          {
            defaultMessage: 'CAD',
          }
        ),
        overviewPath: `https://ela.st/cloud-asset-discovery-overview`,
        getStartedPath: `https://www.elastic.co/docs/solutions/security/cloud/asset-disc`,
        showCloudTemplates: true,
        providers: {
          aws: {
            type: CLOUDBEAT_AWS,
            enableOrganization: true,
            cloudConnectorEnabledVersion: CLOUD_CONNECTOR_PACKAGE_VERSION_ENABLED_AWS,
            getStartedPath: `https://www.elastic.co/docs/solutions/security/cloud/asset-disc-aws`,
            inputFieldMapping: {
              access_key_id: 'aws.access_key_id',
              secret_access_key: 'aws.secret_access_key',
              session_token: 'aws.session_token',
              role_arn: 'aws.role_arn',
              shared_credential_file: 'aws.shared_credential_file',
              credential_profile_name: 'aws.credential_profile_name',
            },
          },
          gcp: {
            type: CLOUDBEAT_GCP,
            enableOrganization: true,
            getStartedPath: `https://www.elastic.co/docs/solutions/security/cloud/asset-disc-gcp`,
            enabled: true,
          },
          azure: {
            type: CLOUDBEAT_AZURE,
            enabled: true,
            enableOrganization: true,
            getStartedPath: `https://www.elastic.co/docs/solutions/security/cloud/asset-disc-azure`,
            manualFieldsEnabled: true,
            cloudConnectorEnabledVersion: CLOUD_CONNECTOR_PACKAGE_VERSION_ENABLED_AZURE,
          },
        },
      };

      const updatePolicy = useCallback(
        ({
          updatedPolicy,
          isExtensionLoaded,
          isValid,
        }: {
          updatedPolicy: NewPackagePolicy;
          isExtensionLoaded?: boolean;
          isValid?: boolean;
        }) => {
          onChange({
            isValid,
            updatedPolicy,
            isExtensionLoaded: isExtensionLoaded !== undefined ? isExtensionLoaded : true,
          });
        },
        [onChange]
      );

      return (
        <CloudSetup
          configuration={CLOUD_SETUP_MAPPING}
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          isEditPage={isEditPage}
          validationResults={validationResults}
          defaultSetupTechnology={defaultSetupTechnology}
          isAgentlessEnabled={isAgentlessEnabled}
          handleSetupTechnologyChange={handleSetupTechnologyChange}
          isValid={isValidFormState}
          cloud={cloud}
          uiSettings={uiSettings}
        />
      );
    }
  );

CloudAssetInventoryPolicyTemplateForm.displayName = 'CloudAssetInventoryPolicyTemplateForm';

// eslint-disable-next-line import/no-default-export
export { CloudAssetInventoryPolicyTemplateForm as default };
