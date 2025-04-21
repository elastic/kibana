/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import semverCompare from 'semver/functions/compare';
// import semverValid from 'semver/functions/valid';
// import semverCoerce from 'semver/functions/coerce';
// import semverLt from 'semver/functions/lt';
import {
  EuiCallOut,
  EuiFieldText,
  // EuiFlexGroup,
  // EuiFlexItem,
  EuiFormRow,
  // EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  // EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type NewPackagePolicyInput,
  type PackagePolicyReplaceDefineStepExtensionComponentProps,
} from '@kbn/fleet-plugin/public/types';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
// import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
// import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
// // import { useIsSubscriptionStatusValid } from '../../common/hooks/use_is_subscription_status_valid';
// // import { SubscriptionNotAllowed } from '../subscription_not_allowed';
// import type { CspRadioGroupProps } from './csp_boxed_radio_group';
// import { RadioGroup } from './csp_boxed_radio_group';
// // import { assert } from '../../../common/utils/helpers';
// import type { CloudSecurityPolicyTemplate, PostureInput } from '../../../common/types_old';
// import { CLOUDBEAT_AWS, SUPPORTED_POLICY_TEMPLATES } from './constants';
import {
  //   getMaxPackageName,
  getPostureInputHiddenVars,
  getAssetPolicy,
  //   isBelowMinVersion,
  type NewPackagePolicyAssetInput,
  //   POSTURE_NAMESPACE,
  //   POLICY_TEMPLATE_FORM_DTS,
  hasErrors,
} from './utils';
import { usePackagePolicyList } from './hooks';
import {
  GCP_CREDENTIALS_TYPE,
  GcpCredentialsForm,
  gcpField,
  getInputVarsFields,
} from './gcp_credentials_form/gcp_credential_form';
import { SetupTechnologySelector } from './setup_technology_selector/setup_technology_selector';
import { useSetupTechnology } from './setup_technology_selector/use_setup_technology';
// import {
//   AZURE_CREDENTIALS_TYPE,
//   AzureCredentialsForm,
// } from './azure_credentials_form/azure_credentials_form';
// import {
//   AWS_CREDENTIALS_TYPE,
//   AwsCredentialsForm,
// } from './aws_credentials_form/aws_credentials_form';
// // import { useKibana } from '../../common/hooks/use_kibana';
// import { AwsCredentialsFormAgentless } from './aws_credentials_form/aws_credentials_form_agentless';
// import { GcpCredentialsFormAgentless } from './gcp_credentials_form/gcp_credentials_form_agentless';
// import { AzureCredentialsFormAgentless } from './azure_credentials_form/azure_credentials_form_agentless';
import { PolicyTemplateInputSelector, PolicyTemplateVarsForm } from './policy_template_selectors';
import {
  AWS_ORGANIZATION_ACCOUNT,
  AWS_SINGLE_ACCOUNT,
  type AZURE_SINGLE_ACCOUNT,
  type AZURE_ORGANIZATION_ACCOUNT,
  CLOUDBEAT_AWS,
  GCP_SINGLE_ACCOUNT,
  GCP_ORGANIZATION_ACCOUNT,
} from './constants';
import { type AssetRadioGroupProps, RadioGroup } from './csp_boxed_radio_group';
import { useKibana } from '../../../common/lib/kibana';
import { AWS_CREDENTIALS_TYPE } from './aws_credentials_form/aws_credentials_form';
import { AZURE_CREDENTIALS_TYPE } from './azure_credentials_form/azure_credentials_form';
import type { AssetInput } from './types';

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

interface IntegrationInfoFieldsProps {
  fields: Array<{ id: string; value: string; label: React.ReactNode; error: string[] | null }>;
  onChange(field: string, value: string): void;
}

type AwsAccountType = typeof AWS_SINGLE_ACCOUNT | typeof AWS_ORGANIZATION_ACCOUNT;
type AzureAccountType = typeof AZURE_SINGLE_ACCOUNT | typeof AZURE_ORGANIZATION_ACCOUNT;
type GcpAccountType = typeof GCP_SINGLE_ACCOUNT | typeof GCP_ORGANIZATION_ACCOUNT;

const getAwsAccountTypeOptions = (): AssetRadioGroupProps['options'] => {
  const isAwsOrgDisabled = false;
  return [
    {
      id: AWS_ORGANIZATION_ACCOUNT,
      label: i18n.translate('xpack.csp.fleetIntegration.awsAccountType.awsOrganizationLabel', {
        defaultMessage: 'AWS Organization',
      }),
      disabled: isAwsOrgDisabled,
      tooltip: isAwsOrgDisabled
        ? i18n.translate(
            'xpack.csp.fleetIntegration.awsAccountType.awsOrganizationDisabledTooltip',
            {
              defaultMessage: 'Supported from integration version 1.5.0 and above',
            }
          )
        : undefined,
      testId: 'awsOrganizationTestId',
    },
    {
      id: AWS_SINGLE_ACCOUNT,
      label: i18n.translate('xpack.csp.fleetIntegration.awsAccountType.singleAccountLabel', {
        defaultMessage: 'Single Account',
      }),
      testId: 'awsSingleTestId',
    },
  ];
};

const getGcpAccountTypeOptions = (isGcpOrgDisabled: boolean): AssetRadioGroupProps['options'] => [
  {
    id: GCP_ORGANIZATION_ACCOUNT,
    label: i18n.translate('xpack.csp.fleetIntegration.gcpAccountType.gcpOrganizationLabel', {
      defaultMessage: 'GCP Organization',
    }),
    disabled: isGcpOrgDisabled,
    tooltip: isGcpOrgDisabled
      ? i18n.translate('xpack.csp.fleetIntegration.gcpAccountType.gcpOrganizationDisabledTooltip', {
          defaultMessage: 'Supported from integration version 1.6.0 and above',
        })
      : undefined,
    testId: 'gcpOrganizationAccountTestId',
  },
  {
    id: GCP_SINGLE_ACCOUNT,
    label: i18n.translate('xpack.csp.fleetIntegration.gcpAccountType.gcpSingleAccountLabel', {
      defaultMessage: 'Single Project',
    }),
    testId: 'gcpSingleAccountTestId',
  },
];

// const getAzureAccountTypeOptions = (
//   isAzureOrganizationDisabled: boolean
// ): CspRadioGroupProps['options'] => [
//   {
//     id: AZURE_ORGANIZATION_ACCOUNT,
//     label: i18n.translate('xpack.csp.fleetIntegration.azureAccountType.azureOrganizationLabel', {
//       defaultMessage: 'Azure Organization',
//     }),
//     testId: 'azureOrganizationAccountTestId',
//     disabled: isAzureOrganizationDisabled,
//     tooltip: isAzureOrganizationDisabled
//       ? i18n.translate(
//           'xpack.csp.fleetIntegration.azureAccountType.azureOrganizationDisabledTooltip',
//           {
//             defaultMessage: 'Coming Soon',
//           }
//         )
//       : undefined,
//   },
//   {
//     id: AZURE_SINGLE_ACCOUNT,
//     label: i18n.translate('xpack.csp.fleetIntegration.azureAccountType.singleAccountLabel', {
//       defaultMessage: 'Single Subscription',
//     }),
//     testId: 'azureSingleAccountTestId',
//   },
// ];

const getAwsAccountType = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>
): AwsAccountType | undefined => input.streams[0].vars?.['aws.account_type']?.value;

const AwsAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
}: {
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: (updatedPolicy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
  packageInfo: PackageInfo;
  disabled: boolean;
}) => {
  const awsAccountTypeOptions = getAwsAccountTypeOptions();

  useEffect(() => {
    if (!getAwsAccountType(input)) {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'aws.account_type': {
            value: AWS_ORGANIZATION_ACCOUNT,
            type: 'text',
          },
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, updatePolicy]);

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.fleetIntegration.awsAccountTypeDescriptionLabel"
          defaultMessage="Select between single account or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        idSelected={getAwsAccountType(input) || ''}
        options={awsAccountTypeOptions}
        onChange={(accountType) => {
          updatePolicy(
            getAssetPolicy(newPolicy, input.type, {
              'aws.account_type': {
                value: accountType,
                type: 'text',
              },
            })
          );
        }}
        size="m"
      />
      {getAwsAccountType(input) === AWS_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.awsAccountType.awsOrganizationDescription"
              defaultMessage="Connect Elastic to every AWS Account (current and future) in your environment by providing Elastic with read-only (configuration) access to your AWS organization."
            />
          </EuiText>
        </>
      )}
      {getAwsAccountType(input) === AWS_SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.awsAccountType.singleAccountDescription"
              defaultMessage="Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy CSPM at the organization-level, which automatically connects all accounts (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};

const getGcpAccountType = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_gcp' }>
): GcpAccountType | undefined => input.streams[0].vars?.['gcp.account_type']?.value;

const GcpAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
}: {
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_gcp' }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: (updatedPolicy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
  packageInfo: PackageInfo;
  disabled: boolean;
}) => {
  // This will disable the gcp org option for any version below 1.6.0 which introduced support for account_type. https://github.com/elastic/integrations/pull/6682
  const isGcpOrgDisabled = true;

  const gcpAccountTypeOptions = useMemo(
    () => getGcpAccountTypeOptions(isGcpOrgDisabled),
    [isGcpOrgDisabled]
  );
  /* Create a subset of properties from GcpField to use for hiding value of Organization ID when switching account type from Organization to Single */
  const subsetOfGcpField = (({ ['gcp.organization_id']: a }) => ({ 'gcp.organization_id': a }))(
    gcpField.fields
  );

  const fieldsToHide = getInputVarsFields(input, subsetOfGcpField);
  const fieldsSnapshot = useRef({});
  const lastSetupAccessType = useRef<string | undefined>(undefined);
  const onSetupFormatChange = (newSetupFormat: string) => {
    if (newSetupFormat === 'single-account') {
      // We need to store the current manual fields to restore them later
      fieldsSnapshot.current = Object.fromEntries(
        fieldsToHide.map((field) => [field.id, { value: field.value }])
      );
      // We need to store the last manual credentials type to restore it later
      lastSetupAccessType.current = input.streams[0].vars?.['gcp.account_type'].value;

      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'gcp.account_type': {
            value: 'single-account',
            type: 'text',
          },
          // Clearing fields from previous setup format to prevent exposing credentials
          // when switching from manual to cloud formation
          ...Object.fromEntries(fieldsToHide.map((field) => [field.id, { value: undefined }])),
        })
      );
    } else {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'gcp.account_type': {
            // Restoring last manual credentials type
            value: lastSetupAccessType.current || 'organization-account',
            type: 'text',
          },
          // Restoring fields from manual setup format if any
          ...fieldsSnapshot.current,
        })
      );
    }
  };

  useEffect(() => {
    if (!getGcpAccountType(input)) {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'gcp.account_type': {
            value: isGcpOrgDisabled ? GCP_SINGLE_ACCOUNT : GCP_ORGANIZATION_ACCOUNT,
            type: 'text',
          },
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, updatePolicy]);

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.fleetIntegration.gcpAccountTypeDescriptionLabel"
          defaultMessage="Select between single project or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      {isGcpOrgDisabled && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.gcpAccountType.gcpOrganizationNotSupportedMessage"
              defaultMessage="GCP Organization not supported in current integration version. Please upgrade to the latest version to enable GCP Organizations integration."
            />
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}
      <RadioGroup
        disabled={disabled}
        idSelected={getGcpAccountType(input) || ''}
        options={gcpAccountTypeOptions}
        onChange={(accountType) =>
          accountType !== getGcpAccountType(input) && onSetupFormatChange(accountType)
        }
        size="m"
      />
      {getGcpAccountType(input) === GCP_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.gcpAccountType.gcpOrganizationDescription"
              defaultMessage="Connect Elastic to every GCP Project (current and future) in your environment by providing Elastic with read-only (configuration) access to your GCP organization"
            />
          </EuiText>
        </>
      )}
      {getGcpAccountType(input) === GCP_SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.csp.fleetIntegration.gcpAccountType.gcpSingleAccountDescription"
              defaultMessage="Deploying to a single project is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy CSPM at the organization-level, which automatically connects all projects (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};

// const getAzureAccountType = (
//   input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>
// ): AzureAccountType | undefined => input.streams[0].vars?.['azure.account_type']?.value;

// const AZURE_ORG_MINIMUM_PACKAGE_VERSION = '1.7.0';

// const AzureAccountTypeSelect = ({
//   input,
//   newPolicy,
//   updatePolicy,
//   disabled,
//   packageInfo,
//   setupTechnology,
// }: {
//   input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_azure' }>;
//   newPolicy: NewPackagePolicy;
//   updatePolicy: (updatedPolicy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
//   disabled: boolean;
//   packageInfo: PackageInfo;
//   setupTechnology: SetupTechnology;
// }) => {
//   const isAzureOrganizationDisabled = isBelowMinVersion(
//     packageInfo.version,
//     AZURE_ORG_MINIMUM_PACKAGE_VERSION
//   );
//   const azureAccountTypeOptions = getAzureAccountTypeOptions(isAzureOrganizationDisabled);
//   const isAgentless = setupTechnology === SetupTechnology.AGENTLESS;

//   useEffect(() => {
//     if (!getAzureAccountType(input)) {
//       updatePolicy(
//         getPosturePolicy(newPolicy, input.type, {
//           'azure.account_type': {
//             value: isAzureOrganizationDisabled ? AZURE_SINGLE_ACCOUNT : AZURE_ORGANIZATION_ACCOUNT,
//             type: 'text',
//           },
//           'azure.credentials.type': {
//             value: isAgentless
//               ? AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
//               : AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
//             type: 'text',
//           },
//         })
//       );
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [input, updatePolicy]);

//   return (
//     <>
//       <EuiText color="subdued" size="s">
//         <FormattedMessage
//           id="xpack.csp.fleetIntegration.azureAccountTypeDescriptionLabel"
//           defaultMessage="Select between onboarding an Azure Organization (tenant root group) or a single Azure subscription, and then fill in the name and description to help identify this integration."
//         />
//       </EuiText>
//       <EuiSpacer size="l" />
//       <RadioGroup
//         disabled={disabled}
//         idSelected={getAzureAccountType(input) || ''}
//         options={azureAccountTypeOptions}
//         onChange={(accountType) => {
//           updatePolicy(
//             getPosturePolicy(newPolicy, input.type, {
//               'azure.account_type': {
//                 value: accountType,
//                 type: 'text',
//               },
//             })
//           );
//         }}
//         size="m"
//       />
//       {getAzureAccountType(input) === AZURE_ORGANIZATION_ACCOUNT && (
//         <>
//           <EuiSpacer size="l" />
//           <EuiText color="subdued" size="s">
//             <FormattedMessage
//               id="xpack.csp.fleetIntegration.azureAccountType.azureOrganizationDescription"
//               defaultMessage="Connect Elastic to every Azure Subscription (current and future) in your environment by providing Elastic with read-only (configuration) access to your Azure Organization (tenant root group)."
//             />
//           </EuiText>
//         </>
//       )}
//       {getAzureAccountType(input) === AZURE_SINGLE_ACCOUNT && (
//         <>
//           <EuiSpacer size="l" />
//           <EuiText color="subdued" size="s">
//             <FormattedMessage
//               id="xpack.csp.fleetIntegration.azureAccountType.singleAccountDescription"
//               defaultMessage="Deploying to a single subscription is suitable for an initial POC. To ensure compete coverage, it is strongly recommended to deploy CSPM at the organization (tenant root group) level, which automatically connects all subscriptions (both current and future)."
//             />
//           </EuiText>
//         </>
//       )}
//     </>
//   );
// };

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

// export const PolicyTemplateVarsForm = ({
//   input,
//   setupTechnology,
//   ...props
// }: PolicyTemplateVarsFormProps) => {
//   const isAgentless = setupTechnology === SetupTechnology.AGENTLESS;

//   switch (input.type) {
//     case 'cloudbeat/asset_inventory_aws':
//       if (isAgentless) {
//         return <AwsCredentialsFormAgentless {...props} input={input} />;
//       }

//       return <AwsCredentialsForm {...props} input={input} />;
//     // case 'cloudbeat/asset_inventory_gcp':
//     //   if (isAgentless) {
//     //     return <GcpCredentialsFormAgentless {...props} input={input} />;
//     //   }

//     //   return <GcpCredentialsForm {...props} input={input} />;
//     // case 'cloudbeat/asset_inventory_azure':
//     //   if (isAgentless) {
//     //     return <AzureCredentialsFormAgentless {...props} input={input} />;
//     //   }

//     //   return <AzureCredentialsForm {...props} input={input} />;
//     default:
//       return null;
//   }
// };

// const useEnsureDefaultNamespace = ({
//   newPolicy,
//   input,
//   updatePolicy,
// }: {
//   newPolicy: NewPackagePolicy;
//   input: NewPackagePolicyPostureInput;
//   updatePolicy: (policy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
// }) => {
//   useEffect(() => {
//     if (newPolicy.namespace === POSTURE_NAMESPACE) return;

//     const policy = { ...getPosturePolicy(newPolicy, input.type), namespace: POSTURE_NAMESPACE };
//     updatePolicy(policy);
//   }, [newPolicy, input, updatePolicy]);
// };

// const usePolicyTemplateInitialName = ({
//   isEditPage,
//   isLoading,
//   integration,
//   newPolicy,
//   packagePolicyList,
//   updatePolicy,
//   setCanFetchIntegration,
// }: {
//   isEditPage: boolean;
//   isLoading: boolean;
//   integration: CloudSecurityPolicyTemplate | undefined;
//   newPolicy: NewPackagePolicy;
//   packagePolicyList: PackagePolicy[] | undefined;
//   updatePolicy: (policy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
//   setCanFetchIntegration: (canFetch: boolean) => void;
// }) => {
//   useEffect(() => {
//     if (!integration) return;
//     if (isEditPage) return;
//     if (isLoading) return;

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
//   }, [isLoading, integration, isEditPage, packagePolicyList]);
// };

const getSelectedOption = (
  options: NewPackagePolicyInput[]
  // policyTemplate: string = ASSET_POLICY_TEMPLATE
) => {
  // Looks for the enabled deployment (aka input). By default, all inputs are disabled.
  // Initial state when all inputs are disabled is to choose the first available of the relevant policyTemplate
  // Default selected policy template is CSPM
  const selectedOption =
    options.find((i) => i.enabled) ||
    // options.find((i) => i.policy_template === ASSET_POLICY_TEMPLATE) ||
    options[0];

  return selectedOption;
};

// /**
//  * Update CloudFormation template and stack name in the Agent Policy
//  * based on the selected policy template
//  */
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
      integrationToEnable,
      setIntegrationToEnable,
    }) => {
      // const integrationParam = useParams<{ integration: CloudSecurityPolicyTemplate }>().integration;

      // // Handling validation state
      const [isValid, setIsValid] = useState(true);
      const { cloud } = useKibana().services;
      const isServerless = !!cloud?.serverless.projectType;
      const input = getSelectedOption(newPolicy.inputs);
      // // const getIsSubscriptionValid = useIsSubscriptionStatusValid();
      // // const isSubscriptionValid = !!getIsSubscriptionValid.data;
      const { isAgentlessAvailable, setupTechnology, updateSetupTechnology } = useSetupTechnology({
        input,
        isAgentlessEnabled,
        handleSetupTechnologyChange,
        isEditPage,
        defaultSetupTechnology,
      });

      const shouldRenderAgentlessSelector =
        (!isEditPage && isAgentlessAvailable) || (isEditPage && isAgentlessEnabled);

      const getDefaultCloudCredentialsType = (
        isAgentless: boolean,
        inputType: Extract<
          AssetInput,
          | 'cloudbeat/asset_inventory_aws'
          | 'cloudbeat/asset_inventory_azure'
          | 'cloudbeat/asset_inventory_gcp'
        >
      ) => {
        const credentialsTypes: Record<
          Extract<
            AssetInput,
            | 'cloudbeat/asset_inventory_aws'
            | 'cloudbeat/asset_inventory_azure'
            | 'cloudbeat/asset_inventory_gcp'
          >,
          {
            [key: string]: {
              value: string;
              type: 'text';
            };
          }
        > = {
          'cloudbeat/asset_inventory_aws': {
            'aws.credentials.type': {
              value: isAgentless
                ? AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS
                : AWS_CREDENTIALS_TYPE.CLOUD_FORMATION,
              type: 'text',
            },
          },
          'cloudbeat/asset_inventory_gcp': {
            'gcp.credentials.type': {
              value: isAgentless
                ? GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON
                : GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE,
              type: 'text',
            },
          },
          'cloudbeat/asset_inventory_azure': {
            'azure.credentials.type': {
              value: isAgentless
                ? AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
                : AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
              type: 'text',
            },
          },
        };

        return credentialsTypes[inputType];
      };

      const updatePolicy = useCallback(
        (updatedPolicy: NewPackagePolicy, isExtensionLoaded?: boolean) => {
          onChange({ isValid, updatedPolicy, isExtensionLoaded });
        },
        [onChange, isValid]
      );

      // /**
      //  * - Updates policy inputs by user selection
      //  * - Updates hidden policy vars
      //  */
      const setEnabledPolicyInput = useCallback(
        (inputType: AssetInput) => {
          const inputVars = getPostureInputHiddenVars(inputType, packageInfo, setupTechnology);
          const policy = getAssetPolicy(newPolicy, inputType, inputVars);
          updatePolicy(policy);
        },
        [setupTechnology, packageInfo, newPolicy, updatePolicy]
      );

      // // search for non null fields of the validation?.vars object
      const validationResultsNonNullFields = Object.keys(validationResults?.vars || {}).filter(
        (key) => (validationResults?.vars || {})[key] !== null
      );
      const hasInvalidRequiredVars = !!hasErrors(validationResults);

      const [isLoading, setIsLoading] = useState(validationResultsNonNullFields.length > 0);
      const [canFetchIntegration, setCanFetchIntegration] = useState(true);

      // // delaying component rendering due to a race condition issue from Fleet
      // // TODO: remove this workaround when the following issue is resolved:
      // // https://github.com/elastic/kibana/issues/153246
      useEffect(() => {
        // using validation?.vars to know if the newPolicy state was reset due to race condition
        if (validationResultsNonNullFields.length > 0) {
          // Forcing rerender to recover from the validation errors state
          setIsLoading(true);
        }
        setTimeout(() => setIsLoading(false), 200);
      }, [validationResultsNonNullFields]);

      // useEffect(() => {
      //   setIsLoading(getIsSubscriptionValid.isLoading);
      // }, [getIsSubscriptionValid.isLoading]);

      const { data: packagePolicyList, refetch } = usePackagePolicyList(packageInfo.name, {
        enabled: canFetchIntegration,
      });

      // useEffect(() => {
      //   if (!isServerless) {
      //     setIsValid(isSubscriptionValid);
      //   }
      // }, [isServerless, isSubscriptionValid]);

      useEffect(() => {
        if (isEditPage) return;
        if (isLoading) return;
        // Pick default input type for policy template.
        // Only 1 enabled input is supported when all inputs are initially enabled.
        // Required for mount only to ensure a single input type is selected
        // This will remove errors in validationResults.vars
        setEnabledPolicyInput(CLOUDBEAT_AWS);
        refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [isLoading, input.policy_template, isEditPage]);

      // useEffect(() => {
      //   if (isEditPage) {
      //     return;
      //   }

      //   setEnabledPolicyInput(input.type);
      //   setIntegrationToEnable?.(input.policy_template);
      //   // eslint-disable-next-line react-hooks/exhaustive-deps
      // }, [setupTechnology]);

      // useEnsureDefaultNamespace({ newPolicy, input, updatePolicy });

      // useCloudFormationTemplate({
      //   packageInfo,
      //   updatePolicy,
      //   newPolicy,
      // });

      // usePolicyTemplateInitialName({
      //   packagePolicyList: packagePolicyList?.items,
      //   isEditPage,
      //   isLoading,
      //   integration: integration as CloudSecurityPolicyTemplate,
      //   newPolicy,
      //   updatePolicy,
      //   setCanFetchIntegration,
      // });

      // if (isLoading) {
      //   return (
      //     <EuiFlexGroup justifyContent="spaceAround" data-test-subj={POLICY_TEMPLATE_FORM_DTS.LOADER}>
      //       <EuiFlexItem grow={false}>
      //         <EuiLoadingSpinner size="xl" />
      //       </EuiFlexItem>
      //     </EuiFlexGroup>
      //   );
      // }

      const integrationFields = [
        {
          id: 'name',
          value: newPolicy.name,
          error: validationResults?.name || null,
          label: (
            <FormattedMessage
              id="xpack.csp.fleetIntegration.integrationNameLabel"
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
              id="xpack.csp.fleetIntegration.integrationDescriptionLabel"
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
          {/* <PolicyTemplateInfo postureType={input.policy_template} /> */}
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
          {input.type === CLOUDBEAT_AWS && (
            <AwsAccountTypeSelect
              input={input}
              newPolicy={newPolicy}
              updatePolicy={updatePolicy}
              packageInfo={packageInfo}
              disabled={isEditPage}
            />
          )}

          {input.type === 'cloudbeat/asset_inventory_gcp' && (
            <GcpAccountTypeSelect
              input={input}
              newPolicy={newPolicy}
              updatePolicy={updatePolicy}
              packageInfo={packageInfo}
              disabled={isEditPage}
            />
          )}
          {/* 
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
          */}
          <IntegrationSettings
            fields={integrationFields}
            onChange={(field, value) => updatePolicy({ ...newPolicy, [field]: value })}
          />

          {shouldRenderAgentlessSelector && (
            <SetupTechnologySelector
              showLimitationsMessage={!isServerless}
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
            onChange={onChange}
            setIsValid={setIsValid}
            disabled={isEditPage}
            setupTechnology={setupTechnology}
            isEditPage={isEditPage}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
          <EuiSpacer />
        </>
      );
    }
  );

CloudAssetInventoryPolicyTemplateForm.displayName = 'CloudAssetInventoryPolicyTemplateForm';

// eslint-disable-next-line import/no-default-export
export { CloudAssetInventoryPolicyTemplateForm as default };
