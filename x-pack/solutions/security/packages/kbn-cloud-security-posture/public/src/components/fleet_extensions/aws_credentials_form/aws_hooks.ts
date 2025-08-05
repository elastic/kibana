/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { NewPackagePolicy, NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { AWS_CREDENTIALS_TYPE, AWS_SETUP_FORMAT } from '../constants';
import { getPosturePolicy } from '../utils';
import {
  DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE,
  getAwsCredentialsFormOptions,
  getInputVarsFields,
} from './get_aws_credentials_form_options';
import { AwsCredentialsType, AwsSetupFormat, UpdatePolicy } from '../types';
import { getAwsCredentialsType, getCloudFormationDefaultValue } from './aws_utils';
import { useCloudSetup } from '../cloud_setup_context';
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

export const useAwsCredentialsForm = ({
  newPolicy,
  input,
  packageInfo,
  updatePolicy,
  isValid,
}: UseAwsCredentialsFormProps) => {
  // We only have a value for 'aws.credentials.type' once the form has mounted.
  // On initial render we don't have that value, so we fall back to the default option.
  const { awsPolicyType, awsOverviewPath, templateName } = useCloudSetup();
  const options = getAwsCredentialsFormOptions();

  const hasCloudFormationTemplate = !!getCloudFormationDefaultValue(packageInfo, templateName);

  const setupFormat = getSetupFormatFromInput(input, hasCloudFormationTemplate);
  const lastManualCredentialsType = useRef<string | undefined>(undefined);

  // Assumes if the credentials type is not set, the default is CloudFormation
  const awsCredentialsType =
    (getAwsCredentialsType(input) as Exclude<AwsCredentialsType, 'cloud_connectors'>) ||
    AWS_SETUP_FORMAT.CLOUD_FORMATION;

  const group = options[awsCredentialsType];
  const fields = getInputVarsFields(input, group.fields);
  const fieldsSnapshot = useRef({});

  useEffect(() => {
    // This should ony set the credentials after the initial render
    if (!getAwsCredentialsType(input) && !lastManualCredentialsType.current) {
      updatePolicy({
        updatedPolicy: getPosturePolicy(newPolicy, awsPolicyType, {
          'aws.credentials.type': {
            value: awsCredentialsType,
            type: 'text',
          },
        }),
      });
    }
  }, [awsCredentialsType, awsPolicyType, input, newPolicy, updatePolicy]);

  if (isValid && setupFormat === AWS_SETUP_FORMAT.CLOUD_FORMATION && !hasCloudFormationTemplate) {
    updatePolicy({
      updatedPolicy: newPolicy,
      isValid: false,
    });
  }

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

      updatePolicy({
        updatedPolicy: getPosturePolicy(newPolicy, awsPolicyType, {
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
        updatedPolicy: getPosturePolicy(newPolicy, awsPolicyType, {
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

const getAwsCloudFormationTemplate = (newPolicy: NewPackagePolicy, awsPolicyType?: string) => {
  if (!newPolicy?.inputs) {
    return undefined;
  }
  if (!awsPolicyType) {
    return undefined;
  }
  const template: string | undefined = newPolicy?.inputs?.find((i) => i.type === awsPolicyType)
    ?.vars?.cloud_formation_template_url?.value?.config?.cloud_formation_template_url?.value;

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
  const stored = getAwsCloudFormationTemplate(newPolicy, awsPolicyType);

  if (stored === templateUrl) {
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
  packageInfo,
  newPolicy,
  updatePolicy,
  setupFormat,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  setupFormat: AwsSetupFormat;
}) => {
  const { awsPolicyType, templateName } = useCloudSetup();
  useEffect(() => {
    const policyInputCloudFormationTemplate = getAwsCloudFormationTemplate(
      newPolicy,
      awsPolicyType
    );

    if (setupFormat === AWS_SETUP_FORMAT.MANUAL) {
      if (policyInputCloudFormationTemplate) {
        updateCloudFormationPolicyTemplate(newPolicy, updatePolicy, undefined, awsPolicyType);
      }
      return;
    }
    const templateUrl = getCloudFormationDefaultValue(packageInfo, templateName);

    // If the template is not available, do not update the policy
    if (templateUrl === '') return;

    // If the template is already set, do not update the policy
    if (policyInputCloudFormationTemplate === templateUrl) return;

    updateCloudFormationPolicyTemplate(newPolicy, updatePolicy, templateUrl, awsPolicyType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.cloud_formation_template_url, setupFormat]);
};
