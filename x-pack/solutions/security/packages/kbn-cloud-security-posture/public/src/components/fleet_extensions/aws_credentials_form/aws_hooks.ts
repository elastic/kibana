/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import {
  AWS_CREDENTIALS_TYPE,
  AWS_SETUP_FORMAT,
  DEFAULT_AWS_CREDENTIALS_TYPE,
  DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
} from '../constants';
import {
  updatePolicyWithInputs,
  getAwsCredentialsType,
  getCloudFormationDefaultValue,
} from '../utils';
import {
  getAwsCredentialsFormOptions,
  getInputVarsFields,
} from './get_aws_credentials_form_options';
import type { AwsCredentialsType, AwsSetupFormat, UpdatePolicy } from '../types';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
/**
 * Update CloudFormation template and stack name in the Agent Policy
 * based on the selected policy template
 */

const getSetupFormatFromInput = (
  input: NewPackagePolicyInput,
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

interface UseAwsCredentialsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyInput;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isValid: boolean;
}

const getAwsCloudFormationTemplate = (newPolicy: NewPackagePolicy, awsPolicyType?: string) => {
  if (!newPolicy?.inputs) {
    return undefined;
  }
  if (!awsPolicyType) {
    return undefined;
  }
  const template: string | undefined = newPolicy?.inputs?.find((i) => i.type === awsPolicyType)
    ?.config?.cloud_formation_template_url?.value;

  return template || undefined;
};

const updateCloudFormationPolicyTemplate = (
  newPolicy: NewPackagePolicy,
  updatePolicy: UpdatePolicy,
  templateUrl: string | undefined,
  awsPolicyType?: string
) => {
  if (!awsPolicyType) {
    return;
  }

  updatePolicy?.({
    updatedPolicy: {
      ...newPolicy,
      inputs: newPolicy.inputs.map((input) => {
        if (input.type === awsPolicyType) {
          return {
            ...input,
            config: { cloud_formation_template_url: { value: templateUrl } },
          };
        }
        return input;
      }),
    },
  });
};

const useCloudFormationTemplate = ({
  newPolicy,
  updatePolicy,
  setupFormat,
  awsPolicyType,
}: {
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  setupFormat: AwsSetupFormat;
  awsPolicyType?: string;
}) => {
  const policyInputCloudFormationTemplate = getAwsCloudFormationTemplate(newPolicy, awsPolicyType);

  // Only clear template when switching to manual mode
  if (setupFormat === AWS_SETUP_FORMAT.MANUAL && policyInputCloudFormationTemplate) {
    updateCloudFormationPolicyTemplate(newPolicy, updatePolicy, undefined, awsPolicyType);
  }

  // Note: Initial CloudFormation template setting is now handled in preload logic
};

export const useAwsCredentialsForm = ({
  newPolicy,
  input,
  packageInfo,
  updatePolicy,
  isValid,
}: UseAwsCredentialsFormProps) => {
  // We only have a value for 'aws.credentials.type' once the form has mounted.
  // On initial render we don't have that value, so we fall back to the default option.
  const { awsPolicyType, awsOverviewPath, awsInputFieldMapping, templateName } = useCloudSetup();
  const options = getAwsCredentialsFormOptions(awsInputFieldMapping);

  const hasCloudFormationTemplate = !!getCloudFormationDefaultValue(packageInfo, templateName);

  const setupFormat = getSetupFormatFromInput(input, hasCloudFormationTemplate);
  const lastManualCredentialsType = useRef<string | undefined>(undefined);

  // Assumes if the credentials type is not set, the default is CloudFormation
  const resolvedCredentialsType = getAwsCredentialsType(input) as Exclude<
    AwsCredentialsType,
    'cloud_connectors'
  >;
  const awsCredentialsType = resolvedCredentialsType || DEFAULT_AWS_CREDENTIALS_TYPE;

  // Ensure we have a valid group, fallback to any available option if needed
  let group = options[awsCredentialsType];
  if (!group && Object.keys(options).length > 0) {
    // Fallback to the first available credential type if the requested one doesn't exist
    const fallbackType = Object.keys(options)[0];
    group = options[fallbackType as keyof typeof options];
  }

  const fields = getInputVarsFields(input, group?.fields || {});
  const fieldsSnapshot = useRef({});

  if (isValid && setupFormat === AWS_SETUP_FORMAT.CLOUD_FORMATION && !hasCloudFormationTemplate) {
    updatePolicy({
      updatedPolicy: newPolicy,
      isValid: false,
    });
  }

  useCloudFormationTemplate({
    updatePolicy,
    newPolicy,
    setupFormat,
    awsPolicyType,
  });

  const onSetupFormatChange = (newSetupFormat: AwsSetupFormat) => {
    if (newSetupFormat === AWS_SETUP_FORMAT.CLOUD_FORMATION) {
      // We need to store the current manual fields to restore them later
      fieldsSnapshot.current = Object.fromEntries(
        fields.map((field) => [field.id, { value: field.value }])
      );
      // We need to store the last manual credentials type to restore it later
      lastManualCredentialsType.current = getAwsCredentialsType(input);

      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, awsPolicyType, {
          'aws.credentials.type': {
            value: AWS_CREDENTIALS_TYPE.CLOUD_FORMATION,
            type: 'text',
          },
          // Clearing fields from previous setup format to prevent exposing credentials
          // when switching from manual to cloud formation
          ...Object.fromEntries(fields.map((field) => [field.id, { value: undefined }])),
        }),
      });
    } else {
      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, awsPolicyType, {
          'aws.credentials.type': {
            // Restoring last manual credentials type or defaulting to the first option
            value: lastManualCredentialsType.current || DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
            type: 'text',
          },
          // Restoring fields from manual setup format if any
          ...fieldsSnapshot.current,
        }),
      });
    }
  };

  return {
    awsCredentialsType,
    setupFormat,
    group,
    fields,
    elasticDocLink: awsOverviewPath,
    hasCloudFormationTemplate,
    onSetupFormatChange,
  };
};
