/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import { i18n } from '@kbn/i18n';
import { CLOUD_CONNECTOR_FIELD_NAMES } from '../constants';

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
  CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN,
  CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN,
  CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID,
  CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID,
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
    availableFields.set(CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN, {
      id: CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN,
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.role_arn,
      type: 'text' as const,
      dataTestSubj: 'awsRoleArnInput',
      value: inputVars.role_arn.value,
    });
  }

  if (inputVars[CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN]) {
    availableFields.set(CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN, {
      id: CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN,
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.role_arn,
      type: 'text' as const,
      dataTestSubj: 'awsRoleArnInput',
      value: inputVars[CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN].value,
    });
  }

  if (inputVars['aws.credentials.external_id']) {
    availableFields.set('aws.credentials.external_id', {
      id: CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID,
      label: AWS_CLOUD_CONNECTOR_FIELD_LABELS.external_id,
      type: 'password' as const,
      dataTestSubj: 'awsCloudConnectorExternalId',
      isSecret: true,
      value: inputVars[CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID].value,
    });
  }

  if (inputVars.external_id) {
    availableFields.set(CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID, {
      id: CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID,
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
