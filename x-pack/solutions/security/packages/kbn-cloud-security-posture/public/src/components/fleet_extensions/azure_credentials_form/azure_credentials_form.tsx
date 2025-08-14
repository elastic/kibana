/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef } from 'react';
import { EuiCallOut, EuiFormRow, EuiLink, EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import semverValid from 'semver/functions/valid';
import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import { getAzureCredentialsFormManualOptions } from './get_azure_credentials_form_options';
import { useAzureCredentialsForm } from './azure_hooks';
import { getPosturePolicy } from '../utils';
import { CspRadioOption, RadioGroup } from '../csp_boxed_radio_group';
import { AZURE_SETUP_FORMAT, ARM_TEMPLATE_EXTERNAL_DOC_URL } from '../constants';
import {
  CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS,
  AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
} from './azure_test_subjects';
import { AzureSetupInfoContent } from './azure_setup_info';
import { AzureInputVarFields } from './azure_input_var_fields';
import {
  AzureCredentialsType,
  AzureSetupFormat,
  NewPackagePolicyPostureInput,
  UpdatePolicy,
} from '../types';

const getSetupFormatOptions = (): CspRadioOption[] => [
  {
    id: AZURE_SETUP_FORMAT.ARM_TEMPLATE,
    label: 'ARM Template',
    testId: CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE,
  },
  {
    id: AZURE_SETUP_FORMAT.MANUAL,
    label: i18n.translate('securitySolutionPackages.azureIntegration.setupFormatOptions.manual', {
      defaultMessage: 'Manual',
    }),
    testId: CIS_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL,
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
      <EuiCallOut color="warning">
        <FormattedMessage
          id="securitySolutionPackages.azureIntegration.armTemplateSetupStep.notSupported"
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
              id="securitySolutionPackages.azureIntegration.armTemplateSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.azureIntegration.armTemplateSetupStep.login"
              defaultMessage="Log in to your Azure portal."
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.azureIntegration.armTemplateSetupStep.save"
              defaultMessage="Click the Save and continue button on the bottom right of this page."
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.azureIntegration.armTemplateSetupStep.launch"
              defaultMessage="On the subsequent pop-up modal, copy the relevant Bash command, then click on the Launch ARM Template button."
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.azureIntegration.armTemplateSetupNote"
          defaultMessage="Read the {documentation} for more details"
          values={{
            documentation: (
              <EuiLink
                href={ARM_TEMPLATE_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                {i18n.translate('securitySolutionPackages.azureIntegration.documentationLinkText', {
                  defaultMessage: 'documentation',
                })}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};

const AzureCredentialTypeSelector = ({
  type,
  onChange,
}: {
  onChange(type: AzureCredentialsType): void;
  type: AzureCredentialsType;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate(
      'securitySolutionPackages.azureIntegration.azureCredentialTypeSelectorLabel',
      {
        defaultMessage: 'Preferred manual method',
      }
    )}
  >
    <EuiSelect
      fullWidth
      options={getAzureCredentialsFormManualOptions()}
      value={type}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AzureCredentialsType);
      }}
      data-test-subj={AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ}
    />
  </EuiFormRow>
);

const TemporaryManualSetup = ({ documentationLink }: { documentationLink: string }) => {
  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.azureIntegration.manualCredentialType.instructions"
          defaultMessage="Ensure the agent is deployed on a resource that supports managed identities (e.g., Azure Virtual Machines). No explicit credentials need to be provided; Azure handles the authentication. Refer to our {gettingStartedLink} guide for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={documentationLink} target="_blank">
                <FormattedMessage
                  id="securitySolutionPackages.azureIntegration.gettingStarted.setupInfoContentLink"
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
          id="securitySolutionPackages.azureIntegration.manualCredentialType.documentaion"
          defaultMessage="Read the {documentation} for more details"
          values={{
            documentation: (
              <EuiLink
                href={ARM_TEMPLATE_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                {i18n.translate('securitySolutionPackages.azureIntegration.documentationLinkText', {
                  defaultMessage: 'documentation',
                })}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};

const AZURE_MINIMUM_PACKAGE_VERSION = '1.6.0';
const AZURE_MANUAL_FIELDS_PACKAGE_VERSION = '1.7.0';

interface AzureCredentialsFormProps {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>;
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

  if (!setupFormat) {
    onSetupFormatChange(AZURE_SETUP_FORMAT.ARM_TEMPLATE);
  }

  const packageSemanticVersion = semverValid(packageInfo.version);
  const cleanPackageVersion = semverCoerce(packageSemanticVersion) || '';
  const isPackageVersionValidForAzure = !semverLt(
    cleanPackageVersion,
    AZURE_MINIMUM_PACKAGE_VERSION
  );
  const isPackageVersionValidForManualFields = !semverLt(
    cleanPackageVersion,
    AZURE_MANUAL_FIELDS_PACKAGE_VERSION
  );

  if (
    isValidAzureRef.current &&
    isValid &&
    !isPackageVersionValidForAzure &&
    setupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE
  ) {
    isValidAzureRef.current = false;
    updatePolicy({ updatedPolicy: newPolicy, isValid: false });
  }

  if (!isPackageVersionValidForAzure) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiCallOut color="warning">
          <FormattedMessage
            id="securitySolutionPackages.azureIntegration.azureNotSupportedMessage"
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
      {setupFormat === AZURE_SETUP_FORMAT.MANUAL && !isPackageVersionValidForManualFields && (
        <TemporaryManualSetup documentationLink={documentationLink} />
      )}
      {setupFormat === AZURE_SETUP_FORMAT.MANUAL && isPackageVersionValidForManualFields && (
        <>
          <AzureCredentialTypeSelector
            type={azureCredentialsType}
            onChange={(optionId) => {
              updatePolicy({
                updatedPolicy: getPosturePolicy(newPolicy, input.type, {
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
                updatedPolicy: getPosturePolicy(newPolicy, input.type, { [key]: { value } }),
              });
            }}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
          <EuiSpacer size="m" />
          {group.info}
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.azureIntegration.manualCredentialType.documentation"
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
                      'securitySolutionPackages.azureIntegration.documentationLinkText',
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
