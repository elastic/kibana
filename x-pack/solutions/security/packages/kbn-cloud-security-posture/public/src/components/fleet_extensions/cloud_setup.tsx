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
import {
  AWS_PROVIDER,
  AZURE_PROVIDER,
  CloudSetupConfig,
  GCP_PROVIDER,
  type UpdatePolicy,
} from './types';
import { getPosturePolicy, getDefaultCloudCredentialsType } from './utils';
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
import { CloudSetupProvider, useCloudSetup } from './cloud_setup_context';
import { i18n } from '@kbn/i18n';

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
  isAgentlessEnabled?: boolean;
  isEditPage: boolean;
  isValid: boolean;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  validationResults?: PackagePolicyValidationResults;
  uiSettings: IUiSettingsClient;
}
const CloudIntegrationSetup = memo<CloudSetupProps>(
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
  }: CloudSetupProps) => {
    const {
      input,
      setEnabledPolicyInput,
      selectedProvider,
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
      cloud,
      uiSettings,
    });

    const { templateName, config } = useCloudSetup();

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
                  updatedPolicy: getPosturePolicy(
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

export const CloudSetup = memo<CloudSetupProps>(
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
  }: CloudSetupProps) => {
    const AWS_ORG_MINIMUM_PACKAGE_VERSION = '1.5.0-preview20';
    const GCP_ORG_MINIMUM_PACKAGE_VERSION = '1.6.0';
    const AZURE_ORG_MINIMUM_PACKAGE_VERSION = '1.7.0';
    const MIN_VERSION_GCP_CIS = '1.5.2';

    const TEMP_CSPM_MAPPING: CloudSetupConfig = {
      policyTemplate: 'cspm',
      defaultProvider: 'aws',
      namespaceSupportEnabled: true,
      name: i18n.translate('securitySolutionPackages.cspmIntegration.integration.nameTitle', {
        defaultMessage: 'Cloud Security Posture Management',
      }),
      shortName: i18n.translate(
        'securitySolutionPackages.cspmIntegration.integration.shortNameTitle',
        {
          defaultMessage: 'CSPM',
        }
      ),
      overviewPath: `https://ela.st/cspm-overview`,
      getStartedPath: `https://ela.st/cspm-get-started`,
      providers: {
        aws: {
          type: 'cloudbeat/cis_aws',
          showCloudConnectors: true,
          showCloudTemplate: true, // this should be checking the package version and set in CSPM
          organizationMinimumVersion: AWS_ORG_MINIMUM_PACKAGE_VERSION,
          getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started.html`,
          testId: 'cisAwsTestId',
        },
        gcp: {
          type: 'cloudbeat/cis_gcp',
          showCloudConnectors: false,
          showCloudTemplate: true, // this should be checking the package version and set in CSPM
          organizationMinimumVersion: GCP_ORG_MINIMUM_PACKAGE_VERSION,
          getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-gcp.html`,
          minShowVersion: MIN_VERSION_GCP_CIS,
          testId: 'cisGcpTestId',
        },
        azure: {
          type: 'cloudbeat/cis_azure',
          showCloudConnectors: false,
          showCloudTemplate: true, // this should be checking the package version and set in CSPM
          organizationMinimumVersion: AZURE_ORG_MINIMUM_PACKAGE_VERSION,
          getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-azure.html`,
          testId: 'cisAzureTestId',
        },
      },
    };

    return (
      <CloudSetupProvider config={TEMP_CSPM_MAPPING}>
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

CloudIntegrationSetup.displayName = 'CloudSetup';

// eslint-disable-next-line import/no-default-export
export { CloudIntegrationSetup as default };
