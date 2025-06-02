/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { PackageInfo, PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import { createNewPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import type { RegistryRelease, RegistryVarType } from '@kbn/fleet-plugin/common/types';
import { CLOUDBEAT_AWS } from './aws_credentials_form/constants';
import { CLOUDBEAT_GCP } from './gcp_credentials_form/constants';
import { CLOUDBEAT_AZURE } from './azure_credentials_form/constants';
import type { AssetInput } from './types';

export const getMockPolicyAWS = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_AWS, 'aws', vars);
export const getMockPolicyGCP = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_GCP, 'gcp', vars);
export const getMockPolicyAzure = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_AZURE, 'azure', vars);
export const getMockPackageInfo = () => getPackageInfoMock();

export const getMockPackageInfoAssetInventoryAWS = () => {
  return {
    name: 'cloud_asset_inventory',
    policy_templates: [
      {
        title: '',
        description: '',
        name: 'asset_inventory',
        inputs: [
          {
            type: CLOUDBEAT_AWS,
            title: '',
            description: '',
            vars: [
              {
                type: 'text',
                name: 'cloud_formation_template',
                default: 's3_url',
                show_user: false,
              },
            ],
          },
        ],
      },
    ],
  } as PackageInfo;
};

export const getMockPackageInfoAssetGCP = () => {
  return {
    name: 'cloud_asset_inventory',
    policy_templates: [
      {
        title: '',
        description: '',
        name: 'asset_inventory',
        inputs: [
          {
            type: CLOUDBEAT_GCP,
            title: 'GCP',
            description: '',
            vars: [
              {
                type: 'text',
                name: 'cloud_shell_url',
                default: 'https://console.cloud.google.com/cloudshell/open?cloudshell_git_repo=',
                show_user: false,
              },
            ],
          },
        ],
      },
    ],
  } as PackageInfo;
};

export const getMockPackageInfoAssetAzure = () => {
  return {
    name: 'cloud_asset_inventory',
    policy_templates: [
      {
        title: '',
        description: '',
        name: 'asset_inventory',
        inputs: [
          {
            type: CLOUDBEAT_AZURE,
            title: 'Azure',
            description: '',
            vars: [{}],
          },
        ],
      },
    ],
  } as PackageInfo;
};

const getPolicyMock = (
  type: AssetInput,
  deployment: string,
  vars: object = {}
): NewPackagePolicy => {
  const mockPackagePolicy = createNewPackagePolicyMock();

  const awsVarsMock = {
    'aws.account_type': { value: 'single-account' },
    'aws.access_key_id': { type: 'text' },
    'aws.secret_access_key': { type: 'password', isSecret: true },
    'aws.session_token': { type: 'text' },
    'aws.shared_credential_file': { type: 'text' },
    'aws.credential_profile_name': { type: 'text' },
    'aws.role_arn': { type: 'text' },
    'aws.credentials.type': { value: 'cloud_formation' },
  };

  const gcpVarsMock = {
    'gcp.project_id': { type: 'text' },
    'gcp.organization_id': { type: 'text' },
    'gcp.credentials.file': { type: 'text' },
    'gcp.credentials.json': { type: 'text' },
    'gcp.credentials.type': { type: 'text' },
    'gcp.account_type': { value: 'single-account', type: 'text' },
  };

  const azureVarsMock = {
    'azure.credentials.type': { value: 'arm_template', type: 'text' },
    'azure.account_type': { type: 'text' },
    'azure.credentials.tenant_id': { type: 'text' },
    'azure.credentials.client_id': { type: 'text' },
    'azure.credentials.client_secret': { type: 'text' },
    'azure.credentials.client_certificate_path': { type: 'text' },
    'azure.credentials.client_certificate_password': { type: 'text' },
    'azure.credentials.client_username': { type: 'text' },
    'azure.credentials.client_password': { type: 'text' },
  };

  const dataStream = { type: 'logs', dataset: 'cloud_asset_inventory.asset_inventory' };

  return {
    ...mockPackagePolicy,
    name: 'cloud_asset_inventory-policy',
    package: {
      name: 'cloud_asset_inventory',
      title: 'Security Posture Management (CSPM/KSPM)',
      version: '1.1.1',
    },
    vars: {
      asset: {
        value: 'asset_inventory',
        type: 'text',
      },
      deployment: { value: deployment, type: 'text' },
    },
    inputs: [
      {
        type: CLOUDBEAT_AWS,
        policy_template: 'asset_inventory',
        enabled: type === CLOUDBEAT_AWS,
        streams: [
          {
            enabled: type === CLOUDBEAT_AWS,
            data_stream: dataStream,
            vars: { ...awsVarsMock, ...vars },
          },
        ],
      },
      {
        type: CLOUDBEAT_GCP,
        policy_template: 'asset_inventory',
        enabled: type === CLOUDBEAT_GCP,
        streams: [
          {
            enabled: type === CLOUDBEAT_GCP,
            data_stream: dataStream,
            vars: { ...gcpVarsMock, ...vars },
          },
        ],
      },
      {
        type: CLOUDBEAT_AZURE,
        policy_template: 'asset_inventory',
        enabled: type === CLOUDBEAT_AZURE,
        streams: [
          {
            enabled: type === CLOUDBEAT_AZURE,
            data_stream: dataStream,
            vars: { ...azureVarsMock, ...vars },
          },
        ],
      },
    ],
  };
};

export const getPackageInfoMock = () => {
  return {
    data_streams: [
      {
        dataset: 'cloud_asset_inventory.asset_inventory',
        type: 'logs',

        package: 'cloud_asset_inventory',
        path: 'asset_inventory',
        release: 'ga' as RegistryRelease,

        title: 'Cloud Assets Inventory',
        streams: [
          {
            input: 'cloudbeat/asset_inventory_aws',
            template_path: 'aws.yml.hbs',
            title: 'AWS Asset Inventory',
            vars: [
              {
                name: 'gcp.credentials.file',
                title: 'Credentials File',
                type: 'text' as RegistryVarType,
              },
            ],
          },
          {
            input: 'cloudbeat/asset_inventory_gcp',
            template_path: 'gcp.yml.hbs',
            title: 'GCP Asset Inventory',
            vars: [
              {
                name: 'aws.access_key_id',
                title: 'Access Key ID',
                secret: true,
                type: 'text' as RegistryVarType,
              },
              {
                name: 'aws.secret_access_key',
                title: 'Secret Access Key',
                secret: true,
                type: 'text' as RegistryVarType,
              },
            ],
          },
          {
            input: 'cloudbeat/asset_inventory_azure',
            template_path: 'azure.yml.hbs',
            title: 'Azure Asset Inventory',
            vars: [
              {
                multi: false,
                name: 'azure.credentials.client_secret',
                required: false,
                secret: true,
                show_user: true,
                title: 'Client Secret',
                type: 'text' as RegistryVarType,
              },
              {
                multi: false,
                name: 'azure.credentials.client_password',
                required: false,
                secret: true,
                show_user: true,
                title: 'Client Password',
                type: 'text' as RegistryVarType,
              },
              {
                multi: false,
                name: 'azure.credentials.client_certificate_password',
                required: false,
                secret: true,
                show_user: true,
                title: 'Client Certificate Password',
                type: 'text' as RegistryVarType,
              },
            ],
          },
        ],
      },
    ],
    format_version: '3.3.2',
    version: '0.0.0',
    name: 'cloud_asset_inventory',
    description: 'Discover and Create Cloud Assets Inventory',
    owner: {
      github: 'elastic/cloud-security-posture',
      type: 'elastic' as 'elastic' | 'partner' | 'community' | undefined,
    },
    title: 'Cloud Asset Discovery',
    latestVersion: '0.0.0',
    assets: {
      kibana: {},
    },
  } as PackageInfo;
};

export const getAwsPackageInfoMock = () => {
  return {
    ...getPackageInfoMock(),
    policy_templates: [
      {
        name: 'asset_inventory',
        title: 'Cloud Asset Inventory',
        description: 'Discover and Create Cloud Assets Inventory',
        multiple: true,
        inputs: [
          {
            title: 'Amazon Web Services',
            vars: [
              {
                name: 'cloud_formation_template',
                type: 'text',
                title: 'CloudFormation Template',
                multi: false,
                required: true,
                show_user: false,
                description: 'Template URL to Cloud Formation Quick Create Stack',
                default:
                  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-ACCOUNT_TYPE-8.18.0.yml&stackName=Elastic-Cloud-Security-Posture-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
              },
              {
                name: 'cloud_formation_credentials_template',
                type: 'text',
                title: 'CloudFormation Credentials Template',
                multi: false,
                required: true,
                show_user: false,
                description: 'Template URL to Cloud Formation Cloud Credentials Stack',
                default:
                  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-direct-access-key-ACCOUNT_TYPE-8.18.0.yml',
              },
              {
                name: 'cloud_formation_cloud_connectors_template',
                type: 'text',
                title: 'CloudFormation Cloud Connectors Template',
                multi: false,
                required: true,
                show_user: false,
                description: 'Template URL to Cloud Formation Cloud Connectors Stack',
                default:
                  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cloud-connectors-ACCOUNT_TYPE-8.18.0.yml&param_ElasticResourceId=RESOURCE_ID',
              },
            ],
            type: 'cloudbeat/asset_inventory_aws',
            description: 'Cloud Asset Discovery for AWS',
          },
        ],
        categories: ['security', 'cloud', 'aws', 'google_cloud'],
        icons: [
          {
            src: '/img/logo_cspm.svg',
            title: 'Asset Inventory logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
        deployment_modes: {
          default: {
            enabled: true,
          },
          agentless: {
            enabled: true,
            is_default: true,
            organization: 'security',
            division: 'engineering',
            team: 'cloud-security-posture',
          },
        },
      },
    ],
  };
};
