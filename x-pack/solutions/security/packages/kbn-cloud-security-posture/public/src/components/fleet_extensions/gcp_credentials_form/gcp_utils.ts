/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/public/types';
import type { PackageInfo, PackagePolicyConfigRecordEntry } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import {
  GcpCredentialsType,
  GcpFields,
  GcpInputFields,
  NewPackagePolicyPostureInput,
} from '../types';
import { getCspmCloudShellDefaultValue } from '../utils';
import { GCP_CREDENTIALS_TYPE } from '../constants';

export const gcpField: GcpInputFields = {
  fields: {
    'gcp.organization_id': {
      label: i18n.translate('securitySolutionPackages.gcpIntegration.organizationIdFieldLabel', {
        defaultMessage: 'Organization ID',
      }),
      type: 'text',
    },
    'gcp.project_id': {
      label: i18n.translate('securitySolutionPackages.gcpIntegration.projectidFieldLabel', {
        defaultMessage: 'Project ID',
      }),
      type: 'text',
    },
    'gcp.credentials.file': {
      label: i18n.translate(
        'securitySolutionPackages.findings.gcpIntegration.gcpInputText.credentialFileText',
        {
          defaultMessage: 'Path to JSON file containing the credentials and key used to subscribe',
        }
      ),
      type: 'text',
    },
    'gcp.credentials.json': {
      label: i18n.translate(
        'securitySolutionPackages.findings.gcpIntegration.gcpInputText.credentialJSONText',
        {
          defaultMessage: 'JSON blob containing the credentials and key used to subscribe',
        }
      ),
      type: 'password',
      isSecret: true,
    },
    'gcp.credentials.type': {
      label: i18n.translate(
        'securitySolutionPackages.findings.gcpIntegration.gcpInputText.credentialSelectBoxTitle',
        {
          defaultMessage: 'Credential',
        }
      ),
      type: 'text',
    },
  },
};

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: GcpFields) =>
  Object.entries(input.streams[0].vars || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        value: inputVar.value,
      } as const;
    });

export const getGcpCredentialsType = (
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_gcp' }>
): GcpCredentialsType | undefined => input.streams[0].vars?.['gcp.credentials.type'].value;

export const getDefaultGcpHiddenVars = (
  packageInfo: PackageInfo,
  setupTechnology?: SetupTechnology
): Record<string, PackagePolicyConfigRecordEntry> => {
  if (setupTechnology && setupTechnology === SetupTechnology.AGENTLESS) {
    return {
      'gcp.credentials.type': {
        value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON,
        type: 'text',
      },
    };
  }

  const hasCloudShellUrl = !!getCspmCloudShellDefaultValue(packageInfo);
  if (hasCloudShellUrl) {
    return {
      'gcp.credentials.type': {
        value: GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE,
        type: 'text',
      },
    };
  }

  return {
    'gcp.credentials.type': {
      value: GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE,
      type: 'text',
    },
  };
};
