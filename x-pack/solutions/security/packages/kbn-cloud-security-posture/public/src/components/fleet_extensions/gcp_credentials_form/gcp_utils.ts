/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/public/types';
import { GcpFields, GcpInputFields } from '../types';

export const gcpField: GcpInputFields = {
  fields: {
    'gcp.organization_id': {
      label: i18n.translate('xpack.csp.gcpIntegration.organizationIdFieldLabel', {
        defaultMessage: 'Organization ID',
      }),
      type: 'text',
    },
    'gcp.project_id': {
      label: i18n.translate('xpack.csp.gcpIntegration.projectidFieldLabel', {
        defaultMessage: 'Project ID',
      }),
      type: 'text',
    },
    'gcp.credentials.file': {
      label: i18n.translate('xpack.csp.findings.gcpIntegration.gcpInputText.credentialFileText', {
        defaultMessage: 'Path to JSON file containing the credentials and key used to subscribe',
      }),
      type: 'text',
    },
    'gcp.credentials.json': {
      label: i18n.translate('xpack.csp.findings.gcpIntegration.gcpInputText.credentialJSONText', {
        defaultMessage: 'JSON blob containing the credentials and key used to subscribe',
      }),
      type: 'password',
      isSecret: true,
    },
    'gcp.credentials.type': {
      label: i18n.translate(
        'xpack.csp.findings.gcpIntegration.gcpInputText.credentialSelectBoxTitle',
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
