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
import type { GcpCredentialsType } from '../types';
import { GCP_CREDENTIALS_TYPE } from '../constants';

const CredentialsJsonDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsJsonDescription"
        defaultMessage="A JSON file that contains your service account key. You can create a service account key in the Google Cloud Console."
      />
    </EuiText>
  </div>
);

export type GcpCredentialsFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; dataTestSubj: string }
>;

export interface GcpOptionValue {
  label: string;
  info: React.ReactNode;
  fields: GcpCredentialsFields;
}

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: GcpCredentialsFields) =>
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
      } as const;
    });

export type GcpOptions = Record<GcpCredentialsType, GcpOptionValue>;
export type GcpCredentialsTypeOptions = Array<{
  value: GcpCredentialsType;
  text: string;
}>;

const getGcpCredentialsType = (input: NewPackagePolicyInput): string | undefined => {
  return input.streams?.[0]?.vars?.['gcp.credentials.type']?.value;
};

export const getAgentlessCredentialsType = (
  input: NewPackagePolicyInput,
  showCloudConnectors: boolean
): GcpCredentialsType => {
  const credentialsType = getGcpCredentialsType(input);

  // Default to cloud connectors when enabled, similar to AWS/Azure
  if (!credentialsType && showCloudConnectors) {
    return GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS as GcpCredentialsType;
  }

  // Default to credentials JSON when cloud connectors not enabled
  if (!credentialsType) {
    return GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON as GcpCredentialsType;
  }

  return credentialsType as GcpCredentialsType;
};

const getGcpCredentialsTypeSelectorOptions = (
  filterFn: ({ value }: { value: GcpCredentialsType }) => boolean,
  getFormOptions: () => GcpOptions | Partial<GcpOptions> = getGcpCredentialsFormOptions
): GcpCredentialsTypeOptions => {
  return Object.entries(getFormOptions())
    .map(([key, value]) => ({
      value: key as GcpCredentialsType,
      text: value.label,
    }))
    .filter(filterFn);
};

export const getGcpCredentialsFormOptions = (): Omit<GcpOptions, 'cloud_connectors'> => {
  return {
    [GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsJsonLabel',
        {
          defaultMessage: 'Credentials JSON',
        }
      ),
      info: CredentialsJsonDescription,
      fields: {
        'gcp.credentials.json': {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsJsonFieldLabel',
            {
              defaultMessage: 'Credentials JSON',
            }
          ),
          type: 'text',
          dataTestSubj: 'gcpCredentialsJson',
        },
      },
    },
    [GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsFileLabel',
        {
          defaultMessage: 'Credentials file',
        }
      ),
      info: CredentialsJsonDescription,
      fields: {
        'gcp.credentials.file': {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsFileFieldLabel',
            {
              defaultMessage: 'Credentials file path',
            }
          ),
          dataTestSubj: 'gcpCredentialsFile',
        },
      },
    },
    [GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsNoneLabel',
        {
          defaultMessage: 'None',
        }
      ),
      info: <></>,
      fields: {},
    },
  };
};

export const getGcpCloudConnectorsCredentialsFormOptions = (): Omit<
  GcpOptions,
  'credentials-file' | 'credentials-none'
> => {
  return {
    [GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudConnectorsLabel',
        {
          defaultMessage: 'Cloud Connectors (recommended)',
        }
      ),
      info: <></>,
      fields: {},
    },
    [GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsJsonLabel',
        {
          defaultMessage: 'Credentials JSON',
        }
      ),
      info: CredentialsJsonDescription,
      fields: {
        'gcp.credentials.json': {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsJsonFieldLabel',
            {
              defaultMessage: 'Credentials JSON',
            }
          ),
          type: 'text',
          dataTestSubj: 'gcpCredentialsJson',
        },
      },
    },
  };
};

export const getGcpAgentlessFormOptions = (): Omit<
  GcpOptions,
  'credentials-file' | 'credentials-none' | 'cloud_connectors'
> => {
  return {
    [GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsJsonLabel',
        {
          defaultMessage: 'Credentials JSON',
        }
      ),
      info: CredentialsJsonDescription,
      fields: {
        'gcp.credentials.json': {
          label: i18n.translate(
            'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.credentialsJsonFieldLabel',
            {
              defaultMessage: 'Credentials JSON',
            }
          ),
          type: 'text',
          dataTestSubj: 'gcpCredentialsJson',
        },
      },
    },
  };
};

export const getGcpAgentlessCredentialFormOptions = (): GcpCredentialsTypeOptions =>
  getGcpCredentialsTypeSelectorOptions(
    ({ value }) => value === GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON,
    getGcpAgentlessFormOptions
  );

export const getGcpCloudConnectorsCredentialFormAgentlessOptions = (): GcpCredentialsTypeOptions =>
  getGcpCredentialsTypeSelectorOptions(
    ({ value }) =>
      value === GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS ||
      value === GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON,
    getGcpCloudConnectorsCredentialsFormOptions
  );

export const getCloudConnectorCredentialOptions = (
  options: Partial<Pick<GcpOptions, 'cloud_connectors' | 'credentials-json'>>
): Array<{
  value: string;
  text: string;
}> => {
  return Object.entries(options).map(([key, value]) => ({
    value: key as keyof Pick<GcpOptions, 'cloud_connectors' | 'credentials-json'>,
    text: value.label,
  }));
};
