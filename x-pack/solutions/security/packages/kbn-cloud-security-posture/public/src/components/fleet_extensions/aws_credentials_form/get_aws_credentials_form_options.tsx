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
import { AWS_INPUT_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import type { AwsCredentialsType, AwsInputFieldMapping } from '../types';
import { AWS_CREDENTIALS_TYPE } from '../constants';
import { getAwsCredentialsType } from '../utils';

const AssumeRoleDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.assumeRoleDescription"
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
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.directAccessKeysDescription"
        defaultMessage="Access keys are long-term credentials for an IAM user or the AWS account root user."
      />
    </EuiText>
  </div>
);

const TemporaryKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.temporaryKeysDescription"
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
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.sharedCredentialsDescription"
        defaultMessage="If you use different AWS credentials for different tools or applications, you can use profiles
      to define multiple access keys in the same configuration file."
      />
    </EuiText>
  </div>
);

const AWS_FIELD_LABEL = {
  access_key_id: i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.accessKeyIdLabel',
    {
      defaultMessage: 'Access Key ID',
    }
  ),
  secret_access_key: i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.secretAccessKeyLabel',
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
export const getAgentlessCredentialsType = (
  input: NewPackagePolicyInput,
  showCloudConnectors: boolean
): AwsCredentialsType => {
  const credentialsType = getAwsCredentialsType(input);
  if (
    (!credentialsType && showCloudConnectors) ||
    (credentialsType === AWS_CREDENTIALS_TYPE.CLOUD_FORMATION && showCloudConnectors)
  ) {
    return AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS;
  }

  if (credentialsType === AWS_CREDENTIALS_TYPE.CLOUD_FORMATION || !credentialsType) {
    return AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS;
  }

  return credentialsType;
};

const getAwsCredentialsTypeSelectorOptions = (
  filterFn: ({ value }: { value: AwsCredentialsType }) => boolean,
  getFormOptions: (
    awsInputFieldMapping?: AwsInputFieldMapping
  ) => AwsOptions | Partial<AwsOptions> = getAwsCredentialsFormOptions,
  awsInputFieldMapping?: AwsInputFieldMapping
): AwsCredentialsTypeOptions => {
  return Object.entries(getFormOptions(awsInputFieldMapping))
    .map(([key, value]) => ({
      value: key as AwsCredentialsType,
      text: value.label,
    }))
    .filter(filterFn);
};

export const getAwsCredentialsFormManualOptions = (
  awsInputFieldMapping?: AwsInputFieldMapping
): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) => value !== AWS_CREDENTIALS_TYPE.CLOUD_FORMATION,
    getAwsCredentialsFormOptions,
    awsInputFieldMapping
  );

export const getAwsCredentialsFormAgentlessOptions = (
  awsInputFieldMapping?: AwsInputFieldMapping
): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) =>
      value === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
      value === AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS,
    getAwsAgentlessFormOptions,
    awsInputFieldMapping
  );
export const getAwsCredentialsCloudConnectorsFormAgentlessOptions = (
  awsInputFieldMapping?: AwsInputFieldMapping
): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) =>
      value === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS ||
      value === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
      value === AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS,
    getAwsCloudConnectorsCredentialsFormOptions,
    awsInputFieldMapping
  );

const getAwsFieldMappingValues = (awsInputFieldMapping?: AwsInputFieldMapping) => ({
  roleArn: awsInputFieldMapping?.role_arn || 'role_arn',
  accessKeyId: awsInputFieldMapping?.access_key_id || 'access_key_id',
  secretAccessKey: awsInputFieldMapping?.secret_access_key || 'secret_access_key',
  sessionToken: awsInputFieldMapping?.session_token || 'session_token',
  sharedCredentialFile: awsInputFieldMapping?.shared_credential_file || 'shared_credential_file',
  credentialProfileName: awsInputFieldMapping?.credential_profile_name || 'credential_profile_name',
  credentialExternalId:
    awsInputFieldMapping?.['aws.credentials.external_id'] || 'aws.credentials.external_id',
});

export const getAwsCredentialsFormOptions = (
  awsInputFieldMapping?: AwsInputFieldMapping
): Omit<AwsOptions, 'cloud_connectors'> => {
  const {
    roleArn,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    sharedCredentialFile,
    credentialProfileName,
  } = getAwsFieldMappingValues(awsInputFieldMapping);

  return {
    [AWS_CREDENTIALS_TYPE.ASSUME_ROLE]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.assumeRoleLabel',
        {
          defaultMessage: 'Assume role',
        }
      ),
      info: AssumeRoleDescription,
      fields: {
        [roleArn]: {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.roleArnLabel',
            {
              defaultMessage: 'Role ARN',
            }
          ),
          dataTestSubj: AWS_INPUT_TEST_SUBJECTS.ROLE_ARN,
        },
      },
    },
    [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.directAccessKeyLabel',
        {
          defaultMessage: 'Direct access keys',
        }
      ),
      info: DirectAccessKeysDescription,
      fields: {
        [accessKeyId]: {
          label: AWS_FIELD_LABEL.access_key_id,
          dataTestSubj: AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID,
        },
        [secretAccessKey]: {
          label: AWS_FIELD_LABEL.secret_access_key,
          type: 'password',
          dataTestSubj: AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_SECRET_KEY,
          isSecret: true,
        },
      },
    },
    [AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS]: {
      info: TemporaryKeysDescription,
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.temporaryKeysLabel',
        {
          defaultMessage: 'Temporary keys',
        }
      ),
      fields: {
        [accessKeyId]: {
          label: AWS_FIELD_LABEL.access_key_id,
          dataTestSubj: AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_KEY_ID,
        },
        [secretAccessKey]: {
          label: AWS_FIELD_LABEL.secret_access_key,
          type: 'password',
          dataTestSubj: AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_SECRET_KEY,
          isSecret: true,
        },
        [sessionToken]: {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.sessionTokenLabel',
            {
              defaultMessage: 'Session Token',
            }
          ),
          dataTestSubj: AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_SESSION_TOKEN,
        },
      },
    },
    [AWS_CREDENTIALS_TYPE.SHARED_CREDENTIALS]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.sharedCredentialLabel',
        {
          defaultMessage: 'Shared credentials',
        }
      ),
      info: SharedCredentialsDescription,
      fields: {
        [sharedCredentialFile]: {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.sharedCredentialFileLabel',
            {
              defaultMessage: 'Shared Credential File',
            }
          ),
          dataTestSubj: AWS_INPUT_TEST_SUBJECTS.SHARED_CREDENTIALS_FILE,
        },
        [credentialProfileName]: {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.credentialProfileNameLabel',
            {
              defaultMessage: 'Credential Profile Name',
            }
          ),
          dataTestSubj: AWS_INPUT_TEST_SUBJECTS.SHARED_CREDENTIALS_PROFILE_NAME,
        },
      },
    },
    [AWS_CREDENTIALS_TYPE.CLOUD_FORMATION]: {
      label: 'CloudFormation',
      info: [],
      fields: {},
    },
  };
};

export const getAwsCloudConnectorsCredentialsFormOptions = (
  awsInputFieldMapping?: AwsInputFieldMapping
): Omit<AwsOptions, 'assume_role' | 'cloud_formation' | 'shared_credentials'> => {
  const { accessKeyId, secretAccessKey, sessionToken } =
    getAwsFieldMappingValues(awsInputFieldMapping);

  return {
    [AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudConnectorsRoleLabel',
        {
          defaultMessage: 'Cloud Connectors (recommended)',
        }
      ),
      info: AssumeRoleDescription,
      fields: {},
    },
    [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.directAccessKeyLabel',
        {
          defaultMessage: 'Direct access keys',
        }
      ),
      info: DirectAccessKeysDescription,
      fields: {
        [accessKeyId]: {
          label: AWS_FIELD_LABEL.access_key_id,
          dataTestSubj: 'awsDirectAccessKeyId',
        },
        [secretAccessKey]: {
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
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.temporaryKeysLabel',
        {
          defaultMessage: 'Temporary keys',
        }
      ),
      fields: {
        [accessKeyId]: {
          label: AWS_FIELD_LABEL.access_key_id,
          dataTestSubj: 'awsTemporaryKeysAccessKeyId',
        },
        [secretAccessKey]: {
          label: AWS_FIELD_LABEL.secret_access_key,
          type: 'password',
          dataTestSubj: 'awsTemporaryKeysSecretAccessKey',
          isSecret: true,
        },
        [sessionToken]: {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.sessionTokenLabel',
            {
              defaultMessage: 'Session Token',
            }
          ),
          dataTestSubj: 'awsTemporaryKeysSessionToken',
        },
      },
    },
  };
};

export const getAwsAgentlessFormOptions = (
  awsInputFieldMapping?: AwsInputFieldMapping
): Omit<
  AwsOptions,
  'assume_role' | 'cloud_formation' | 'cloud_connectors' | 'shared_credentials'
> => {
  const { accessKeyId, secretAccessKey, sessionToken } =
    getAwsFieldMappingValues(awsInputFieldMapping);

  return {
    [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.directAccessKeyLabel',
        {
          defaultMessage: 'Direct access keys',
        }
      ),
      info: DirectAccessKeysDescription,
      fields: {
        [accessKeyId]: {
          label: AWS_FIELD_LABEL.access_key_id,
          dataTestSubj: 'awsDirectAccessKeyId',
        },
        [secretAccessKey]: {
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
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.temporaryKeysLabel',
        {
          defaultMessage: 'Temporary keys',
        }
      ),
      fields: {
        [accessKeyId]: {
          label: AWS_FIELD_LABEL.access_key_id,
          dataTestSubj: 'awsTemporaryKeysAccessKeyId',
        },
        [secretAccessKey]: {
          label: AWS_FIELD_LABEL.secret_access_key,
          type: 'password',
          dataTestSubj: 'awsTemporaryKeysSecretAccessKey',
          isSecret: true,
        },
        [sessionToken]: {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.sessionTokenLabel',
            {
              defaultMessage: 'Session Token',
            }
          ),
          dataTestSubj: 'awsTemporaryKeysSessionToken',
        },
      },
    },
  };
};
