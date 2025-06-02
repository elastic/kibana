/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import type { AwsCredentialsType } from './types';
import { AWS_CREDENTIALS_TYPE } from './constants';

const AssumeRoleDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.securitySolution.assetInventory.fleetIntegration.assumeRoleDescription"
        defaultMessage="An IAM role Amazon Resource Name (ARN) is an IAM identity that you can create in your AWS
      account. When creating an IAM role, users can define the role’s permissions. Roles do not have
      standard long-term credentials such as passwords or access keys."
      />
    </EuiText>
  </div>
);

const DirectAccessKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.securitySolution.assetInventory.fleetIntegration.directAccessKeysDescription"
        defaultMessage="Access keys are long-term credentials for an IAM user or the AWS account root user."
      />
    </EuiText>
  </div>
);

const TemporaryKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.securitySolution.assetInventory.fleetIntegration.temporaryKeysDescription"
        defaultMessage="You can configure temporary security credentials in AWS to last for a specified duration. They
      consist of an access key ID, a secret access key, and a security token, which is typically
      found using GetSessionToken."
      />
    </EuiText>
  </div>
);

const SharedCredentialsDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.securitySolution.assetInventory.fleetIntegration.sharedCredentialsDescription"
        defaultMessage="If you use different AWS credentials for different tools or applications, you can use profiles
      to define multiple access keys in the same configuration file."
      />
    </EuiText>
  </div>
);

const AWS_FIELD_LABEL = {
  access_key_id: i18n.translate(
    'xpack.securitySolution.assetInventory.fleetIntegration.accessKeyIdLabel',
    {
      defaultMessage: 'Access Key ID',
    }
  ),
  secret_access_key: i18n.translate(
    'xpack.securitySolution.assetInventory.fleetIntegration.secretAccessKeyLabel',
    {
      defaultMessage: 'Secret Access Key',
    }
  ),
};

export type AwsCredentialsFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; isSecret?: boolean; dataTestSubj: string }
>;

export interface AwsOptionValue {
  label: string;
  info: React.ReactNode;
  fields: AwsCredentialsFields;
}

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: AwsCredentialsFields) =>
  Object.entries(input.streams[0].vars || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        value: inputVar.value,
        dataTestSubj: field.dataTestSubj,
        isSecret: field.isSecret,
      } as const;
    });

export type AwsOptions = Record<AwsCredentialsType, AwsOptionValue>;
export type AwsCredentialsTypeOptions = Array<{
  value: AwsCredentialsType;
  text: string;
}>;

const getAwsCredentialsTypeSelectorOptions = (
  filterFn: ({ value }: { value: AwsCredentialsType }) => boolean,
  getFormOptions: () => AwsOptions | Partial<AwsOptions> = getAwsCredentialsFormOptions
): AwsCredentialsTypeOptions => {
  return Object.entries(getFormOptions())
    .map(([key, value]) => ({
      value: key as AwsCredentialsType,
      text: value.label,
    }))
    .filter(filterFn);
};

export const getAwsCredentialsFormManualOptions = (): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) => value !== AWS_CREDENTIALS_TYPE.CLOUD_FORMATION
  );

export const getAwsCredentialsFormAgentlessOptions = (): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) =>
      value === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
      value === AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS
  );
export const getAwsCloudConnectorsFormAgentlessOptions = (): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) =>
      value === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS ||
      value === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
      value === AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS,
    getAwsCloudConnectorsCredentialsFormOptions
  );

export const DEFAULT_AWS_CREDENTIALS_TYPE = AWS_CREDENTIALS_TYPE.CLOUD_FORMATION;
export const DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE: typeof AWS_CREDENTIALS_TYPE.ASSUME_ROLE =
  AWS_CREDENTIALS_TYPE.ASSUME_ROLE;
export const DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE = AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS;
export const DEFAULT_AGENTLESS_CLOUD_CONNECTORS_AWS_CREDENTIALS_TYPE =
  AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS;
export const getAwsCredentialsFormOptions = (): Omit<AwsOptions, 'cloud_connectors'> => ({
  [AWS_CREDENTIALS_TYPE.ASSUME_ROLE]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration..assumeRoleLabel',
      {
        defaultMessage: 'Assume role',
      }
    ),
    info: AssumeRoleDescription,
    fields: {
      'aws.role_arn': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.roleArnLabel',
          {
            defaultMessage: 'Role ARN',
          }
        ),
        dataTestSubj: 'awsRoleArnInput',
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration..directAccessKeyLabel',
      {
        defaultMessage: 'Direct access keys',
      }
    ),
    info: DirectAccessKeysDescription,
    fields: {
      'aws.access_key_id': {
        label: AWS_FIELD_LABEL.access_key_id,
        dataTestSubj: 'awsDirectAccessKeyId',
      },
      'aws.secret_access_key': {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'awsDirectAccessSecretKey',
        isSecret: true,
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS]: {
    info: TemporaryKeysDescription,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.temporaryKeysLabel',
      {
        defaultMessage: 'Temporary keys',
      }
    ),
    fields: {
      'aws.access_key_id': {
        label: AWS_FIELD_LABEL.access_key_id,
        dataTestSubj: 'awsTemporaryKeysAccessKeyId',
      },
      'aws.secret_access_key': {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'awsTemporaryKeysSecretAccessKey',
        isSecret: true,
      },
      'aws.session_token': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.sessionTokenLabel',
          {
            defaultMessage: 'Session Token',
          }
        ),
        dataTestSubj: 'awsTemporaryKeysSessionToken',
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.SHARED_CREDENTIALS]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.sharedCredentialLabel',
      {
        defaultMessage: 'Shared credentials',
      }
    ),
    info: SharedCredentialsDescription,
    fields: {
      'aws.shared_credential_file': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.sharedCredentialFileLabel',
          {
            defaultMessage: 'Shared Credential File',
          }
        ),
        dataTestSubj: 'awsSharedCredentialFile',
      },
      'aws.credential_profile_name': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.credentialProfileNameLabel',
          {
            defaultMessage: 'Credential Profile Name',
          }
        ),
        dataTestSubj: 'awsCredentialProfileName',
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.CLOUD_FORMATION]: {
    label: 'CloudFormation',
    info: [],
    fields: {},
  },
});

export const getAwsCloudConnectorsCredentialsFormOptions = (): Omit<
  AwsOptions,
  'assume_role' | 'cloud_formation' | 'shared_credentials'
> => ({
  [AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.cloudConnectorsRoleLabel',
      {
        defaultMessage: 'Cloud Connectors (recommended)',
      }
    ),
    info: AssumeRoleDescription,
    fields: {
      'aws.role_arn': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration..roleArnLabel',
          {
            defaultMessage: 'Role ARN',
          }
        ),
        type: 'text',
        dataTestSubj: 'awsRoleArnInput',
      },
      'aws.credentials.external_id': {
        label: i18n.translate('xpack.securitySolution.assetInventory.fleetIntegration.externalId', {
          defaultMessage: 'External ID',
        }),
        type: 'password',
        dataTestSubj: 'awsExternalId',
        isSecret: true,
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.directAccessKeyLabel',
      {
        defaultMessage: 'Direct access keys',
      }
    ),
    info: DirectAccessKeysDescription,
    fields: {
      'aws.access_key_id': {
        label: AWS_FIELD_LABEL.access_key_id,
        dataTestSubj: 'awsDirectAccessKeyId',
      },
      'aws.secret_access_key': {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'awsDirectAccessSecretKey',
        isSecret: true,
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS]: {
    info: TemporaryKeysDescription,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.temporaryKeysLabel',
      {
        defaultMessage: 'Temporary keys',
      }
    ),
    fields: {
      'aws.access_key_id': {
        label: AWS_FIELD_LABEL.access_key_id,
        dataTestSubj: 'awsTemporaryKeysAccessKeyId',
      },
      'aws.secret_access_key': {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'awsTemporaryKeysSecretAccessKey',
        isSecret: true,
      },
      'aws.session_token': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration..sessionTokenLabel',
          {
            defaultMessage: 'Session Token',
          }
        ),
        dataTestSubj: 'awsTemporaryKeysSessionToken',
      },
    },
  },
});

export const getAwsAgentlessFormOptions = (): Omit<
  AwsOptions,
  'assume_role' | 'cloud_formation' | 'cloud_connectors' | 'shared_credentials'
> => ({
  [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegrationƒ.directAccessKeyLabel',
      {
        defaultMessage: 'Direct access keys',
      }
    ),
    info: DirectAccessKeysDescription,
    fields: {
      'aws.access_key_id': {
        label: AWS_FIELD_LABEL.access_key_id,
        dataTestSubj: 'awsDirectAccessKeyId',
      },
      'aws.secret_access_key': {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'awsDirectAccessSecretKey',
        isSecret: true,
      },
    },
  },
  [AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS]: {
    info: TemporaryKeysDescription,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.temporaryKeysLabel',
      {
        defaultMessage: 'Temporary keys',
      }
    ),
    fields: {
      'aws.access_key_id': {
        label: AWS_FIELD_LABEL.access_key_id,
        dataTestSubj: 'awsTemporaryKeysAccessKeyId',
      },
      'aws.secret_access_key': {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'awsTemporaryKeysSecretAccessKey',
        isSecret: true,
      },
      'aws.session_token': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.sessionTokenLabel',
          {
            defaultMessage: 'Session Token',
          }
        ),
        dataTestSubj: 'awsTemporaryKeysSessionToken',
      },
    },
  },
});
