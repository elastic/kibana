/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import type { NewPackagePolicyAssetInput } from '../types';
import {
  getAwsCredentialsType,
  getAssetCloudFormationDefaultValue,
  getAssetPolicy,
} from '../utils';
import {
  DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
  getAwsCredentialsFormOptions,
  getInputVarsFields,
} from './aws_credentials_form_options';
import type { AwsSetupFormat, AwsCredentialsType } from './types';
import { AWS_CREDENTIALS_TYPE, AWS_SETUP_FORMAT, CLOUDBEAT_AWS } from './constants';
import { assetIntegrationDocsNavigation } from '../../../constants';
/**
 * Update CloudFormation template and stack name in the Agent Policy
 * based on the selected policy template
 */

const getSetupFormatFromInput = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>,
  hasCloudFormationTemplate: boolean
): AwsSetupFormat => {
  const credentialsType = getAwsCredentialsType(input);
  // CloudFormation is the default setup format if the integration has a CloudFormation template
  if (!credentialsType && hasCloudFormationTemplate) {
    return AWS_SETUP_FORMAT.CLOUD_FORMATION;
  }
  if (credentialsType !== AWS_CREDENTIALS_TYPE.CLOUD_FORMATION) {
    return AWS_SETUP_FORMAT.MANUAL;
  }

  return AWS_SETUP_FORMAT.CLOUD_FORMATION;
};

export const useAwsCredentialsForm = ({
  newPolicy,
  input,
  packageInfo,
  updatePolicy,
}: {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>;
  packageInfo: PackageInfo;
  updatePolicy: (updatedPolicy: NewPackagePolicy) => void;
}) => {
  // We only have a value for 'aws.credentials.type' once the form has mounted.
  // On initial render we don't have that value, so we fall back to the default option.

  const options = getAwsCredentialsFormOptions();

  const hasCloudFormationTemplate = !!getAssetCloudFormationDefaultValue(packageInfo);

  const setupFormat = getSetupFormatFromInput(input, hasCloudFormationTemplate);
  const lastManualCredentialsType = useRef<string | undefined>(undefined);

  // Assumes if the credentials type is not set, the default is CloudFormation
  const awsCredentialsType: AwsCredentialsType =
    getAwsCredentialsType(input) || AWS_SETUP_FORMAT.CLOUD_FORMATION;

  const group = options[awsCredentialsType as keyof typeof options];
  const fields = getInputVarsFields(input, group.fields);
  const fieldsSnapshot = useRef({});

  useEffect(() => {
    // This should ony set the credentials after the initial render
    if (!getAwsCredentialsType(input) && !lastManualCredentialsType.current) {
      updatePolicy({
        ...getAssetPolicy(newPolicy, input.type, {
          'aws.credentials.type': {
            value: awsCredentialsType,
            type: 'text',
          },
        }),
      });
    }
  }, [awsCredentialsType, input, newPolicy, updatePolicy]);

  const elasticDocLink = assetIntegrationDocsNavigation.awsGetStartedPath;

  useCloudFormationTemplate({
    packageInfo,
    newPolicy,
    updatePolicy,
    setupFormat,
  });

  const onSetupFormatChange = (newSetupFormat: AwsSetupFormat) => {
    if (newSetupFormat === AWS_SETUP_FORMAT.CLOUD_FORMATION) {
      // We need to store the current manual fields to restore them later
      fieldsSnapshot.current = Object.fromEntries(
        fields.map((field) => [field.id, { value: field.value }])
      );
      // We need to store the last manual credentials type to restore it later
      lastManualCredentialsType.current = getAwsCredentialsType(input);

      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'aws.credentials.type': {
            value: AWS_CREDENTIALS_TYPE.CLOUD_FORMATION,
            type: 'text',
          },
          // Clearing fields from previous setup format to prevent exposing credentials
          // when switching from manual to cloud formation
          ...Object.fromEntries(fields.map((field) => [field.id, { value: undefined }])),
        })
      );
    } else {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'aws.credentials.type': {
            // Restoring last manual credentials type or defaulting to the first option
            value: lastManualCredentialsType.current || DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
            type: 'text',
          },
          // Restoring fields from manual setup format if any
          ...fieldsSnapshot.current,
        })
      );
    }
  };

  return {
    awsCredentialsType,
    setupFormat,
    group,
    fields,
    elasticDocLink,
    hasCloudFormationTemplate,
    onSetupFormatChange,
  };
};

const getAwsCloudFormationTemplate = (newPolicy: NewPackagePolicy) => {
  const template: string | undefined = newPolicy?.inputs?.find((i) => i.type === CLOUDBEAT_AWS)
    ?.config?.cloud_formation_template_url?.value;

  return template || undefined;
};

const updateCloudFormationPolicyTemplate = (
  newPolicy: NewPackagePolicy,
  updatePolicy: (policy: NewPackagePolicy) => void,
  templateUrl: string | undefined
) => {
  updatePolicy?.({
    ...newPolicy,
    inputs: newPolicy.inputs.map((input) => {
      if (input.type === CLOUDBEAT_AWS) {
        return {
          ...input,
          config: { cloud_formation_template_url: { value: templateUrl } },
        };
      }
      return input;
    }),
  });
};

const useCloudFormationTemplate = ({
  packageInfo,
  newPolicy,
  updatePolicy,
  setupFormat,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: (policy: NewPackagePolicy) => void;
  setupFormat: AwsSetupFormat;
}) => {
  useEffect(() => {
    const policyInputCloudFormationTemplate = getAwsCloudFormationTemplate(newPolicy);

    if (setupFormat === AWS_SETUP_FORMAT.MANUAL) {
      if (policyInputCloudFormationTemplate) {
        updateCloudFormationPolicyTemplate(newPolicy, updatePolicy, undefined);
      }
      return;
    }
    const templateUrl = getAssetCloudFormationDefaultValue(packageInfo);

    // If the template is not available, do not update the policy
    if (templateUrl === '') return;

    // If the template is already set, do not update the policy
    if (policyInputCloudFormationTemplate === templateUrl) return;

    updateCloudFormationPolicyTemplate(newPolicy, updatePolicy, templateUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.cloud_formation_template_url, newPolicy, packageInfo, setupFormat]);
};
