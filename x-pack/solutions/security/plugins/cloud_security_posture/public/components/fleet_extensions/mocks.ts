/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { PackageInfo, PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import { createNewPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { RegistryRelease, RegistryVarType } from '@kbn/fleet-plugin/common/types';
import {
  CLOUDBEAT_GCP,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_EKS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_AWS,
  CLOUDBEAT_VULN_MGMT_AWS,
} from '../../../common/constants';
import type { PostureInput } from '../../../common/types_old';

export const getMockPolicyAWS = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_AWS, 'cspm', 'aws', vars);
export const getMockPolicyGCP = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_GCP, 'cspm', 'gcp', vars);
export const getMockPolicyAzure = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_AZURE, 'cspm', 'azure', vars);
export const getMockPolicyK8s = () => getPolicyMock(CLOUDBEAT_VANILLA, 'kspm', 'self_managed');
export const getMockPolicyEKS = (vars?: PackagePolicyConfigRecord) =>
  getPolicyMock(CLOUDBEAT_EKS, 'kspm', 'eks', vars);
export const getMockPolicyVulnMgmtAWS = () =>
  getPolicyMock(CLOUDBEAT_VULN_MGMT_AWS, 'vuln_mgmt', 'aws');
export const getMockPackageInfo = () => getPackageInfoMock();

export const getMockPackageInfoVulnMgmtAWS = () => {
  return {
    policy_templates: [
      {
        title: '',
        description: '',
        name: 'vuln_mgmt',
        inputs: [
          {
            type: 'cloudbeat/vuln_mgmt_aws',
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

export const getMockPackageInfoCspmAWS = (packageVersion = '1.5.0') => {
  return {
    version: packageVersion,
    name: 'cspm',
    policy_templates: [
      {
        title: '',
        description: '',
        name: 'cspm',
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

export const getMockPackageInfoCspmGCP = (packageVersion = '1.5.2') => {
  return {
    version: packageVersion,
    name: 'cspm',
    policy_templates: [
      {
        title: '',
        description: '',
        name: 'cspm',
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
    name: 'cspm',
    policy_templates: [
      {
        title: '',
        description: '',
        name: 'cspm',
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
  type: PostureInput,
  posture: string,
  deployment: string,
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

  const eksVarsMock = {
    access_key_id: { type: 'text' },
    secret_access_key: { type: 'password', isSecret: true },
    session_token: { type: 'text' },
    shared_credential_file: { type: 'text' },
    credential_profile_name: { type: 'text' },
    role_arn: { type: 'text' },
    'aws.credentials.type': { value: 'assume_role', type: 'text' },
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
  };

  const dataStream = { type: 'logs', dataset: 'cloud_security_posture.findings' };

  return {
    ...mockPackagePolicy,
    name: 'cloud_security_posture-policy',
    package: {
      name: 'cloud_security_posture',
      title: 'Security Posture Management (CSPM/KSPM)',
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
        type: CLOUDBEAT_VANILLA,
        policy_template: 'kspm',
        enabled: type === CLOUDBEAT_VANILLA,
        streams: [{ enabled: type === CLOUDBEAT_VANILLA, data_stream: dataStream }],
      },
      {
        type: CLOUDBEAT_EKS,
        policy_template: 'kspm',
        enabled: type === CLOUDBEAT_EKS,
        streams: [
          {
            enabled: type === CLOUDBEAT_EKS,
            data_stream: dataStream,
            vars: { ...eksVarsMock, ...vars },
          },
        ],
      },
      {
        type: CLOUDBEAT_AWS,
        policy_template: 'cspm',
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
        policy_template: 'cspm',
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
        policy_template: 'cspm',
        enabled: type === CLOUDBEAT_AZURE,
        streams: [
          {
            enabled: type === CLOUDBEAT_AZURE,
            data_stream: dataStream,
            vars: { ...azureVarsMock, ...vars },
          },
        ],
      },
      {
        type: CLOUDBEAT_VULN_MGMT_AWS,
        policy_template: 'vuln_mgmt',
        enabled: type === CLOUDBEAT_VULN_MGMT_AWS,
        streams: [{ enabled: type === CLOUDBEAT_VULN_MGMT_AWS, data_stream: dataStream }],
      },
    ],
  };
};

export const getPackageInfoMock = () => {
  return {
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
            input: 'cloudbeat/cis_aws',
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
            input: 'cloudbeat/cis_azure',
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
            ],
          },
        ],
      },
    ],
    format_version: '3.0.0',
    version: '1.9.0-preview109',
    name: 'cloud_security_posture',
    description: 'Identify & remediate configuration risks in your Cloud infrastructure',
    owner: {
      github: 'elastic/cloud-security-posture',
      type: 'elastic' as 'elastic' | 'partner' | 'community' | undefined,
    },
    title: 'Security Posture Management',
    latestVersion: '1.9.0',
    assets: {
      kibana: {},
    },
  };
};
