/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiCallOut, EuiFieldText, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type NewPackagePolicyInput,
  type PackagePolicyReplaceDefineStepExtensionComponentProps,
} from '@kbn/fleet-plugin/public/types';
import { i18n } from '@kbn/i18n';
// // import { useIsSubscriptionStatusValid } from '../../common/hooks/use_is_subscription_status_valid';
// // import { SubscriptionNotAllowed } from '../subscription_not_allowed';
import { SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING } from '@kbn/management-settings-ids';
import semverGte from 'semver/functions/gte';
import {
  getAssetInputHiddenVars,
  getAssetPolicy,
  hasErrors,
  getDefaultCloudCredentialsType,
  getCloudConnectorRemoteRoleTemplate,
} from './utils';
import { SetupTechnologySelector } from './setup_technology_selector/setup_technology_selector';
import { useSetupTechnology } from './setup_technology_selector/use_setup_technology';
import { PolicyTemplateInputSelector, PolicyTemplateVarsForm } from './policy_template_selectors';
import type { AssetInput, NewPackagePolicyAssetInput } from './types';
import { AwsAccountTypeSelect } from './aws_credentials_form/aws_account_type_select';
import { CLOUDBEAT_AWS } from './aws_credentials_form/constants';
import { GcpAccountTypeSelect } from './gcp_credentials_form/gcp_account_type_select';
import { AzureAccountTypeSelect } from './azure_credentials_form/azure_account_type_select';
import { useEnsureDefaultNamespace } from './hooks';
import { useKibana } from '../../hooks/use_kibana';

const EditScreenStepTitle = () => (
  <>
    <EuiTitle size="s">
      <h4>
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.fleetIntegration.integrationSettingsTitle"
          defaultMessage="Integration Settings"
        />
      </h4>
    </EuiTitle>
    <EuiSpacer />
  </>
);

interface IntegrationInfoFieldsProps {
  fields: Array<{ id: string; value: string; label: React.ReactNode; error: string[] | null }>;
  onChange(field: string, value: string): void;
}

const IntegrationSettings = ({ onChange, fields }: IntegrationInfoFieldsProps) => (
  <div>
    {fields.map(({ value, id, label, error }) => (
      <EuiFormRow key={id} id={id} fullWidth label={label} isInvalid={!!error} error={error}>
        <EuiFieldText
          isInvalid={!!error}
          fullWidth
          value={value}
          onChange={(event) => onChange(id, event.target.value)}
        />
      </EuiFormRow>
    ))}
  </div>
);

const getSelectedOption = (
  options: NewPackagePolicyInput[]
  // policyTemplate: string = ASSET_POLICY_TEMPLATE
) => {
  // Looks for the enabled deployment (aka input). By default, all inputs are disabled.
  // Initial state when all inputs are disabled is to choose the first available of the relevant policyTemplate
  const selectedOption = options.find((i) => i.enabled) || options[0];

  return selectedOption as NewPackagePolicyAssetInput;
};

export const CloudAssetInventoryPolicyTemplateForm =
  memo<PackagePolicyReplaceDefineStepExtensionComponentProps>(
    ({
      newPolicy,
      onChange,
      validationResults,
      isEditPage,
      packageInfo,
      handleSetupTechnologyChange,
      isAgentlessEnabled,
      defaultSetupTechnology,
    }) => {
      const CLOUD_CONNECTOR_VERSION_ENABLED_ESS = '0.18.0';
      const { cloud, uiSettings } = useKibana().services;
      const input = getSelectedOption(newPolicy.inputs);
      const { isAgentlessAvailable, setupTechnology, updateSetupTechnology } = useSetupTechnology({
        input,
        isAgentlessEnabled,
        handleSetupTechnologyChange,
        isEditPage,
        defaultSetupTechnology,
      });

      const shouldRenderAgentlessSelector =
        (!isEditPage && isAgentlessAvailable) || (isEditPage && isAgentlessEnabled);

      const updatePolicy = useCallback(
        (updatedPolicy: NewPackagePolicy) => {
          onChange({ isValid: true, updatedPolicy });
        },
        [onChange]
      );

      const cloudConnectorsEnabled =
        uiSettings.get(SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING) || false;

      const cloudConnectorRemoteRoleTemplate = getCloudConnectorRemoteRoleTemplate({
        input,
        cloud,
        packageInfo,
      });

      const showCloudConnectors =
        cloudConnectorsEnabled &&
        !!cloudConnectorRemoteRoleTemplate &&
        semverGte(packageInfo.version, CLOUD_CONNECTOR_VERSION_ENABLED_ESS);

      // /**
      //  * - Updates policy inputs by user selection
      //  * - Updates hidden policy vars
      //  */
      const setEnabledPolicyInput = useCallback(
        (inputType: AssetInput) => {
          const inputVars = getAssetInputHiddenVars(
            inputType,
            packageInfo,
            setupTechnology,
            showCloudConnectors
          );
          const policy = getAssetPolicy(newPolicy, inputType, inputVars);
          updatePolicy(policy);
        },
        [packageInfo, setupTechnology, showCloudConnectors, newPolicy, updatePolicy]
      );

      // // search for non null fields of the validation?.vars object
      const validationResultsNonNullFields = Object.keys(validationResults?.vars || {}).filter(
        (key) => (validationResults?.vars || {})[key] !== null
      );
      const hasInvalidRequiredVars = !!hasErrors(validationResults);

      const [isLoading, setIsLoading] = useState(validationResultsNonNullFields.length > 0);

      useEffect(() => {
        // using validation?.vars to know if the newPolicy state was reset due to race condition
        if (validationResultsNonNullFields.length > 0) {
          // Forcing rerender to recover from the validation errors state
          setIsLoading(true);
        }
      }, [validationResultsNonNullFields]);

      useEffect(() => {
        if (isEditPage) return;
        if (isLoading) return;
        // Pick default input type for policy template.
        // Only 1 enabled input is supported when all inputs are initially enabled.
        // Required for mount only to ensure a single input type is selected
        // This will remove errors in validationResults.vars
        setEnabledPolicyInput(input.type);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [isLoading, input.policy_template, isEditPage]);

      useEnsureDefaultNamespace({ newPolicy, input, updatePolicy });

      const integrationFields = [
        {
          id: 'name',
          value: newPolicy.name,
          error: validationResults?.name || null,
          label: (
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.integrationNameLabel"
              defaultMessage="Name"
            />
          ),
        },
        {
          id: 'description',
          value: newPolicy.description || '',
          error: validationResults?.description || null,
          label: (
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.integrationDescriptionLabel"
              defaultMessage="Description"
            />
          ),
        },
      ];

      // if (!getIsSubscriptionValid.isLoading && !isSubscriptionValid) {
      //   return <SubscriptionNotAllowed />;
      // }

      return (
        <>
          {isEditPage && <EditScreenStepTitle />}
          {/* Defines the enabled policy template */}
          {isEditPage && (
            <>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.assetInventory.fleetIntegration.editWarning.calloutTitle',
                  {
                    defaultMessage: 'Modifying Integration Details',
                  }
                )}
                color="warning"
                iconType="warning"
              >
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.fleetIntegration.editWarning.calloutDescription"
                    defaultMessage="In order to change the cloud service provider (CSP) you want to monitor, add more accounts, or change where Cloud Asset Discovery is deployed (Organization vs Single Account), please add a new Cloud Asset Discovery integration."
                  />
                </p>
              </EuiCallOut>
              <EuiSpacer size="l" />
            </>
          )}
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.fleetIntegration.configureAssetIntegrationDescription"
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
          {input.type === CLOUDBEAT_AWS && (
            <AwsAccountTypeSelect
              input={input}
              newPolicy={newPolicy}
              updatePolicy={updatePolicy}
              disabled={isEditPage}
            />
          )}
          {input.type === 'cloudbeat/asset_inventory_gcp' && (
            <GcpAccountTypeSelect
              input={input}
              newPolicy={newPolicy}
              updatePolicy={updatePolicy}
              disabled={isEditPage}
            />
          )}
          {input.type === 'cloudbeat/asset_inventory_azure' && (
            <AzureAccountTypeSelect
              input={input}
              newPolicy={newPolicy}
              updatePolicy={updatePolicy}
              disabled={isEditPage}
              setupTechnology={setupTechnology}
            />
          )}
          <IntegrationSettings
            fields={integrationFields}
            onChange={(field, value) => updatePolicy({ ...newPolicy, [field]: value })}
          />
          {shouldRenderAgentlessSelector && (
            <SetupTechnologySelector
              disabled={isEditPage}
              setupTechnology={setupTechnology}
              onSetupTechnologyChange={(value) => {
                updateSetupTechnology(value);
                updatePolicy(
                  getAssetPolicy(
                    newPolicy,
                    input.type,
                    getDefaultCloudCredentialsType(
                      value === SetupTechnology.AGENTLESS,
                      input.type as Extract<
                        AssetInput,
                        | 'cloudbeat/asset_inventory_aws'
                        | 'cloudbeat/asset_inventory_azure'
                        | 'cloudbeat/asset_inventory_gcp'
                      >
                    )
                  )
                );
              }}
            />
          )}
          <PolicyTemplateVarsForm
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            disabled={isEditPage}
            setupTechnology={setupTechnology}
            isEditPage={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            showCloudConnectors={showCloudConnectors}
          />
          <EuiSpacer />
        </>
      );
    }
  );

CloudAssetInventoryPolicyTemplateForm.displayName = 'CloudAssetInventoryPolicyTemplateForm';

// eslint-disable-next-line import/no-default-export
export { CloudAssetInventoryPolicyTemplateForm as default };
