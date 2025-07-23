/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import semverGte from 'semver/functions/gte';
import { EuiAccordion, EuiCallOut, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import {
  NamespaceComboBox,
  SetupTechnology,
  SetupTechnologySelector,
} from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/public/types';
import type { CloudSetup as CloudSetupType } from '@kbn/cloud-plugin/public';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import { i18n } from '@kbn/i18n';
// import { assert } from '../../../common/utils/helpers';
import { IUiSettingsClient } from '@kbn/core/public';
import { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import type { CloudSecurityPolicyTemplate, PostureInput } from './types';
import {
  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING,
  SUPPORTED_POLICY_TEMPLATES,
} from './constants';
import {
  getMaxPackageName,
  getPostureInputHiddenVars,
  getPosturePolicy,
  hasErrors,
  getCloudConnectorRemoteRoleTemplate,
  getDefaultCloudCredentialsType,
  isPostureInput,
} from './utils';
import { PolicyTemplateInputSelector } from './policy_template_selectors';
import { usePackagePolicyList } from './hooks/use_package_policy_list';
import { useSetupTechnology } from './hooks/use_setup_technology';
import { AwsAccountTypeSelect } from './aws_credentials_form/aws_account_type_selector';
import { GcpAccountTypeSelect } from './gcp_credentials_form/gcp_account_type_selector';
import { AzureAccountTypeSelect } from './azure_credentials_form/azure_account_type_selector';
import { IntegrationSettings } from './integration_settings';
import { AwsCredentialsForm } from './aws_credentials_form/aws_credentials_form';
import { AwsCredentialsFormAgentless } from './aws_credentials_form/aws_credentials_form_agentless';
import { GcpCredentialsFormAgentless } from './gcp_credentials_form/gcp_credentials_form_agentless';
import { GcpCredentialsForm } from './gcp_credentials_form/gcp_credential_form';
import { CLOUDBEAT_AWS } from './aws_credentials_form/aws_constants';
import { AzureCredentialsFormAgentless } from './azure_credentials_form/azure_credentials_form_agentless';
import { AzureCredentialsForm } from './azure_credentials_form/azure_credentials_form';

const DEFAULT_INPUT_TYPE = {
  cspm: CLOUDBEAT_AWS,
} as const;

const EditScreenStepTitle = () => (
  <>
    <EuiTitle size="s">
      <h4>
        <FormattedMessage
          id="xpack.csp.fleetIntegration.integrationSettingsTitle"
          defaultMessage="Integration Settings"
        />
      </h4>
    </EuiTitle>
    <EuiSpacer />
  </>
);

const usePolicyTemplateInitialName = ({
  isEditPage,
  integration,
  newPolicy,
  packagePolicyList,
  updatePolicy,
  setCanFetchIntegration,
}: {
  isEditPage: boolean;
  integration: string | undefined;
  newPolicy: NewPackagePolicy;
  packagePolicyList: PackagePolicy[] | undefined;
  updatePolicy: (policy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
  setCanFetchIntegration: (canFetch: boolean) => void;
}) => {
  useEffect(() => {
    if (!integration) return;
    if (isEditPage) return;

    const packagePolicyListByIntegration = packagePolicyList?.filter(
      (policy) => policy?.vars?.posture?.value === integration
    );

    const currentIntegrationName = getMaxPackageName(integration, packagePolicyListByIntegration);

    /*
     * If 'packagePolicyListByIntegration' is undefined it means policies were still not feteched - Array.isArray(undefined) = false
     * if policie were fetched its an array - the check will return true
     */
    const isPoliciesLoaded = Array.isArray(packagePolicyListByIntegration);
    updatePolicy(
      {
        ...newPolicy,
        name: currentIntegrationName,
      },
      isPoliciesLoaded
    );
    setCanFetchIntegration(false);
    // since this useEffect should only run on initial mount updatePolicy and newPolicy shouldn't re-trigger it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration, isEditPage, packagePolicyList]);
};

const assert: (condition: unknown, msg?: string) => asserts condition = (
  condition: unknown,
  msg?: string
): asserts condition => {
  if (!condition) {
    throw new Error(msg);
  }
};

const getSelectedOption = (
  options: NewPackagePolicyInput[],
  policyTemplate: string = CSPM_POLICY_TEMPLATE
) => {
  // Looks for the enabled deployment (aka input). By default, all inputs are disabled.
  // Initial state when all inputs are disabled is to choose the first available of the relevant policyTemplate
  // Default selected policy template is CSPM
  const selectedOption =
    options.find((i) => i.enabled) ||
    options.find((i) => i.policy_template === policyTemplate) ||
    options[0];

  assert(selectedOption, 'Failed to determine selected option'); // We can't provide a default input without knowing the policy template
  assert(isPostureInput(selectedOption), `Unknown option: ${selectedOption.type}`);

  return selectedOption;
};

interface CloudSetupProps {
  cloud: CloudSetupType;
  uiSettings: IUiSettingsClient;
  namespaceSupportEnabled?: boolean;
  isEditPage: boolean;
  newPolicy: NewPackagePolicy;
  onChange: (opts: {
    isValid: boolean;
    updatedPolicy: NewPackagePolicy;
    isExtensionLoaded?: boolean;
  }) => void;
  validationResults?: PackagePolicyValidationResults;
  packageInfo: PackageInfo;
  handleSetupTechnologyChange?: (setupTechnology: SetupTechnology) => void;
  isAgentlessEnabled?: boolean;
  defaultSetupTechnology?: SetupTechnology;
  integrationToEnable?: CloudSecurityPolicyTemplate;
  setIntegrationToEnable?: (integration: CloudSecurityPolicyTemplate) => void;
}

export const CloudSetup = memo<CloudSetupProps>(
  // eslint-disable-next-line complexity
  ({
    newPolicy,
    onChange,
    validationResults,
    isEditPage,
    packageInfo,
    handleSetupTechnologyChange,
    isAgentlessEnabled,
    defaultSetupTechnology,
    integrationToEnable,
    setIntegrationToEnable,
    namespaceSupportEnabled = false,
    cloud,
    uiSettings,
  }) => {
    const integration =
      integrationToEnable &&
      SUPPORTED_POLICY_TEMPLATES.includes(integrationToEnable as CloudSecurityPolicyTemplate)
        ? integrationToEnable
        : undefined;

    const cloudConnectorsEnabled =
      uiSettings.get(SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING) || false;
    const CLOUD_CONNECTOR_VERSION_ENABLED_ESS = '2.0.0-preview01';

    const isServerless = !!cloud.serverless.projectType;
    const input = getSelectedOption(newPolicy.inputs, integration);
    const { isAgentlessAvailable, setupTechnology, updateSetupTechnology } = useSetupTechnology({
      input,
      isAgentlessEnabled,
      handleSetupTechnologyChange,
      isEditPage,
      defaultSetupTechnology,
    });

    const { euiTheme } = useEuiTheme();

    const shouldRenderAgentlessSelector =
      (!isEditPage && isAgentlessAvailable) || (isEditPage && isAgentlessEnabled);

    const updatePolicy = useCallback(
      (updatedPolicy: NewPackagePolicy, isExtensionLoaded?: boolean) => {
        onChange({ isValid: true, updatedPolicy, isExtensionLoaded });
      },
      [onChange]
    );

    const cloudConnectorRemoteRoleTemplate = getCloudConnectorRemoteRoleTemplate({
      input,
      cloud,
      packageInfo,
    });

    const showCloudConnectors =
      cloudConnectorsEnabled &&
      !!cloudConnectorRemoteRoleTemplate &&
      semverGte(packageInfo.version, CLOUD_CONNECTOR_VERSION_ENABLED_ESS);

    /**
     * - Updates policy inputs by user selection
     * - Updates hidden policy vars
     */
    const setEnabledPolicyInput = useCallback(
      (inputType: PostureInput) => {
        const inputVars = getPostureInputHiddenVars(
          inputType,
          packageInfo,
          setupTechnology,
          showCloudConnectors
        );
        const policy = getPosturePolicy(newPolicy, inputType, inputVars);
        updatePolicy(policy);
      },
      [packageInfo, newPolicy, setupTechnology, updatePolicy, showCloudConnectors]
    );

    const hasInvalidRequiredVars = !!hasErrors(validationResults);

    const [canFetchIntegration, setCanFetchIntegration] = useState(true);

    const { data: packagePolicyList, refetch } = usePackagePolicyList(packageInfo.name, {
      enabled: canFetchIntegration,
    });

    useEffect(() => {
      if (isEditPage) return;
      // Pick default input type for policy template.
      // Only 1 enabled input is supported when all inputs are initially enabled.
      // Required for mount only to ensure a single input type is selected
      // This will remove errors in validationResults.vars
      setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input.policy_template, isEditPage]);

    useEffect(() => {
      if (isEditPage) {
        return;
      }

      setEnabledPolicyInput(input.type);
      setIntegrationToEnable?.(input.policy_template);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setupTechnology]);

    // useCloudFormationTemplate({
    //   packageInfo,
    //   updatePolicy,
    //   newPolicy,
    // });

    usePolicyTemplateInitialName({
      packagePolicyList: packagePolicyList?.items,
      isEditPage,
      integration,
      newPolicy,
      updatePolicy,
      setCanFetchIntegration,
    });

    return (
      <>
        {isEditPage && <EditScreenStepTitle />}

        {isEditPage && (
          <>
            <EuiCallOut
              title={i18n.translate('xpack.csp.fleetIntegration.editWarning.calloutTitle', {
                defaultMessage: 'Modifying Integration Details',
              })}
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.csp.fleetIntegration.editWarning.calloutDescription"
                  defaultMessage="In order to change the cloud service provider (CSP) you want to monitor, add more accounts, or change where CSPM is deployed (Organization vs Single Account), please add a new CSPM integration."
                />
              </p>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}

        {/* Shows info on the active policy template */}
        <FormattedMessage
          id="xpack.csp.fleetIntegration.configureCspmIntegrationDescription"
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
                    id="xpack.csp.fleetIntegration.advancedOptionsLabel"
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
                labelId="xpack.csp.fleetIntegration.namespaceLabel"
                helpTextId="xpack.csp.fleetIntegration.awsAccountType.awsOrganizationDescription"
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
