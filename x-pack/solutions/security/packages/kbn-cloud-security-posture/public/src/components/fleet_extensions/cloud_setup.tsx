/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback } from 'react';
import { EuiAccordion, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import {
  NamespaceComboBox,
  SetupTechnology,
  SetupTechnologySelector,
} from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import type { CloudSetup as ICloudSetup } from '@kbn/cloud-plugin/public';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import {
  ADVANCED_OPTION_ACCORDION_TEST_SUBJ,
  NAMESPACE_INPUT_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import type { CloudSetupConfig, UpdatePolicy, CloudProviders } from './types';
import { updatePolicyWithInputs, getDefaultCloudCredentialsType } from './utils';
import { ProviderSelector } from './provider_selector';
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
import { CloudSetupProvider } from './cloud_setup_context';
import { AWS_PROVIDER, GCP_PROVIDER, AZURE_PROVIDER } from './constants';
import { useCloudSetup } from './hooks/use_cloud_setup_context';

const EditScreenStepTitle = () => (
  <>
    <EuiTitle size="s">
      <h4>
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.integrationSettingsTitle"
          defaultMessage="Integration Settings"
        />
      </h4>
    </EuiTitle>
    <EuiSpacer />
  </>
);
type CloudSetupProps = CloudIntegrationSetupProps & {
  configuration: CloudSetupConfig;
};

interface CloudIntegrationSetupProps {
  cloud: ICloudSetup;
  defaultSetupTechnology?: SetupTechnology;
  handleSetupTechnologyChange?: (setupTechnology: SetupTechnology) => void;
  isAgentlessEnabled?: boolean;
  isEditPage: boolean;
  isValid: boolean;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  validationResults?: PackagePolicyValidationResults;
  uiSettings: IUiSettingsClient;
}

const CloudIntegrationSetup = memo<CloudIntegrationSetupProps>(
  // eslint-disable-next-line complexity
  ({
    cloud,
    defaultSetupTechnology,
    handleSetupTechnologyChange,
    isAgentlessEnabled,
    isEditPage,
    isValid,
    newPolicy,
    updatePolicy,
    packageInfo,
    validationResults,
    uiSettings,
  }: CloudIntegrationSetupProps) => {
    const {
      templateName,
      config,
      defaultProviderType,
      getCloudSetupProviderByInputType,
      isAzureCloudConnectorEnabled,
      isGcpCloudConnectorEnabled,
      isAwsCloudConnectorEnabled,
    } = useCloudSetup();
    const {
      input,
      setEnabledPolicyInput,
      selectedProvider,
      setupTechnology,
      updateSetupTechnology,
      shouldRenderAgentlessSelector,
      isServerless,
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
      cloud,
      templateName,
      defaultProviderType,
      config,
      getCloudSetupProviderByInputType,
    });

    const isCloudConnectorsEnabledForProvider = useCallback(
      (provider: CloudProviders) => {
        switch (provider) {
          case AWS_PROVIDER:
            return isAwsCloudConnectorEnabled;
          case AZURE_PROVIDER:
            return isAzureCloudConnectorEnabled;
          case GCP_PROVIDER:
            return isGcpCloudConnectorEnabled;
          default:
            return false;
        }
      },
      [isAwsCloudConnectorEnabled, isAzureCloudConnectorEnabled, isGcpCloudConnectorEnabled]
    );

    const namespaceSupportEnabled = config.namespaceSupportEnabled;

    const { euiTheme } = useEuiTheme();

    return (
      <>
        {isEditPage && <EditScreenStepTitle />}
        {/* Shows info on the active policy template */}
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.configureIntegrationDescription"
          defaultMessage="Select the cloud service provider (CSP) you want to monitor and then fill in the name and description to help identify this integration"
        />
        <EuiSpacer size="l" />
        {/* Defines the single enabled input of the active policy template */}
        <ProviderSelector
          selectedProvider={selectedProvider}
          setSelectedProvider={(provider) => {
            const showCloudConnectors = isCloudConnectorsEnabledForProvider(provider);
            setEnabledPolicyInput(provider, showCloudConnectors);
          }}
          disabled={isEditPage}
        />
        <EuiSpacer size="l" />

        {/* AWS account type selection box */}
        {selectedProvider && selectedProvider === AWS_PROVIDER && (
          <AwsAccountTypeSelect
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            disabled={isEditPage}
          />
        )}

        {selectedProvider && selectedProvider === GCP_PROVIDER && (
          <GcpAccountTypeSelect
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            disabled={isEditPage}
          />
        )}

        {selectedProvider && selectedProvider === AZURE_PROVIDER && (
          <AzureAccountTypeSelect
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            disabled={isEditPage}
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
              data-test-subj={ADVANCED_OPTION_ACCORDION_TEST_SUBJ}
              buttonContent={
                <EuiText
                  size="xs"
                  color={euiTheme.colors.textPrimary}
                  css={{
                    fontWeight: euiTheme.font.weight.medium,
                  }}
                >
                  <FormattedMessage
                    id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.advancedOptionsLabel"
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
                data-test-subj={NAMESPACE_INPUT_TEST_SUBJ}
                labelId="securitySolutionPackages.cloudSecurityPosture.cloudSetup.namespaceLabel"
                helpTextId="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.accountType.awsOrganizationDescription"
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
                const showCloudConnectors = isCloudConnectorsEnabledForProvider(selectedProvider);
                updatePolicy({
                  updatedPolicy: updatePolicyWithInputs(
                    newPolicy,
                    config.providers[selectedProvider].type,
                    getDefaultCloudCredentialsType(
                      value === SetupTechnology.AGENTLESS,
                      selectedProvider,
                      packageInfo,
                      showCloudConnectors,
                      templateName
                    )
                  ),
                });
              }}
            />
          </>
        )}

        {selectedProvider === AWS_PROVIDER && setupTechnology === SetupTechnology.AGENTLESS && (
          <AwsCredentialsFormAgentless
            cloud={cloud}
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            isEditPage={isEditPage}
            setupTechnology={setupTechnology}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
        )}
        {selectedProvider === AWS_PROVIDER && setupTechnology !== SetupTechnology.AGENTLESS && (
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

        {selectedProvider === GCP_PROVIDER && setupTechnology === SetupTechnology.AGENTLESS && (
          <GcpCredentialsFormAgentless
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            disabled={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
        )}
        {selectedProvider === GCP_PROVIDER && setupTechnology !== SetupTechnology.AGENTLESS && (
          <GcpCredentialsForm
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            disabled={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
        )}

        {selectedProvider === AZURE_PROVIDER && setupTechnology === SetupTechnology.AGENTLESS && (
          <AzureCredentialsFormAgentless
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            setupTechnology={setupTechnology}
          />
        )}
        {selectedProvider === AZURE_PROVIDER && setupTechnology !== SetupTechnology.AGENTLESS && (
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

CloudIntegrationSetup.displayName = 'CloudIntegrationSetup';

export const CloudSetup = memo<CloudSetupProps>(
  ({
    configuration,
    cloud,
    defaultSetupTechnology,
    handleSetupTechnologyChange,
    isAgentlessEnabled,
    isEditPage,
    isValid,
    newPolicy,
    updatePolicy,
    packageInfo,
    validationResults,
    uiSettings,
  }: CloudSetupProps) => {
    return (
      <CloudSetupProvider
        config={configuration}
        cloud={cloud}
        uiSettings={uiSettings}
        packagePolicy={newPolicy}
        packageInfo={packageInfo}
      >
        <CloudIntegrationSetup
          cloud={cloud}
          defaultSetupTechnology={defaultSetupTechnology}
          handleSetupTechnologyChange={handleSetupTechnologyChange}
          isAgentlessEnabled={isAgentlessEnabled}
          isEditPage={isEditPage}
          isValid={isValid}
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          validationResults={validationResults}
          uiSettings={uiSettings}
        />
      </CloudSetupProvider>
    );
  }
);

CloudSetup.displayName = 'CloudSetup';
