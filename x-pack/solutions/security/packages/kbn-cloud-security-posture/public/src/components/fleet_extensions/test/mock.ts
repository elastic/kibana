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
import { AWS_PROVIDER, GCP_PROVIDER, AZURE_PROVIDER } from '../constants';
import type { CloudProviders, CloudSetupConfig } from '../types';

export const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';
export const CLOUDBEAT_GCP = 'cloudbeat/cis_gcp';
export const CLOUDBEAT_AZURE = 'cloudbeat/cis_azure';

export const TEMPLATE_NAME = 'cspm';
export const TEMPLATE_INTEGRATION_NAME = 'cloud_security_posture';
export const CLOUD_CONNECTOR_ENABLED_VERSION = '3.0.0';

const defaultConfig: CloudSetupConfig = {
  defaultProvider: AWS_PROVIDER,
  getStartedPath: 'test/getStartedPath',
  name: TEMPLATE_INTEGRATION_NAME,
  overviewPath: '/overview/testPath',
  policyTemplate: TEMPLATE_NAME,
  shortName: TEMPLATE_NAME,
  namespaceSupportEnabled: true,
  showCloudTemplates: true,
  providers: {
    aws: {
      type: CLOUDBEAT_AWS,
      getStartedPath: '/get-started/aws',
      cloudConnectorEnabledVersion: CLOUD_CONNECTOR_ENABLED_VERSION,
      enabled: true,
      enableOrganization: true,
    },
    gcp: {
      type: CLOUDBEAT_GCP,
      getStartedPath: '/get-started/gcp',
      cloudConnectorEnabledVersion: CLOUD_CONNECTOR_ENABLED_VERSION,
      enabled: true,
      enableOrganization: true,
    },
    azure: {
      type: CLOUDBEAT_AZURE,
      getStartedPath: '/get-started/azure',
      cloudConnectorEnabledVersion: CLOUD_CONNECTOR_ENABLED_VERSION,
      enabled: true,
      enableOrganization: true,
      manualFieldsEnabled: true,
    },
  },
};

export const getDefaultCloudSetupConfig = (overrides?: CloudSetupConfig) => {
  return {
    ...defaultConfig,
    ...overrides,
  };
};

export const getMockPolicyAWS = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_AWS, TEMPLATE_NAME, AWS_PROVIDER, vars);
export const getMockPolicyGCP = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_GCP, TEMPLATE_NAME, GCP_PROVIDER, vars);
export const getMockPolicyAzure = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_AZURE, TEMPLATE_NAME, AZURE_PROVIDER, vars);
export const getMockPackageInfo = () =>
  getPackageInfoMock({ includeCloudFormationTemplates: false });

export const getMockPackageInfoAWS = (packageVersion = '1.5.0') => {
  return {
    version: packageVersion,
    name: TEMPLATE_NAME,
    policy_templates: [
      {
        title: '',
        description: '',
        name: TEMPLATE_NAME,
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

export const getMockPackageInfoGCP = (packageVersion = '1.5.2') => {
  return {
    version: packageVersion,
    name: TEMPLATE_NAME,
    policy_templates: [
      {
        title: '',
        description: '',
        name: TEMPLATE_NAME,
        inputs: [
          {
            type: CLOUDBEAT_GCP,
            title: 'GCP',
            description: '',
            vars: [{}],
          },
        ],
      },
    ],
  } as PackageInfo;
};

export const getMockPackageInfoCspmAzure = (packageVersion = '1.6.0') => {
  return {
    version: packageVersion,
    name: TEMPLATE_NAME,
    policy_templates: [
      {
        title: '',
        description: '',
        name: TEMPLATE_NAME,
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
  type: string,
  posture: string,
  deployment: CloudProviders,
  vars: object = {}
): NewPackagePolicy => {
  const mockPackagePolicy = createNewPackagePolicyMock();

  const awsVarsMock = {
    access_key_id: { type: 'text' },
    secret_access_key: { type: 'password', isSecret: true },
    session_token: { type: 'text' },
    shared_credential_file: { type: 'text' },
    credential_profile_name: { type: 'text' },
    role_arn: { type: 'text' },
    'aws.credentials.type': { value: 'cloud_formation', type: 'text' },
  };

  const gcpVarsMock = {
    'gcp.project_id': { type: 'text' },
    'gcp.organization_id': { type: 'text' },
    'gcp.credentials.file': { type: 'text' },
    'gcp.credentials.json': { type: 'text' },
    'gcp.credentials.type': { type: 'text' },
    'gcp.account_type': { value: 'organization-account', type: 'text' },
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
    azure_credentials_cloud_connector_id: { type: 'text' },
  };

  const dataStream = { type: 'logs', dataset: 'cloud_security_posture.findings' };

  return {
    ...mockPackagePolicy,
    name: 'cloud_security_posture-policy',
    package: {
      name: 'cloud_security_posture',
      title: 'Security Posture Management',
      version: '1.1.1',
    },
    vars: {
      posture: {
        value: posture,
        type: 'text',
      },
      deployment: { value: deployment, type: 'text' },
    },
    inputs: [
      {
        type: CLOUDBEAT_AWS,
        policy_template: TEMPLATE_NAME,
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
        policy_template: TEMPLATE_NAME,
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
        policy_template: TEMPLATE_NAME,
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

export const getPackageInfoMock = (props?: {
  includeCloudFormationTemplates?: boolean;
  includeAzureTemplates?: boolean;
}) => {
  const cloudFormationTemplates = props?.includeCloudFormationTemplates
    ? [
        {
          name: 'cloud_formation_template',
          type: 'text',
          title: 'CloudFormation Template',
          multi: false,
          required: true,
          show_user: false,
          description: 'Template URL to Cloud Formation Quick Create Stack',
          default:
            'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-ACCOUNT_TYPE-8.19.0.yml&stackName=Elastic-Cloud-Security-Posture-Management&param_EnrollmentToken=FLEET_ENROLLMENT_TOKEN&param_FleetUrl=FLEET_URL&param_ElasticAgentVersion=KIBANA_VERSION&param_ElasticArtifactServer=https://artifacts.elastic.co/downloads/beats/elastic-agent',
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
            'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cspm-direct-access-key-ACCOUNT_TYPE-8.19.0.yml',
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
            'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://elastic-cspm-cft.s3.eu-central-1.amazonaws.com/cloudformation-cloud-connectors-ACCOUNT_TYPE-9.1.0.yml&param_ElasticResourceId=RESOURCE_ID',
        },
      ]
    : undefined;

  const azureTemplates = props?.includeAzureTemplates
    ? [
        {
          name: 'arm_template_url',
          type: 'text',
          title: 'ARM Template URL',
          multi: false,
          required: true,
          show_user: false,
          description: 'A URL to the ARM Template for creating a new deployment',
          default:
            'https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Felastic%2Fcloudbeat%2F8.19%2Fdeploy%2Fazure%2FARM-for-ACCOUNT_TYPE.json',
        },
        {
          name: 'arm_template_cloud_connectors_url',
          type: 'text',
          title: 'ARM Cloud Connectors Template URL',
          multi: false,
          required: true,
          show_user: false,
          description: 'A URL to the ARM Template for creating a Cloud Connectors managed identity',
          default:
            'https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Felastic%2Fcloudbeat%2Fmain%2Fdeploy%2Fazure%2FARM-for-cloud-connectors-ACCOUNT_TYPE.json',
        },
      ]
    : undefined;

  return {
    version: CLOUD_CONNECTOR_ENABLED_VERSION,
    policy_templates: [
      {
        title: '',
        description: '',
        name: TEMPLATE_NAME,
        inputs: [
          {
            type: CLOUDBEAT_AWS,
            title: '',
            description: '',
            vars: cloudFormationTemplates,
          },
          {
            type: 'cloudbeat/cis_azure',
            vars: azureTemplates,
          },
        ],
      },
    ],
    data_streams: [
      {
        dataset: 'cloud_security_posture.findings',
        type: 'logs',

        package: 'cloud_security_posture',
        path: 'findings',
        release: 'ga' as RegistryRelease,

        title: 'Cloud Security Posture Findings',
        streams: [
          {
            input: CLOUDBEAT_AWS,
            template_path: 'aws.yml.hbs',
            title: 'CIS AWS Benchmark',
            vars: [
              {
                name: 'secret_access_key',
                title: 'Secret Access Key',
                secret: true,
                type: 'text' as RegistryVarType,
              },
            ],
          },
          {
            input: 'cloudbeat/cis_eks',
            template_path: 'eks.yml.hbs',
            title: 'Amazon EKS Benchmark',
            vars: [
              {
                name: 'secret_access_key',
                title: 'Secret Access Key',
                secret: true,
                type: 'text' as RegistryVarType,
              },
            ],
          },
          {
            input: CLOUDBEAT_AZURE,
            template_path: 'azure.yml.hbs',
            title: 'CIS Azure Benchmark',
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
              {
                name: 'azure_credentials_cloud_connector_id',
                type: 'text',
                title: 'Elastic Cloud Connector ID',
                multi: false,
                required: false,
                show_user: true,
              },
            ],
          },
        ],
      },
    ],
    format_version: '3.0.0',
    name: 'cloud_security_posture',
    description: 'Identify & remediate configuration risks in your Cloud infrastructure',
    owner: {
      github: 'elastic/cloud-security-posture',
      type: 'elastic' as 'elastic' | 'partner' | 'community' | undefined,
    },
    title: 'Security Posture Management',
    latestVersion: '3.0.0',
    assets: {
      kibana: {},
    },
  };
};

export const getAwsPackageInfoMock = () => {
  return {
    ...getPackageInfoMock(),
    policy_templates: [
      {
        name: TEMPLATE_NAME,
        title: 'Cloud Security Posture Management (CSPM)',
        description: 'Identify & remediate configuration risks in the Cloud services you leverage',
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
            type: CLOUDBEAT_AWS,
            description: 'CIS Benchmark for Amazon Web Services Foundations',
          },
        ],
        categories: ['security', 'cloud', 'aws', 'google_cloud'],
        icons: [
          {
            src: '/img/logo_cspm.svg',
            title: 'CSPM logo',
            size: '32x32',
            type: 'image/svg+xml',
          },
        ],
        data_streams: ['findings'],
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

export const mockConfig: CloudSetupConfig = {
  policyTemplate: TEMPLATE_NAME,
  defaultProvider: 'aws',
  namespaceSupportEnabled: true,
  name: 'Test Integration',
  shortName: 'Test',
  overviewPath: '/overview',
  getStartedPath: '/get-started',
  showCloudTemplates: true,
  providers: {
    aws: {
      type: CLOUDBEAT_AWS,
      enableOrganization: true,
      getStartedPath: '/aws/start',
      cloudConnectorEnabledVersion: '3.0.0',
    },
    gcp: {
      type: CLOUDBEAT_GCP,
      enabled: true,
      enableOrganization: true,
      getStartedPath: '/gcp/start',
    },
    azure: {
      type: CLOUDBEAT_AZURE,
      enableOrganization: true,
      getStartedPath: '/azure/start',
    },
  },
};
