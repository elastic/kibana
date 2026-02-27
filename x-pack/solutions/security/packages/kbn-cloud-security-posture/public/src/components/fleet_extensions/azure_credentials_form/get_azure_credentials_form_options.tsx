/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import { AZURE_INPUT_FIELDS_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import { AZURE_CREDENTIALS_TYPE } from '../constants';
import type { AzureCredentialsType } from '../types';
import { getAzureCredentialsType } from '../utils';

export type AzureCredentialsFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; testSubj?: string; isSecret?: boolean }
>;

export interface AzureOptionValue {
  label: string;
  info?: React.ReactNode;
  fields: AzureCredentialsFields;
}

export type AzureOptions = Record<AzureCredentialsType, AzureOptionValue>;

export const getAzureCredentialsFormManualOptions = (): Array<{
  value: AzureCredentialsType;
  text: string;
}> => {
  return Object.entries(getAzureCredentialsFormOptions())
    .map(([key, value]) => ({
      value: key as AzureCredentialsType,
      text: value.label,
    }))
    .filter(
      ({ value }) =>
        value !== AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE && // we remove this in order to hide it from the selectable options in the manual drop down
        value !== AZURE_CREDENTIALS_TYPE.MANUAL && // TODO: remove 'manual' for stack version 8.13
        value !== AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD // this option is temporarily hidden
    );
};

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: AzureCredentialsFields) =>
  Object.entries(input.streams[0].vars || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        testSubj: field.testSubj,
        value: inputVar.value,
        isSecret: field?.isSecret,
      } as const;
    });

const I18N_TENANT_ID = i18n.translate(
  'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.tenantIdLabel',
  {
    defaultMessage: 'Tenant ID',
  }
);

const I18N_CLIENT_ID = i18n.translate(
  'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.clientIdLabel',
  {
    defaultMessage: 'Client ID',
  }
);

export const getAgentlessCredentialsType = (
  input: NewPackagePolicyInput,
  showCloudConnectors: boolean
): AzureCredentialsType => {
  const credentialsType = getAzureCredentialsType(input);
  if (
    (!credentialsType && showCloudConnectors) ||
    (credentialsType === AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE && showCloudConnectors)
  ) {
    return AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS;
  }

  if (credentialsType === AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE || !credentialsType) {
    return AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET;
  }

  return credentialsType;
};

const getAzureClientIdAndTenantIdFields = (): AzureCredentialsFields => ({
  'azure.credentials.tenant_id': {
    label: I18N_TENANT_ID,
    testSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
    isSecret: true,
    type: 'text',
  },
  'azure.credentials.client_id': {
    label: I18N_CLIENT_ID,
    testSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
    isSecret: true,
    type: 'text',
  },
});

const getAzureSericePrincipalWithClientSecretFields = (): AzureCredentialsFields => ({
  ...getAzureClientIdAndTenantIdFields(),
  'azure.credentials.client_secret': {
    type: 'password',
    isSecret: true,
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.clientSecretLabel',
      {
        defaultMessage: 'Client Secret',
      }
    ),
    testSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET,
  },
});

export const getAzureCloudConnectorsCredentialsFormOptions = (): Pick<
  AzureOptions,
  'cloud_connectors' | 'service_principal_with_client_secret'
> => {
  return {
    [AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudConnectorsLabel',
        {
          defaultMessage: 'Cloud Connectors (recommended)',
        }
      ),
      info: (
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudConnectorsInfo"
            defaultMessage="Cloud Connectors allow you to connect to various cloud services securely."
          />
        </EuiText>
      ),
      fields: {},
    },
    [AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET]: {
      label: i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.servicePrincipalWithClientSecretLabel',
        {
          defaultMessage: 'Service principal with Client Secret',
        }
      ),
      fields: getAzureSericePrincipalWithClientSecretFields(),
    },
  };
};

export const getAzureAgentlessCredentialFormOptions = (): Pick<
  AzureOptions,
  'service_principal_with_client_secret'
> => ({
  [AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET]: {
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.servicePrincipalWithClientSecretLabel',
      {
        defaultMessage: 'Service principal with Client Secret',
      }
    ),
    fields: getAzureSericePrincipalWithClientSecretFields(),
  },
});

export const getAzureCredentialsFormOptions = (): Omit<AzureOptions, 'cloud_connectors'> => ({
  [AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY]: {
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.credentialType.managedIdentityLabel',
      {
        defaultMessage: 'Managed Identity',
      }
    ),
    info: (
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.credentialType.managedIdentityInfo"
          defaultMessage="Ensure the agent is deployed on a resource that supports managed identities (e.g., Azure Virtual Machines). No explicit credentials need to be provided; Azure handles the authentication."
        />
      </EuiText>
    ),
    fields: {},
  },
  [AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE]: {
    label: 'ARM Template',
    info: [],
    fields: {},
  },
  // TODO: remove for stack version 8.13
  [AZURE_CREDENTIALS_TYPE.MANUAL]: {
    label: 'Manual',
    info: [],
    fields: {},
  },
  [AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET]: {
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.servicePrincipalWithClientSecretLabel',
      {
        defaultMessage: 'Service principal with Client Secret',
      }
    ),
    fields: getAzureSericePrincipalWithClientSecretFields(),
  },
  [AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE]: {
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.servicePrincipalWithClientCertificateLabel',
      {
        defaultMessage: 'Service principal with Client Certificate',
      }
    ),
    fields: {
      ...getAzureClientIdAndTenantIdFields(),
      'azure.credentials.client_certificate_path': {
        label: i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.clientCertificatePathLabel',
          {
            defaultMessage: 'Client Certificate Path',
          }
        ),
        testSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PATH,
      },
      'azure.credentials.client_certificate_password': {
        type: 'password',
        isSecret: true,
        label: i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.clientCertificatePasswordLabel',
          {
            defaultMessage: 'Client Certificate Password',
          }
        ),
        testSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PASSWORD,
      },
    },
  },
  [AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD]: {
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.servicePrincipalWithClientUsernameAndPasswordLabel',
      { defaultMessage: 'Service principal with Client Username and Password' }
    ),
    fields: {
      ...getAzureClientIdAndTenantIdFields(),
      'azure.credentials.client_username': {
        label: i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.clientUsernameLabel',
          {
            defaultMessage: 'Client Username',
          }
        ),
        testSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_USERNAME,
      },
      'azure.credentials.client_password': {
        type: 'password',
        isSecret: true,
        label: i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.clientPasswordLabel',
          {
            defaultMessage: 'Client Password',
          }
        ),
        testSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_PASSWORD,
      },
    },
  },
});
