/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiAccordion, EuiCallOut, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import {
  NamespaceComboBox,
  SetupTechnology,
  SetupTechnologySelector,
} from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { PackageInfo } from '@kbn/fleet-plugin/common';
import type { CloudSecurityPolicyTemplate, PostureInput } from './types';
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
//   isEditPage,
//   integration,
//   newPolicy,
//   packagePolicyList,
//   updatePolicy,
//   setCanFetchIntegration,
// }: {
//   isEditPage: boolean;
//   integration: string | undefined;
//   newPolicy: NewPackagePolicy;
//   packagePolicyList: PackagePolicy[] | undefined;
//   updatePolicy: (policy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
//   setCanFetchIntegration: (canFetch: boolean) => void;
// }) => {
//   useEffect(() => {
//     if (!integration) return;
//     if (isEditPage) return;

//     const packagePolicyListByIntegration = packagePolicyList?.filter(
//       (policy) => policy?.vars?.posture?.value === integration
//     );

//     const currentIntegrationName = getMaxPackageName(integration, packagePolicyListByIntegration);

//     /*
//      * If 'packagePolicyListByIntegration' is undefined it means policies were still not feteched - Array.isArray(undefined) = false
//      * if policie were fetched its an array - the check will return true
//      */
//     const isPoliciesLoaded = Array.isArray(packagePolicyListByIntegration);
//     updatePolicy(
//       {
//         ...newPolicy,
//         name: currentIntegrationName,
//       },
//       isPoliciesLoaded
//     );
//     setCanFetchIntegration(false);
//     // since this useEffect should only run on initial mount updatePolicy and newPolicy shouldn't re-trigger it
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [integration, isEditPage, packagePolicyList]);
// };

// const assert: (condition: unknown, msg?: string) => asserts condition = (
//   condition: unknown,
//   msg?: string
// ): asserts condition => {
//   if (!condition) {
//     throw new Error(msg);
//   }
// };

// const getSelectedOption = (
//   options: NewPackagePolicyInput[],
//   policyTemplate: string = CSPM_POLICY_TEMPLATE
// ) => {
//   // Looks for the enabled deployment (aka input). By default, all inputs are disabled.
//   // Initial state when all inputs are disabled is to choose the first available of the relevant policyTemplate
//   // Default selected policy template is CSPM
//   const selectedOption =
//     options.find((i) => i.enabled) ||
//     options.find((i) => i.policy_template === policyTemplate) ||
//     options[0];

//   assert(selectedOption, 'Failed to determine selected option'); // We can't provide a default input without knowing the policy template
//   assert(isPostureInput(selectedOption), `Unknown option: ${selectedOption.type}`);

//   return selectedOption;
// };

interface CloudSetupProps {
  defaultSetupTechnology?: SetupTechnology;
  handleSetupTechnologyChange?: (setupTechnology: SetupTechnology) => void;
  integrationToEnable?: CloudSecurityPolicyTemplate;
  isAgentlessEnabled?: boolean;
  isEditPage: boolean;
  isValid: boolean;
  namespaceSupportEnabled?: boolean;
  newPolicy: NewPackagePolicy;
  onChange: (opts: {
    isValid: boolean;
    updatedPolicy: NewPackagePolicy;
    isExtensionLoaded?: boolean;
  }) => void;
  packageInfo: PackageInfo;
  setIsValid: (valid: boolean) => void;
  validationResults?: PackagePolicyValidationResults;
}

export const CloudSetup = memo<CloudSetupProps>(
  ({
    defaultSetupTechnology,
    handleSetupTechnologyChange,
    integrationToEnable,
    isAgentlessEnabled,
    isEditPage,
    isValid,
    namespaceSupportEnabled = false,
    newPolicy,
    onChange,
    packageInfo,
    setIsValid,
    validationResults,
  }: CloudSetupProps) => {
    const {
      input,
      setEnabledPolicyInput,
      updatePolicy,
      setupTechnology,
      updateSetupTechnology,
      shouldRenderAgentlessSelector,
      isServerless,
      showCloudConnectors,
      hasInvalidRequiredVars,
      cloud,
    } = useLoadCloudSetup({
      newPolicy,
      onChange,
      validationResults,
      isEditPage,
      packageInfo,
      handleSetupTechnologyChange,
      isAgentlessEnabled,
      defaultSetupTechnology,
      integrationToEnable,
    });

    const { euiTheme } = useEuiTheme();

    return (
      <>
        {isEditPage && <EditScreenStepTitle />}

        {isEditPage && (
          <>
            <EuiCallOut
              title={i18n.translate(
                'securitySolutionPackages.fleetIntegration.editWarning.calloutTitle',
                {
                  defaultMessage: 'Modifying Integration Details',
                }
              )}
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="securitySolutionPackages.fleetIntegration.editWarning.calloutDescription"
                  defaultMessage="In order to change the cloud service provider (CSP) you want to monitor, add more accounts, or change where CSPM is deployed (Organization vs Single Account), please add a new CSPM integration."
                />
              </p>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

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
          onChange={(field, value) => updatePolicy({ ...newPolicy, [field]: value })}
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
                  updatePolicy({ ...newPolicy, namespace });
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
                updatePolicy(
                  getPosturePolicy(
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
                  )
                );
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
            setIsValid={setIsValid}
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
            setIsValid={setIsValid}
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
