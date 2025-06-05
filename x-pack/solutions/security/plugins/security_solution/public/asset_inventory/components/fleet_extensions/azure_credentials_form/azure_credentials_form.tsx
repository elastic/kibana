/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, useEffect } from 'react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { LazyPackagePolicyInputVarField } from '@kbn/fleet-plugin/public';
import {
  type AzureOptions,
  getAzureCredentialsFormManualOptions,
} from './azure_credentials_form_options';
import type { AzureCredentialsType, AzureSetupFormat } from './types';
import { useAzureCredentialsForm } from './hooks';
import { fieldIsInvalid, findVariableDef, getAssetPolicy } from '../utils';
import { type AssetRadioOption, RadioGroup } from '../asset_boxed_radio_group';
import {
  CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS,
  AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
} from '../test_subjects';
import type { NewPackagePolicyAssetInput } from '../types';
import { AZURE_SETUP_FORMAT } from './constants';

interface AzureSetupInfoContentProps {
  documentationLink: string;
}

export const AzureSetupInfoContent = ({ documentationLink }: AzureSetupInfoContentProps) => {
  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.gettingStarted.setupInfoContent"
          defaultMessage="Utilize an Azure Resource Manager (ARM) template (a built-in Azure IaC tool) or a series of manual steps to set up and deploy Cloud Asset Discovery for assessing your Azure environment's assets. Refer to our {gettingStartedLink} guide for details."
          values={{
            gettingStartedLink: (
              <EuiLink href={documentationLink} target="_blank">
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.gettingStarted.setupInfoContentLink"
                  defaultMessage="Getting Started"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};

const getSetupFormatOptions = (): AssetRadioOption[] => [
  {
    id: AZURE_SETUP_FORMAT.ARM_TEMPLATE,
    label: 'ARM Template',
    testId: CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE,
  },
  {
    id: AZURE_SETUP_FORMAT.MANUAL,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.setupFormatOptions.manual',
      {
        defaultMessage: 'Manual',
      }
    ),
    testId: CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL,
  },
];

export interface AzureCredentialsFormProps {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_azure' }>;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  disabled: boolean;
  hasInvalidRequiredVars: boolean;
}

export const ARM_TEMPLATE_EXTERNAL_DOC_URL =
  'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/';

const ArmTemplateSetup = () => {
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
              id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.armTemplateSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.armTemplateSetupStep.login"
              defaultMessage="Log in to your Azure portal."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.armTemplateSetupStep.save"
              defaultMessage="Click the Save and continue button on the bottom right of this page."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.armTemplateSetupStep.launch"
              defaultMessage="On the subsequent pop-up modal, copy the relevant Bash command, then click on the Launch ARM Template button."
            />
          </li>
        </ol>
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
      'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.azureCredentialTypeSelectorLabel',
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

export const AzureInputVarFields = ({
  fields,
  packageInfo,
  onChange,
  hasInvalidRequiredVars,
}: {
  fields: Array<AzureOptions[keyof AzureOptions]['fields'][number] & { value: string; id: string }>;
  packageInfo: PackageInfo;
  onChange: (key: string, value: string) => void;
  hasInvalidRequiredVars: boolean;
}) => {
  return (
    <div>
      {fields.map((field, index) => {
        const invalid = fieldIsInvalid(field.value, hasInvalidRequiredVars);
        const invalidError = i18n.translate(
          'xpack.securitySolution.assetInventory.assetIntegration.googleCloudShellCredentials.integration.fieldRequired',
          {
            defaultMessage: '{field} is required',
            values: {
              field: field.label,
            },
          }
        );
        return (
          <div key={index}>
            {field.type === 'password' && field.isSecret === true && (
              <>
                <EuiSpacer size="m" />
                <div
                  css={css`
                    width: 100%;
                    .euiFormControlLayout,
                    .euiFormControlLayout__childrenWrapper,
                    .euiFormRow,
                    input {
                      max-width: 100%;
                      width: 100%;
                    }
                  `}
                >
                  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
                    <LazyPackagePolicyInputVarField
                      varDef={{
                        ...(findVariableDef(packageInfo, field.id) || {}),
                        name: field.id, // Ensure 'name' is explicitly set
                        required: true,
                        type: 'password',
                      }}
                      value={field.value || ''}
                      onChange={(value) => {
                        onChange(field.id, value);
                      }}
                      errors={invalid ? [invalidError] : []}
                      forceShowErrors={invalid}
                      isEditPage={true}
                    />
                  </Suspense>
                </div>
              </>
            )}
            {field.type === 'text' && (
              <>
                <EuiFormRow
                  key={field.id}
                  label={field.label}
                  fullWidth
                  hasChildLabel={true}
                  id={field.id}
                  isInvalid={invalid}
                  error={invalid ? invalidError : undefined}
                >
                  <EuiFieldText
                    id={field.id}
                    fullWidth
                    value={field.value || ''}
                    onChange={(event) => onChange(field.id, event.target.value)}
                    data-test-subj={field.testSubj}
                    isInvalid={invalid}
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const AzureCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
  hasInvalidRequiredVars,
}: AzureCredentialsFormProps) => {
  const {
    group,
    fields,
    azureCredentialsType,
    setupFormat,
    onSetupFormatChange,
    documentationLink,
  } = useAzureCredentialsForm({
    newPolicy,
    input,
    packageInfo,
    updatePolicy,
  });

  useEffect(() => {
    if (!setupFormat) {
      onSetupFormatChange(AZURE_SETUP_FORMAT.ARM_TEMPLATE);
    }
  }, [setupFormat, onSetupFormatChange]);

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
      />
      <EuiSpacer size="l" />
      {setupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE && <ArmTemplateSetup />}
      {setupFormat === AZURE_SETUP_FORMAT.MANUAL && (
        <AzureCredentialTypeSelector
          type={azureCredentialsType}
          onChange={(optionId) => {
            updatePolicy(
              getAssetPolicy(newPolicy, input.type, {
                'azure.credentials.type': { value: optionId },
              })
            );
          }}
        />
      )}
      <EuiSpacer size="m" />
      <AzureInputVarFields
        fields={fields}
        packageInfo={packageInfo}
        onChange={(key, value) => {
          updatePolicy(getAssetPolicy(newPolicy, input.type, { [key]: { value } }));
        }}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      />
      <EuiSpacer size="m" />
      {group.info}
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.manualCredentialType.documentation"
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
                  'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.documentationLinkText',
                  {
                    defaultMessage: 'documentation',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer />
    </>
  );
};
