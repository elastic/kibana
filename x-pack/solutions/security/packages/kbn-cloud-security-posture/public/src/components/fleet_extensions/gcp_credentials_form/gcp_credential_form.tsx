/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiCallOut, EuiFieldText, EuiForm, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { type NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  GCP_INPUT_FIELDS_TEST_SUBJECTS,
  GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS,
} from '@kbn/cloud-security-posture-common';
import { ORGANIZATION_ACCOUNT } from '@kbn/fleet-plugin/common';
import type { CspRadioOption } from '../../csp_boxed_radio_group';
import { RadioGroup } from '../../csp_boxed_radio_group';
import {
  fieldIsInvalid,
  getCloudShellDefaultValue,
  updatePolicyWithInputs,
  gcpField,
  getGcpCredentialsType,
  getGcpInputVarsFields,
} from '../utils';
import { GCP_CREDENTIALS_TYPE, GCP_SETUP_ACCESS } from '../constants';
import { ReadDocumentation } from '../common';
import type { GcpFields, GcpInputFields, UpdatePolicy } from '../types';
import { GcpInputVarFields } from './gcp_input_var_fields';
import { GCPSetupInfoContent } from './gcp_setup_info';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

type SetupFormatGCP = typeof GCP_SETUP_ACCESS.CLOUD_SHELL | typeof GCP_SETUP_ACCESS.MANUAL;

const GoogleCloudShellSetup = ({
  fields,
  onChange,
  input,
  disabled,
  hasInvalidRequiredVars,
}: {
  fields: Array<GcpFields[keyof GcpFields] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
  input: NewPackagePolicyInput;
  disabled: boolean;
  hasInvalidRequiredVars: boolean;
}) => {
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const getFieldById = (id: keyof GcpInputFields['fields']) => {
    return fields.find((element) => element.id === id);
  };
  const projectIdFields = getFieldById('gcp.project_id');
  const projectIdValueInvalid = fieldIsInvalid(projectIdFields?.value, hasInvalidRequiredVars);
  const projectIdError = `${projectIdFields?.label} is required`;

  const organizationIdFields = getFieldById('gcp.organization_id');
  const organizationIdValueInvalid = fieldIsInvalid(
    organizationIdFields?.value,
    hasInvalidRequiredVars
  );
  const organizationIdError = `${organizationIdFields?.label} is required`;
  return (
    <>
      <EuiText
        color="subdued"
        size="s"
        data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.GOOGLE_CLOUD_SHELL_SETUP}
      >
        <ol
          css={css`
            list-style: auto;
          `}
        >
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudShellSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudShellSetupStep.login"
              defaultMessage="Log into your Google Cloud Console"
            />
          </li>
          {accountType === ORGANIZATION_ACCOUNT ? (
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.organizationCloudShellSetupStep.save"
                defaultMessage="Note down the GCP organization ID of the organization you wish to monitor and project ID where you want to provision resources for monitoring purposes and provide them in the input boxes below"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudShellSetupStep.save"
                defaultMessage="Note down the GCP project ID of the project you wish to monitor"
              />
            </li>
          )}

          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudShellSetupStep.launch"
              defaultMessage='Click "Save and Continue" at the bottom right of the page. Then, on the pop-up modal, click "Launch Google Cloud Shell"'
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiForm component="form">
        {organizationIdFields && accountType === ORGANIZATION_ACCOUNT && (
          <EuiFormRow
            fullWidth
            label={gcpField.fields['gcp.organization_id'].label}
            isInvalid={organizationIdValueInvalid}
            error={organizationIdValueInvalid ? organizationIdError : undefined}
          >
            <EuiFieldText
              disabled={disabled}
              data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID}
              id={organizationIdFields.id}
              fullWidth
              value={organizationIdFields.value || ''}
              onChange={(event) => onChange(organizationIdFields.id, event.target.value)}
              isInvalid={organizationIdValueInvalid}
            />
          </EuiFormRow>
        )}
        {projectIdFields && (
          <EuiFormRow
            fullWidth
            label={gcpField.fields['gcp.project_id'].label}
            isInvalid={projectIdValueInvalid}
            error={projectIdValueInvalid ? projectIdError : undefined}
          >
            <EuiFieldText
              disabled={disabled}
              data-test-subj={GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID}
              id={projectIdFields.id}
              fullWidth
              value={projectIdFields.value || ''}
              onChange={(event) => onChange(projectIdFields.id, event.target.value)}
              isInvalid={projectIdValueInvalid}
            />
          </EuiFormRow>
        )}
      </EuiForm>
      <EuiSpacer size="m" />
    </>
  );
};

const getSetupFormatOptions = (): CspRadioOption[] => [
  {
    id: GCP_SETUP_ACCESS.CLOUD_SHELL,
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.setupFormatOptions.googleCloudShell',
      {
        defaultMessage: 'Google Cloud Shell',
      }
    ),
    disabled: false,
    testId: GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL,
  },
  {
    id: GCP_SETUP_ACCESS.MANUAL,
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.setupFormatOptions.manual',
      {
        defaultMessage: 'Manual',
      }
    ),
    disabled: false,
    testId: GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL,
  },
];

interface GcpFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyInput;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  disabled: boolean;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
}

const getSetupFormatFromInput = (input: NewPackagePolicyInput): SetupFormatGCP => {
  const credentialsType = getGcpCredentialsType(input);

  // Google Cloud shell is the default value
  if (!credentialsType) {
    return GCP_SETUP_ACCESS.CLOUD_SHELL;
  }

  if (credentialsType !== GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE) {
    return GCP_SETUP_ACCESS.MANUAL;
  }

  return GCP_SETUP_ACCESS.CLOUD_SHELL;
};

const getGoogleCloudShellUrl = (newPolicy: NewPackagePolicy, policyType?: string) => {
  if (!policyType) {
    return undefined;
  }
  const template: string | undefined = newPolicy?.inputs?.find((i) => i.type === policyType)?.config
    ?.cloud_shell_url?.value;

  return template || undefined;
};

const updateCloudShellUrl = (
  newPolicy: NewPackagePolicy,
  updatePolicy: UpdatePolicy,
  templateUrl: string | undefined,
  policyType?: string
) => {
  if (!policyType) {
    return;
  }

  updatePolicy?.({
    updatedPolicy: {
      ...newPolicy,
      inputs: newPolicy.inputs.map((input) => {
        if (input.type === policyType) {
          return {
            ...input,
            config: { cloud_shell_url: { value: templateUrl } },
          };
        }
        return input;
      }),
    },
  });
};

const useCloudShellUrl = ({
  packageInfo,
  newPolicy,
  updatePolicy,
  setupFormat,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  setupFormat: SetupFormatGCP;
}) => {
  const { gcpPolicyType, templateName } = useCloudSetup();
  useEffect(() => {
    const policyInputCloudShellUrl = getGoogleCloudShellUrl(newPolicy, gcpPolicyType);
    if (setupFormat === GCP_SETUP_ACCESS.MANUAL) {
      if (policyInputCloudShellUrl) {
        updateCloudShellUrl(newPolicy, updatePolicy, undefined, gcpPolicyType);
      }
      return;
    }
    const templateUrl = getCloudShellDefaultValue(packageInfo, templateName);

    // If the template is not available, do not update the policy
    if (templateUrl === '') return;

    // If the template is already set, do not update the policy
    if (policyInputCloudShellUrl === templateUrl) return;

    updateCloudShellUrl(newPolicy, updatePolicy, templateUrl, gcpPolicyType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.cloud_shell_url, newPolicy, packageInfo, setupFormat, gcpPolicyType]);
};

export const GcpCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
  isEditPage,
  hasInvalidRequiredVars,
}: GcpFormProps) => {
  const { gcpEnabled, gcpPolicyType, gcpOverviewPath } = useCloudSetup();
  /* Create a subset of properties from GcpField to use for hiding value of credentials json and credentials file when user switch from Manual to Cloud Shell, we wanna keep Project and Organization ID */
  const { 'gcp.credentials.file': file, 'gcp.credentials.json': json } = gcpField.fields;
  const subsetOfGcpField = {
    'gcp.credentials.file': file,
    'gcp.credentials.json': json,
  };

  const fieldsToHide = getGcpInputVarsFields(input, subsetOfGcpField);
  const fields = getGcpInputVarsFields(input, gcpField.fields);
  const fieldsSnapshot = useRef({});
  const lastCredentialsType = useRef<string | undefined>(undefined);
  const setupFormat = getSetupFormatFromInput(input);
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const isOrganization = accountType === 'organization-account';

  useCloudShellUrl({
    packageInfo,
    newPolicy,
    updatePolicy,
    setupFormat,
  });
  const onSetupFormatChange = (newSetupFormat: SetupFormatGCP) => {
    if (newSetupFormat === GCP_SETUP_ACCESS.CLOUD_SHELL) {
      // We need to store the current manual fields to restore them later
      fieldsSnapshot.current = Object.fromEntries(
        fieldsToHide.map((field) => [field.id, { value: field.value }])
      );
      // We need to store the last manual credentials type to restore it later
      lastCredentialsType.current = getGcpCredentialsType(input);

      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, gcpPolicyType, {
          'gcp.credentials.type': {
            value: GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE,
            type: 'text',
          },
          // Clearing fields from previous setup format to prevent exposing credentials
          // when switching from manual to cloud formation
          ...Object.fromEntries(fieldsToHide.map((field) => [field.id, { value: undefined }])),
        }),
      });
    } else {
      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, gcpPolicyType, {
          'gcp.credentials.type': {
            // Restoring last manual credentials type
            value: lastCredentialsType.current || GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE,
            type: 'text',
          },
          // Restoring fields from manual setup format if any
          ...fieldsSnapshot.current,
        }),
      });
    }
  };

  if (!gcpEnabled) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiCallOut announceOnMount={false} color="warning">
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.gcpNotSupportedMessage"
            defaultMessage="CIS GCP is not supported on the current Integration version, please upgrade your integration to the latest version to use CIS GCP"
          />
        </EuiCallOut>
      </>
    );
  }
  return (
    <>
      <GCPSetupInfoContent isAgentless={false} />
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        size="m"
        options={getSetupFormatOptions()}
        idSelected={setupFormat}
        onChange={(idSelected: SetupFormatGCP) =>
          idSelected !== setupFormat && onSetupFormatChange(idSelected)
        }
        name="setupFormat"
      />
      <EuiSpacer size="l" />
      {setupFormat === GCP_SETUP_ACCESS.CLOUD_SHELL ? (
        <GoogleCloudShellSetup
          disabled={disabled}
          fields={fields}
          onChange={(key, value) =>
            updatePolicy({
              updatedPolicy: updatePolicyWithInputs(newPolicy, gcpPolicyType, {
                [key]: { value },
              }),
            })
          }
          input={input}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      ) : (
        <GcpInputVarFields
          disabled={disabled}
          fields={fields}
          onChange={(key, value) =>
            updatePolicy({
              updatedPolicy: updatePolicyWithInputs(newPolicy, gcpPolicyType, {
                [key]: { value },
              }),
            })
          }
          isOrganization={isOrganization}
          packageInfo={packageInfo}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}

      <EuiSpacer size="s" />
      <ReadDocumentation url={gcpOverviewPath} />
      <EuiSpacer />
    </>
  );
};
