/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef } from 'react';
import { EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AZURE_SETUP_FORMAT_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import { useAzureCredentialsForm } from './azure_hooks';
import { updatePolicyWithInputs } from '../utils';
import type { CspRadioOption } from '../../csp_boxed_radio_group';
import { RadioGroup } from '../../csp_boxed_radio_group';
import { AZURE_SETUP_FORMAT, ARM_TEMPLATE_EXTERNAL_DOC_URL } from '../constants';
import { AzureSetupInfoContent } from './azure_setup_info';
import { AzureInputVarFields } from './azure_input_var_fields';
import type { AzureSetupFormat, UpdatePolicy } from '../types';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import { AzureCredentialTypeSelector } from './azure_credential_type_selector';
import { getAzureCredentialsFormManualOptions } from './get_azure_credentials_form_options';

const getSetupFormatOptions = (): CspRadioOption[] => [
  {
    id: AZURE_SETUP_FORMAT.ARM_TEMPLATE,
    label: 'ARM Template',
    testId: AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE,
  },
  {
    id: AZURE_SETUP_FORMAT.MANUAL,
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.setupFormatOptions.manual',
      {
        defaultMessage: 'Manual',
      }
    ),
    testId: AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL,
  },
];

const ArmTemplateSetup = ({
  hasArmTemplateUrl,
  input,
}: {
  hasArmTemplateUrl: boolean;
  input: NewPackagePolicyInput;
}) => {
  if (!hasArmTemplateUrl) {
    return (
      <EuiCallOut announceOnMount={false} color="warning">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplateSetupStep.notSupported"
          defaultMessage="ARM Template is not supported on the current Integration version, please upgrade your integration to the latest version to use ARM Template"
        />
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiText color="subdued" size="s">
        <ol
          css={css`
            list-style: auto;
          `}
        >
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplateSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplateSetupStep.login"
              defaultMessage="Log in to your Azure portal."
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplateSetupStep.save"
              defaultMessage="Click the Save and continue button on the bottom right of this page."
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplateSetupStep.launch"
              defaultMessage="On the subsequent pop-up modal, copy the relevant Bash command, then click on the Launch ARM Template button."
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="l" />
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

const TemporaryManualSetup = ({ documentationLink }: { documentationLink: string }) => {
  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.manualCredentialType.instructions"
          defaultMessage="Ensure the agent is deployed on a resource that supports managed identities (e.g., Azure Virtual Machines). No explicit credentials need to be provided; Azure handles the authentication. Refer to our {gettingStartedLink} guide for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={documentationLink} target="_blank">
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.gettingStarted.setupInfoContentLink"
                  defaultMessage="Getting Started"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.manualCredentialType.documentaion"
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

interface AzureCredentialsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyInput;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  disabled: boolean;
  hasInvalidRequiredVars: boolean;
  isValid: boolean;
}

export const AzureCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
  hasInvalidRequiredVars,
  isValid,
}: AzureCredentialsFormProps) => {
  const isValidAzureRef = useRef(isValid);
  const {
    group,
    fields,
    azureCredentialsType,
    setupFormat,
    onSetupFormatChange,
    documentationLink,
    hasArmTemplateUrl,
  } = useAzureCredentialsForm({
    newPolicy,
    input,
    packageInfo,
    updatePolicy,
    isValid,
  });
  const { azurePolicyType, azureEnabled, azureManualFieldsEnabled } = useCloudSetup();

  // Ensure supports_cloud_connector is false for agent-based deployments
  if (newPolicy.supports_cloud_connector || newPolicy.cloud_connector_id) {
    updatePolicy({
      updatedPolicy: {
        ...newPolicy,
        supports_cloud_connector: false,
        cloud_connector_id: undefined,
      },
    });
  }

  if (!setupFormat) {
    onSetupFormatChange(AZURE_SETUP_FORMAT.ARM_TEMPLATE);
  }

  // This sets the Fleet wrapper's isValid to false if Azure is not enabled for this version of the integration
  if (
    isValidAzureRef.current &&
    isValid &&
    !azureEnabled // &&
    // setupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE
  ) {
    isValidAzureRef.current = false;
    updatePolicy({ updatedPolicy: newPolicy, isValid: false });
  }

  if (!azureEnabled) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiCallOut announceOnMount={false} color="warning">
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.azureNotSupportedMessage"
            defaultMessage="CIS Azure is not supported on the current Integration version, please upgrade your integration to the latest version to use CIS Azure"
          />
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <AzureSetupInfoContent documentationLink={documentationLink} />
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        size="m"
        options={getSetupFormatOptions()}
        idSelected={setupFormat}
        onChange={(idSelected: AzureSetupFormat) =>
          idSelected !== setupFormat && onSetupFormatChange(idSelected)
        }
        name="setupFormat"
      />
      <EuiSpacer size="l" />
      {setupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE && (
        <ArmTemplateSetup hasArmTemplateUrl={hasArmTemplateUrl} input={input} />
      )}
      {setupFormat === AZURE_SETUP_FORMAT.MANUAL && !azureManualFieldsEnabled && (
        <TemporaryManualSetup documentationLink={documentationLink} />
      )}
      {setupFormat === AZURE_SETUP_FORMAT.MANUAL && azureManualFieldsEnabled && (
        <>
          <AzureCredentialTypeSelector
            options={getAzureCredentialsFormManualOptions()}
            type={azureCredentialsType}
            onChange={(optionId) => {
              updatePolicy({
                updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
                  'azure.credentials.type': { value: optionId },
                }),
              });
            }}
          />
          <EuiSpacer size="m" />
          <AzureInputVarFields
            fields={fields}
            packageInfo={packageInfo}
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
          {group.info}
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.manualCredentialType.documentation"
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
      )}
      <EuiSpacer />
    </>
  );
};
