/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useRef } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import semverGte from 'semver/functions/gte';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
} from '@kbn/cloud-security-posture-common/constants';
import { useParams } from 'react-router-dom';
import { CloudSetup, type CloudSetupConfig } from '@kbn/cloud-security-posture';
import { i18n } from '@kbn/i18n';
import { SubscriptionNotAllowed } from '../subscription_not_allowed';
import type { CloudSecurityPolicyTemplate } from '../../../common/types_old';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_GCP,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../common/constants';
import { POLICY_TEMPLATE_FORM_DTS } from './utils';
import { PolicyTemplateSelector } from './policy_template_selectors';
import { CnvmKspmSetup } from './cnvm_kspm/cnvm_kspm_setup';
import { useLoadFleetExtension } from './use_load_fleet_extension';

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

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
  vuln_mgmt: CLOUDBEAT_VULN_MGMT_AWS,
} as const;

export const CspPolicyTemplateForm = memo<PackagePolicyReplaceDefineStepExtensionComponentProps>(
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
  }) => {
    const CLOUD_CONNECTOR_PACKAGE_VERSION_ENABLED_AWS = '2.0.0-preview01';
    const CLOUD_CONNECTOR_PACKAGE_VERSION_ENABLED_AZURE = '3.1.0-preview02';
    const CLOUD_CREDENTIALS_PACKAGE_VERSION = '1.11.0-preview13';
    const GCP_MINIMUM_ORGANIZATION_VERSION = '1.6.0';
    const GCP_MINIMUM_PACKAGE_VERSION = '1.5.2';
    const AWS_MINIMUM_ORGANIZATION_VERSION = '1.5.0-preview20';
    const AZURE_MINIMUM_PACKAGE_VERSION = '1.6.0';
    const AZURE_MINIMUM_ORGANIZATION_VERSION = '1.7.0';
    const AZURE_MANUAL_FIELDS_PACKAGE_VERSION = '1.7.0';

    const showCloudTemplates = semverGte(packageInfo.version, CLOUD_CREDENTIALS_PACKAGE_VERSION);
    const enableGcpOrganization = semverGte(packageInfo.version, GCP_MINIMUM_ORGANIZATION_VERSION);
    const enableAwsOrganization = semverGte(packageInfo.version, AWS_MINIMUM_ORGANIZATION_VERSION);
    const enableAzureOrganization = semverGte(
      packageInfo.version,
      AZURE_MINIMUM_ORGANIZATION_VERSION
    );
    const enableAzure = semverGte(packageInfo.version, AZURE_MINIMUM_PACKAGE_VERSION);
    const enableGcp = semverGte(packageInfo.version, GCP_MINIMUM_PACKAGE_VERSION);
    const azureManualFieldsEnabled = semverGte(
      packageInfo.version,
      AZURE_MANUAL_FIELDS_PACKAGE_VERSION
    );

    const CLOUD_SETUP_MAPPING: CloudSetupConfig = {
      policyTemplate: CSPM_POLICY_TEMPLATE,
      defaultProvider: 'aws',
      namespaceSupportEnabled: true,
      name: i18n.translate('xpack.csp.cspmIntegration.integration.nameTitle', {
        defaultMessage: 'Cloud Security Posture Management',
      }),
      shortName: i18n.translate('xpack.csp.cspmIntegration.integration.shortNameTitle', {
        defaultMessage: 'CSPM',
      }),
      overviewPath: `https://ela.st/cspm-overview`,
      getStartedPath: `https://ela.st/cspm-get-started`,
      showCloudTemplates,
      providers: {
        aws: {
          type: CLOUDBEAT_AWS,
          enableOrganization: enableAwsOrganization,
          getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started.html`,
          cloudConnectorEnabledVersion: CLOUD_CONNECTOR_PACKAGE_VERSION_ENABLED_AWS,
        },
        gcp: {
          type: CLOUDBEAT_GCP,
          enableOrganization: enableGcpOrganization,
          getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-gcp.html`,
          enabled: enableGcp,
        },
        azure: {
          type: CLOUDBEAT_AZURE,
          enabled: enableAzure,
          enableOrganization: enableAzureOrganization,
          getStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-azure.html`,
          manualFieldsEnabled: azureManualFieldsEnabled,
          cloudConnectorEnabledVersion: CLOUD_CONNECTOR_PACKAGE_VERSION_ENABLED_AZURE,
        },
      },
    };

    const integrationParam = useParams<{ integration: CloudSecurityPolicyTemplate }>().integration;

    const isParentSecurityPosture = !integrationParam;
    const isDefaultIntegrationSetRef = useRef(false);

    if (!isDefaultIntegrationSetRef.current && !integrationToEnable && setIntegrationToEnable) {
      isDefaultIntegrationSetRef.current = true;
      setIntegrationToEnable(CSPM_POLICY_TEMPLATE);
    }

    const {
      cloud,
      input,
      isLoading,
      isSubscriptionValid,
      isValid,
      setEnabledPolicyInput,
      uiSettings,
      updatePolicy,
    } = useLoadFleetExtension({
      newPolicy,
      onChange,
      isEditPage,
      packageInfo,
      integrationToEnable: integrationToEnable as 'cspm' | 'kspm' | 'vuln_mgmt' | undefined,
      validationResults,
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

    if (!isLoading && !isSubscriptionValid) {
      return <SubscriptionNotAllowed />;
    }
    // If the input type is one of the cloud providers, we need to render the account type selector
    return (
      <>
        {isEditPage && <EditScreenStepTitle />}
        {isParentSecurityPosture && (
          <>
            <PolicyTemplateSelector
              selectedTemplate={input.policy_template}
              policy={newPolicy}
              setPolicyTemplate={(template) => {
                setEnabledPolicyInput(DEFAULT_INPUT_TYPE[template]);
                setIntegrationToEnable?.(template);
              }}
              disabled={isEditPage}
            />
            <EuiSpacer size="l" />
          </>
        )}
        {isEditPage && (
          <>
            <EuiCallOut
              announceOnMount={false}
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
        {input.policy_template === CSPM_POLICY_TEMPLATE && (
          <CloudSetup
            configuration={CLOUD_SETUP_MAPPING}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            isEditPage={isEditPage}
            validationResults={validationResults}
            defaultSetupTechnology={defaultSetupTechnology}
            isAgentlessEnabled={isAgentlessEnabled}
            handleSetupTechnologyChange={handleSetupTechnologyChange}
            isValid={isValid}
            cloud={cloud}
            uiSettings={uiSettings}
          />
        )}

        {(input.policy_template === KSPM_POLICY_TEMPLATE ||
          input.policy_template === VULN_MGMT_POLICY_TEMPLATE) && (
          <CnvmKspmSetup
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            setEnabledPolicyInput={setEnabledPolicyInput}
            updatePolicy={updatePolicy}
            validationResults={validationResults}
            isEditPage={isEditPage}
            input={input}
          />
        )}
        <EuiSpacer />
      </>
    );
  }
);

CspPolicyTemplateForm.displayName = 'CspPolicyTemplateForm';

// eslint-disable-next-line import/no-default-export
export { CspPolicyTemplateForm as default };
