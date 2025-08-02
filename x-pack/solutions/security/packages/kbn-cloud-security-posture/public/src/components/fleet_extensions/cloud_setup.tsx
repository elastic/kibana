/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiAccordion, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import {
  NamespaceComboBox,
  SetupTechnology,
  SetupTechnologySelector,
} from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { CloudSetup as ICloudSetup } from '@kbn/cloud-plugin/public';
import { PackageInfo } from '@kbn/fleet-plugin/common';
import { IUiSettingsClient } from '@kbn/core/public';
import type { CloudSecurityPolicyTemplate, PostureInput, UpdatePolicy } from './types';
import { getPosturePolicy, getDefaultCloudCredentialsType } from './utils';
import { PolicyTemplateInputSelector } from './policy_template_selectors';
import { AwsAccountTypeSelect } from './aws_credentials_form/aws_account_type_selector';
import { GcpAccountTypeSelect } from './gcp_credentials_form/gcp_account_type_selector';
import { AzureAccountTypeSelect } from './azure_credentials_form/azure_account_type_selector';
import { IntegrationSettings } from './integration_settings';
import { AwsCredentialsForm } from './aws_credentials_form/aws_credentials_form';
import { AwsCredentialsFormAgentless } from './aws_credentials_form/aws_credentials_form_agentless';
import { GcpCredentialsFormAgentless } from './gcp_credentials_form/gcp_credentials_form_agentless';
import { GcpCredentialsForm } from './gcp_credentials_form/gcp_credential_form';
import { AzureCredentialsFormAgentless } from './azure_credentials_form/azure_credentials_form_agentless';
import { AzureCredentialsForm } from './azure_credentials_form/azure_credentials_form';
import { useLoadCloudSetup } from './hooks/use_load_cloud_setup';

const EditScreenStepTitle = () => (
  <>
    <EuiTitle size="s">
      <h4>
        <FormattedMessage
          id="securitySolutionPackages.fleetIntegration.integrationSettingsTitle"
          defaultMessage="Integration Settings"
        />
      </h4>
    </EuiTitle>
    <EuiSpacer />
  </>
);
interface CloudSetupProps {
  cloud: ICloudSetup;
  defaultSetupTechnology?: SetupTechnology;
  handleSetupTechnologyChange?: (setupTechnology: SetupTechnology) => void;
  integrationToEnable?: CloudSecurityPolicyTemplate;
  isAgentlessEnabled?: boolean;
  isEditPage: boolean;
  isValid: boolean;
  namespaceSupportEnabled?: boolean;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  validationResults?: PackagePolicyValidationResults;
  uiSettings: IUiSettingsClient;
}

export const CloudSetup = memo<CloudSetupProps>(
  ({
    cloud,
    defaultSetupTechnology,
    handleSetupTechnologyChange,
    integrationToEnable,
    isAgentlessEnabled,
    isEditPage,
    isValid,
    namespaceSupportEnabled = false,
    newPolicy,
    updatePolicy,
    packageInfo,
    validationResults,
    uiSettings,
  }: CloudSetupProps) => {
    const {
      input,
      setEnabledPolicyInput,
      setupTechnology,
      updateSetupTechnology,
      shouldRenderAgentlessSelector,
      isServerless,
      showCloudConnectors,
      hasInvalidRequiredVars,
    } = useLoadCloudSetup({
      newPolicy,
      updatePolicy,
      validationResults,
      isEditPage,
      packageInfo,
      handleSetupTechnologyChange,
      isAgentlessEnabled,
      defaultSetupTechnology,
      integrationToEnable,
      cloud,
      uiSettings,
    });

    const { euiTheme } = useEuiTheme();

    return (
      <>
        {isEditPage && <EditScreenStepTitle />}
        {/* Shows info on the active policy template */}
        <FormattedMessage
          id="securitySolutionPackages.fleetIntegration.configureCspmIntegrationDescription"
          defaultMessage="Select the cloud service provider (CSP) you want to monitor and then fill in the name and description to help identify this integration"
        />
        <EuiSpacer size="l" />
        {/* Defines the single enabled input of the active policy template */}
        <PolicyTemplateInputSelector
          input={input}
          setInput={setEnabledPolicyInput}
          disabled={isEditPage}
        />
        <EuiSpacer size="l" />

        {/* AWS account type selection box */}
        {input.type === 'cloudbeat/cis_aws' && (
          <AwsAccountTypeSelect
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            disabled={isEditPage}
          />
        )}

        {input.type === 'cloudbeat/cis_gcp' && (
          <GcpAccountTypeSelect
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            disabled={isEditPage}
          />
        )}

        {input.type === 'cloudbeat/cis_azure' && (
          <AzureAccountTypeSelect
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            disabled={isEditPage}
            setupTechnology={setupTechnology}
          />
        )}

        <EuiSpacer size="l" />
        <IntegrationSettings
          newPolicy={newPolicy}
          validationResults={validationResults}
          onChange={(field, value) =>
            updatePolicy({ updatedPolicy: { ...newPolicy, [field]: value } })
          }
        />

        {/* Namespace selector */}
        {namespaceSupportEnabled && (
          <>
            <EuiSpacer size="m" />
            <EuiAccordion
              id="advancedOptions"
              data-test-subj="advancedOptionsAccordion"
              buttonContent={
                <EuiText
                  size="xs"
                  color={euiTheme.colors.textPrimary}
                  css={{
                    fontWeight: euiTheme.font.weight.medium,
                  }}
                >
                  <FormattedMessage
                    id="securitySolutionPackages.fleetIntegration.advancedOptionsLabel"
                    defaultMessage="Advanced options"
                  />
                </EuiText>
              }
              paddingSize="m"
            >
              <NamespaceComboBox
                fullWidth
                namespace={newPolicy.namespace}
                placeholder="default"
                isEditPage={isEditPage}
                validationError={validationResults?.namespace}
                onNamespaceChange={(namespace: string) => {
                  updatePolicy({ updatedPolicy: { ...newPolicy, namespace } });
                }}
                data-test-subj="namespaceInput"
                labelId="securitySolutionPackages.fleetIntegration.namespaceLabel"
                helpTextId="securitySolutionPackages.fleetIntegration.awsAccountType.awsOrganizationDescription"
              />
            </EuiAccordion>
          </>
        )}
        {shouldRenderAgentlessSelector && (
          <>
            <EuiSpacer size="m" />
            <SetupTechnologySelector
              showLimitationsMessage={!isServerless}
              disabled={isEditPage}
              setupTechnology={setupTechnology}
              allowedSetupTechnologies={[SetupTechnology.AGENT_BASED, SetupTechnology.AGENTLESS]}
              showBetaBadge={false}
              useDescribedFormGroup={false}
              onSetupTechnologyChange={(value) => {
                updateSetupTechnology(value);
                updatePolicy({
                  updatedPolicy: getPosturePolicy(
                    newPolicy,
                    input.type,
                    getDefaultCloudCredentialsType(
                      value === SetupTechnology.AGENTLESS,
                      input.type as Extract<
                        PostureInput,
                        'cloudbeat/cis_aws' | 'cloudbeat/cis_azure' | 'cloudbeat/cis_gcp'
                      >,
                      packageInfo,
                      showCloudConnectors
                    )
                  ),
                });
              }}
            />
          </>
        )}

        {input.type === 'cloudbeat/cis_aws' && setupTechnology === SetupTechnology.AGENTLESS && (
          <AwsCredentialsFormAgentless
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            isEditPage={isEditPage}
            setupTechnology={setupTechnology}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            showCloudConnectors={showCloudConnectors}
            cloud={cloud}
          />
        )}
        {input.type === 'cloudbeat/cis_aws' && setupTechnology !== SetupTechnology.AGENTLESS && (
          <AwsCredentialsForm
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            disabled={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            isValid={isValid}
          />
        )}
        {input.type === 'cloudbeat/cis_gcp' && setupTechnology === SetupTechnology.AGENTLESS && (
          <GcpCredentialsFormAgentless
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            disabled={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
        )}
        {input.type === 'cloudbeat/cis_gcp' && setupTechnology !== SetupTechnology.AGENTLESS && (
          <GcpCredentialsForm
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            disabled={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
        )}
        {input.type === 'cloudbeat/cis_azure' && setupTechnology === SetupTechnology.AGENTLESS && (
          <AzureCredentialsFormAgentless
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
        )}
        {input.type === 'cloudbeat/cis_azure' && setupTechnology !== SetupTechnology.AGENTLESS && (
          <AzureCredentialsForm
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            disabled={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            isValid={isValid}
          />
        )}
        <EuiSpacer />
      </>
    );
  }
);

CloudSetup.displayName = 'CloudSetup';

// eslint-disable-next-line import/no-default-export
export { CloudSetup as default };
