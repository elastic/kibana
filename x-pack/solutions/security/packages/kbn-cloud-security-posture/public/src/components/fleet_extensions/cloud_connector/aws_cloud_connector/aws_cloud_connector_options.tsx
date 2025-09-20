/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import { i18n } from '@kbn/i18n';

// Cloud Connector field labels
const AWS_CLOUD_CONNECTOR_FIELD_LABELS = {
  role_arn: i18n.translate('securitySolutionPackages.awsIntegration.roleArnLabel', {
    defaultMessage: 'Role ARN',
  }),
  external_id: i18n.translate('securitySolutionPackages.awsIntegration.externalId', {
    defaultMessage: 'External ID',
  }),
} as const;

// Cloud Connector options interface
export interface AwsCloudConnectorOptions {
  id: string;
  label: string;
  type?: 'text' | 'password';
  dataTestSubj: string;
  isSecret?: boolean;
  value: string;
}

// Define field sequence order
const FIELD_SEQUENCE = [
  'role_arn',
  'aws.role_arn',
  'aws.credentials.external_id',
  'external_id',
] as const;

export const getAwsCloudConnectorsCredentialsFormOptions = (
  inputVars?: PackagePolicyConfigRecord | undefined
) => {
  if (!inputVars) {
    return;
  }

  const fields: ({
    label: string;
    type?: 'text' | 'password' | undefined;
    isSecret?: boolean | undefined;
    dataTestSubj: string;
  } & {
    value: string;
    id: string;
    dataTestSubj: string;
  })[] = [];

  // Create a map of all available fields
  const availableFields = new Map<string, AwsCloudConnectorOptions>();

  if (inputVars.role_arn) {
    availableFields.set('role_arn', {
      id: 'role_arn',
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.role_arn,
      type: 'text' as const,
      dataTestSubj: 'awsCloudConnectorRoleArnInput',
      value: inputVars.role_arn.value,
    });
  }

  if (inputVars['aws.role_arn']) {
    availableFields.set('aws.role_arn', {
      id: 'aws.role_arn',
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.role_arn,
      type: 'text' as const,
      dataTestSubj: 'awsCloudConnectorRoleArnInput',
      value: inputVars['aws.role_arn'].value,
    });
  }

  if (inputVars['aws.credentials.external_id']) {
    availableFields.set('aws.credentials.external_id', {
      id: 'aws.credentials.external_id',
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.external_id,
      type: 'password' as const,
      dataTestSubj: 'awsCloudConnectorExternalId',
      isSecret: true,
      value: inputVars['aws.credentials.external_id'].value,
    });
  }

  if (inputVars.external_id) {
    availableFields.set('external_id', {
      id: 'external_id',
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.external_id,
      type: 'password' as const,
      dataTestSubj: 'awsCloudConnectorExternalId',
      isSecret: true,
      value: inputVars.external_id.value,
    });
  }

  // Build fields array in sequence order
  FIELD_SEQUENCE.forEach((fieldId) => {
    const field = availableFields.get(fieldId);
    if (field) {
      fields.push(field);
    }
  });

  return fields;
};
