/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import semverGte from 'semver/functions/gte';
import {
  EuiAccordion,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NamespaceComboBox, SetupTechnology } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NewPackagePolicyInput,
  PackagePolicyReplaceDefineStepExtensionComponentProps,
} from '@kbn/fleet-plugin/public/types';
import type { CloudSetup as CloudSetupType } from '@kbn/cloud-plugin/public';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import { i18n } from '@kbn/i18n';
// import { assert } from '../../../common/utils/helpers';
import type { CloudSecurityPolicyTemplate, PostureInput } from './types';
import { CLOUDBEAT_AWS, SUPPORTED_POLICY_TEMPLATES } from './constants';
import {
  getMaxPackageName,
  getPostureInputHiddenVars,
  getPosturePolicy,
  // isPostureInput,
  hasErrors,
  POLICY_TEMPLATE_FORM_DTS,
  getCloudConnectorRemoteRoleTemplate,
  getDefaultCloudCredentialsType,
} from './utils';
import { PolicyTemplateInputSelector, PolicyTemplateVarsForm } from './policy_template_selectors';
import { usePackagePolicyList } from './hooks/use_package_policy_list';
// import {
//   GCP_CREDENTIALS_TYPE,
//   gcpField,
//   getInputVarsFields,
// } from './gcp_credentials_form/gcp_credential_form';
import { SetupTechnologySelector } from './setup_technology_selector/setup_technology_selector';
import { useSetupTechnology } from './setup_technology_selector/use_setup_technology';
import { AwsAccountTypeSelect } from './aws_credentials_form/aws_account_type_select';
import { GcpAccountTypeSelect } from './gcp_credentials_form/gcp_account_type_select';
import { AzureAccountTypeSelect } from './azure_credentials_form/azure_account_type_select';
import { IntegrationSettings } from './integration_settings';
// import { useKibana } from '../../common/hooks/use_kibana';

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

  // assert(selectedOption, 'Failed to determine selected option'); // We can't provide a default input without knowing the policy template
  // assert(isPostureInput(selectedOption), 'Unknown option: ' + selectedOption.type);

  return selectedOption;
};

/**
 * Update CloudFormation template and stack name in the Agent Policy
 * based on the selected policy template
 */
// const useCloudFormationTemplate = ({
//   packageInfo,
//   newPolicy,
//   updatePolicy,
// }: {
//   packageInfo: PackageInfo;
//   newPolicy: NewPackagePolicy;
//   updatePolicy: (policy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
// }) => {
//   useEffect(() => {
//     const templateUrl = getVulnMgmtCloudFormationDefaultValue(packageInfo);

//     // If the template is not available, do not update the policy
//     if (templateUrl === '') return;

//     const checkCurrentTemplate = newPolicy?.inputs?.find(
//       (i: any) => i.type === CLOUDBEAT_VULN_MGMT_AWS
//     )?.config?.cloud_formation_template_url?.value;

//     // If the template is already set, do not update the policy
//     if (checkCurrentTemplate === templateUrl) return;

//     updatePolicy?.({
//       ...newPolicy,
//       inputs: newPolicy.inputs.map((input) => {
//         if (input.type === CLOUDBEAT_VULN_MGMT_AWS) {
//           return {
//             ...input,
//             config: { cloud_formation_template_url: { value: templateUrl } },
//           };
//         }
//         return input;
//       }),
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [newPolicy?.vars?.cloud_formation_template_url, newPolicy, packageInfo]);
// };

type CloudSetupProps = PackagePolicyReplaceDefineStepExtensionComponentProps & {
  cloud: CloudSetupType;
  cloudConnectorsEnabled: boolean;
  namespaceSupportEnabled?: boolean;
};

export const CloudSetup = memo<CloudSetupProps>(
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
    cloud,
    cloudConnectorsEnabled,
    namespaceSupportEnabled = false,
  }) => {
    const integration =
      integrationToEnable &&
      SUPPORTED_POLICY_TEMPLATES.includes(integrationToEnable as CloudSecurityPolicyTemplate)
        ? integrationToEnable
        : undefined;

    // Handling validation state
    const [isValid, setIsValid] = useState(true);
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
        onChange({ isValid, updatedPolicy, isExtensionLoaded });
      },
      [onChange, isValid]
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

    // search for non null fields of the validation?.vars object
    const validationResultsNonNullFields = Object.keys(validationResults?.vars || {}).filter(
      (key) => (validationResults?.vars || {})[key] !== null
    );
    const hasInvalidRequiredVars = !!hasErrors(validationResults);

    const [isLoading, setIsLoading] = useState(validationResultsNonNullFields.length > 0);
    const [canFetchIntegration, setCanFetchIntegration] = useState(true);

    // delaying component rendering due to a race condition issue from Fleet
    // TODO: remove this workaround when the following issue is resolved:
    // https://github.com/elastic/kibana/issues/153246
    useEffect(() => {
      // using validation?.vars to know if the newPolicy state was reset due to race condition
      if (validationResultsNonNullFields.length > 0) {
        // Forcing rerender to recover from the validation errors state
        setIsLoading(true);
      }
      setTimeout(() => setIsLoading(false), 200);
    }, [validationResultsNonNullFields]);

    const { data: packagePolicyList, refetch } = usePackagePolicyList(packageInfo.name, {
      enabled: canFetchIntegration,
    });

    useEffect(() => {
      if (isEditPage) return;
      if (isLoading) return;
      // Pick default input type for policy template.
      // Only 1 enabled input is supported when all inputs are initially enabled.
      // Required for mount only to ensure a single input type is selected
      // This will remove errors in validationResults.vars
      setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, input.policy_template, isEditPage]);

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

    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="spaceAround" data-test-subj={POLICY_TEMPLATE_FORM_DTS.LOADER}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

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
          <SetupTechnologySelector
            showLimitationsMessage={!isServerless}
            disabled={isEditPage}
            isAgentless={!!newPolicy?.supports_agentless}
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
        )}

        {/* Defines the vars of the enabled input of the active policy template */}
        <PolicyTemplateVarsForm
          input={input}
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          onChange={onChange}
          setIsValid={setIsValid}
          disabled={isEditPage}
          setupTechnology={setupTechnology}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          showCloudConnectors={showCloudConnectors}
          cloud={cloud}
        />
        <EuiSpacer />
      </>
    );
  }
);

CloudSetup.displayName = 'CloudSetup';

// eslint-disable-next-line import/no-default-export
export { CloudSetup as default };
