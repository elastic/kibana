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
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import type { CloudSetup as ICloudSetup } from '@kbn/cloud-plugin/public';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { CloudSetupConfig, UpdatePolicy } from './types';
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
import { CloudConnectorSetup } from './cloud_connector/cloud_connector_setup';
import { CloudSetupProvider } from './cloud_setup_context';
import { AWS_PROVIDER, GCP_PROVIDER, AZURE_PROVIDER } from './constants';
import { useCloudSetup } from './hooks/use_cloud_setup_context';

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
      cloudConnectorEnabledVersion,
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
      showCloudConnectors,
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
      uiSettings,
      templateName,
      defaultProviderType,
      config,
      getCloudSetupProviderByInputType,
      cloudConnectorEnabledVersion,
    });

    const namespaceSupportEnabled = config.namespaceSupportEnabled;

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
        <ProviderSelector
          selectedProvider={selectedProvider}
          setInput={setEnabledPolicyInput}
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
          <>
            {showCloudConnectors ? (
              <CloudConnectorSetup
                templateName={templateName}
                input={input}
                newPolicy={newPolicy}
                packageInfo={packageInfo}
                updatePolicy={updatePolicy}
                isEditPage={isEditPage}
                hasInvalidRequiredVars={hasInvalidRequiredVars}
                cloud={cloud}
                cloudProvider={selectedProvider}
              />
            ) : (
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
          </>
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
      <CloudSetupProvider config={configuration}>
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
