/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { ARM_TEMPLATE_EXTERNAL_DOC_URL, AZURE_CREDENTIALS_TYPE } from '../constants';
import { updatePolicyWithInputs } from '../utils';
import {
  getAzureCredentialsFormOptions,
  getInputVarsFields,
} from './get_azure_credentials_form_options';
import type { UpdatePolicy } from '../types';
import { AzureInputVarFields } from './azure_input_var_fields';
import { AzureSetupInfoContent } from './azure_setup_info';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

interface AzureCredentialsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyInput;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  hasInvalidRequiredVars: boolean;
}

export const AzureCredentialsFormAgentless = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  hasInvalidRequiredVars,
}: AzureCredentialsFormProps) => {
  const { azureOverviewPath, azurePolicyType } = useCloudSetup();

  const options = getAzureCredentialsFormOptions();
  const group = options[AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET];
  const fields = getInputVarsFields(input, group.fields);

  return (
    <>
      <AzureSetupInfoContent documentationLink={azureOverviewPath} />
      <EuiSpacer size="l" />
      <AzureInputVarFields
        packageInfo={packageInfo}
        fields={fields}
        onChange={(key, value) => {
          updatePolicy({
            updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
              [key]: { value },
            }),
          });
        }}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      />
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplateSetupNote"
          defaultMessage="Read the {documentation} for more details"
          values={{
            documentation: (
              <EuiLink
                href={ARM_TEMPLATE_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                {i18n.translate(
                  'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.documentationLinkText',
                  {
                    defaultMessage: 'documentation',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};
