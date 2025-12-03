/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { useCloudSetup } from './use_cloud_setup_context';
import { CloudSetupContext } from '../cloud_setup_context';
import { AWS_PROVIDER, GCP_PROVIDER, AZURE_PROVIDER } from '../constants';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { createNewPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import type { CloudSetupConfig } from '../types';

// Internal test mocks
const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';
const CLOUDBEAT_GCP = 'cloudbeat/cis_gcp';
const CLOUDBEAT_AZURE = 'cloudbeat/cis_azure';
const TEMPLATE_NAME = 'cspm';

const getMockPackageInfo = (): PackageInfo => {
  return {
    name: TEMPLATE_NAME,
    title: 'Cloud Security Posture Management',
    version: '3.1.0',
    description: 'Test package',
    type: 'integration',
    categories: [],
    requirement: { kibana: { versions: '>=8.0.0' } },
    format_version: '1.0.0',
    release: 'ga',
    owner: { github: 'elastic/security-team' },
    latestVersion: '3.1.0',
    assets: {},
    policy_templates: [
      {
        name: TEMPLATE_NAME,
        title: 'CSPM',
        description: 'Cloud Security Posture Management',
        inputs: [
          {
            type: CLOUDBEAT_AWS,
            title: 'AWS',
            description: 'AWS integration',
            vars: [],
          },
          {
            type: CLOUDBEAT_GCP,
            title: 'GCP',
            description: 'GCP integration',
            vars: [],
          },
          {
            type: CLOUDBEAT_AZURE,
            title: 'Azure',
            description: 'Azure integration',
            vars: [],
          },
        ],
        multiple: false,
      },
    ],
  } as unknown as PackageInfo;
};

const getMockPolicy = (): NewPackagePolicy => {
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
    credentials_file: { type: 'text' },
    credentials_json: { type: 'text' },
    project_id: { type: 'text' },
  };

  const azureVarsMock = {
    client_id: { type: 'text' },
    client_secret: { type: 'password', isSecret: true },
    tenant_id: { type: 'text' },
    subscription_id: { type: 'text' },
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
        value: TEMPLATE_NAME,
        type: 'text',
      },
      deployment: { value: AWS_PROVIDER, type: 'text' },
    },
    inputs: [
      {
        type: CLOUDBEAT_AWS,
        policy_template: TEMPLATE_NAME,
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: dataStream,
            vars: awsVarsMock,
          },
        ],
      },
      {
        type: CLOUDBEAT_GCP,
        policy_template: TEMPLATE_NAME,
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: dataStream,
            vars: gcpVarsMock,
          },
        ],
      },
      {
        type: CLOUDBEAT_AZURE,
        policy_template: TEMPLATE_NAME,
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: dataStream,
            vars: azureVarsMock,
          },
        ],
      },
    ],
  } as NewPackagePolicy;
};

const mockConfig: CloudSetupConfig = {
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
      cloudConnectorEnabledVersion: undefined,
      getStartedPath: '/gcp/start',
    },
    azure: {
      type: CLOUDBEAT_AZURE,
      enableOrganization: true,
      getStartedPath: '/azure/start',
      cloudConnectorEnabledVersion: '3.1.0',
    },
  },
};

const mockCore = coreMock.createStart();
const mockCloud = cloudMock.createSetup();
const packageInfo = getMockPackageInfo() as PackageInfo;
const packagePolicy = getMockPolicy() as NewPackagePolicy;

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <CloudSetupContext.Provider
    value={{
      config: mockConfig,
      uiSettings: mockCore.uiSettings,
      cloud: mockCloud,
      packageInfo,
      packagePolicy,
    }}
  >
    {children}
  </CloudSetupContext.Provider>
);

describe('useCloudSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCloud.cloudId =
      'my-deployment:ZXhhbXBsZS5jbG91ZC5lbGFzdGljLmNvJGRlZmF1bHQkY2liYW5hLWNvbXBvbmVudC1pZCRvdGhlcg==';
  });

  it('throws if used outside provider', () => {
    expect(() => renderHook(() => useCloudSetup())).toThrow(
      'useCloudSetup must be used within a CloudSetupProvider'
    );
  });

  it('returns correct defaultProvider and templateName', () => {
    const { result } = renderHook(() => useCloudSetup(), { wrapper });
    expect(result.current.defaultProvider).toBe(AWS_PROVIDER);
    expect(result.current.templateName).toBe('cspm');
  });

  it('returns correct awsPolicyType and awsOverviewPath', () => {
    const { result } = renderHook(() => useCloudSetup(), { wrapper });
    expect(result.current.awsPolicyType).toBe('cloudbeat/cis_aws');
    expect(result.current.awsOverviewPath).toBe('/aws/start');
  });

  it('returns correct azurePolicyType and azureOverviewPath', () => {
    const { result } = renderHook(() => useCloudSetup(), { wrapper });
    expect(result.current.azurePolicyType).toBe('cloudbeat/cis_azure');
    expect(result.current.azureOverviewPath).toBe('/azure/start');
  });

  it('returns correct gcpPolicyType and gcpOverviewPath', () => {
    const { result } = renderHook(() => useCloudSetup(), { wrapper });
    expect(result.current.gcpPolicyType).toBe('cloudbeat/cis_gcp');
    expect(result.current.gcpOverviewPath).toBe('/gcp/start');
  });

  it('getCloudSetupProviderByInputType returns correct provider', () => {
    const { result } = renderHook(() => useCloudSetup(), { wrapper });
    expect(result.current.getCloudSetupProviderByInputType('cloudbeat/cis_aws')).toBe(AWS_PROVIDER);
    expect(result.current.getCloudSetupProviderByInputType('cloudbeat/cis_gcp')).toBe(GCP_PROVIDER);
    expect(result.current.getCloudSetupProviderByInputType('cloudbeat/cis_azure')).toBe(
      AZURE_PROVIDER
    );
  });

  it('getCloudSetupProviderByInputType throws on unknown input', () => {
    const { result } = renderHook(() => useCloudSetup(), { wrapper });
    expect(() => result.current.getCloudSetupProviderByInputType('unknown')).toThrow(
      'Unknown cloud setup provider for input type: unknown'
    );
  });

  it('templateInputOptions returns correct options', () => {
    const { result } = renderHook(() => useCloudSetup(), { wrapper });
    const options = result.current.templateInputOptions;
    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: AWS_PROVIDER }),
        expect.objectContaining({ value: GCP_PROVIDER }),
        expect.objectContaining({ value: AZURE_PROVIDER }),
      ])
    );
  });

  describe('Cloud Connector Enablement', () => {
    const mockConfigWithCloudConnectors: CloudSetupConfig = {
      ...mockConfig,
      providers: {
        aws: {
          ...mockConfig.providers.aws,
          cloudConnectorEnabledVersion: '1.0.0',
        },
        gcp: {
          ...mockConfig.providers.gcp,
          cloudConnectorEnabledVersion: undefined, // cloud connector that supported
        },
        azure: {
          ...mockConfig.providers.azure,
          cloudConnectorEnabledVersion: '1.0.0',
        },
      },
    };

    beforeEach(() => {
      // Enable cloud connectors feature
      mockCore.uiSettings.get.mockReturnValue(true);
    });

    it('disables all cloud connectors when feature flag is off', () => {
      mockCore.uiSettings.get.mockReturnValue(false);
      mockCloud.cloudHost = 'us-east-1.aws.elastic-cloud.com';

      const customWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
        <CloudSetupContext.Provider
          value={{
            config: mockConfigWithCloudConnectors,
            uiSettings: mockCore.uiSettings,
            cloud: mockCloud,
            packageInfo,
            packagePolicy,
          }}
        >
          {children}
        </CloudSetupContext.Provider>
      );

      const { result } = renderHook(() => useCloudSetup(), { wrapper: customWrapper });
      expect(result.current.isAwsCloudConnectorEnabled).toBe(false);
      expect(result.current.isGcpCloudConnectorEnabled).toBe(false);
      expect(result.current.isAzureCloudConnectorEnabled).toBe(false);
    });

    it(' enables AWS cloud connector on GCP host', () => {
      mockCloud.cloudHost = 'us-central1.gcp.elastic-cloud.com';
      const customWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
        <CloudSetupContext.Provider
          value={{
            config: mockConfigWithCloudConnectors,
            uiSettings: mockCore.uiSettings,
            cloud: mockCloud,
            packageInfo,
            packagePolicy,
          }}
        >
          {children}
        </CloudSetupContext.Provider>
      );

      const { result } = renderHook(() => useCloudSetup(), { wrapper: customWrapper });
      expect(result.current.isAwsCloudConnectorEnabled).toBe(true);
    });

    it(' enables AWS cloud connector on AWS host', () => {
      mockCloud.cloudHost = 'us-central1.gcp.elastic-cloud.com';
      const customWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
        <CloudSetupContext.Provider
          value={{
            config: mockConfigWithCloudConnectors,
            uiSettings: mockCore.uiSettings,
            cloud: mockCloud,
            packageInfo,
            packagePolicy,
          }}
        >
          {children}
        </CloudSetupContext.Provider>
      );

      const { result } = renderHook(() => useCloudSetup(), { wrapper: customWrapper });
      expect(result.current.isAwsCloudConnectorEnabled).toBe(true);
    });

    it(' enables AWS cloud connector on Azure host', () => {
      mockCloud.cloudHost = 'westeurope.azure.elastic-cloud.com';
      const customWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
        <CloudSetupContext.Provider
          value={{
            config: mockConfigWithCloudConnectors,
            uiSettings: mockCore.uiSettings,
            cloud: mockCloud,
            packageInfo,
            packagePolicy,
          }}
        >
          {children}
        </CloudSetupContext.Provider>
      );

      const { result } = renderHook(() => useCloudSetup(), { wrapper: customWrapper });
      expect(result.current.isAwsCloudConnectorEnabled).toBe(true);
    });

    it('disables GCP cloud connector (not enabled yet) on any host', () => {
      const customWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
        <CloudSetupContext.Provider
          value={{
            config: mockConfigWithCloudConnectors,
            uiSettings: mockCore.uiSettings,
            cloud: mockCloud,
            packageInfo,
            packagePolicy,
          }}
        >
          {children}
        </CloudSetupContext.Provider>
      );

      const { result } = renderHook(() => useCloudSetup(), { wrapper: customWrapper });
      expect(result.current.isGcpCloudConnectorEnabled).toBe(false);
    });
    it('enables Azure cloud connector on GCP host', () => {
      mockCloud.cloudHost = 'us-central1.gcp.elastic-cloud.com';
      const customWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
        <CloudSetupContext.Provider
          value={{
            config: mockConfigWithCloudConnectors,
            uiSettings: mockCore.uiSettings,
            cloud: mockCloud,
            packageInfo,
            packagePolicy,
          }}
        >
          {children}
        </CloudSetupContext.Provider>
      );

      const { result } = renderHook(() => useCloudSetup(), { wrapper: customWrapper });
      expect(result.current.isAzureCloudConnectorEnabled).toBe(true);
    });

    it('enables Azure cloud connector on Azure host', () => {
      mockCloud.cloudHost = 'westeurope.azure.elastic-cloud.com';
      const customWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
        <CloudSetupContext.Provider
          value={{
            config: mockConfigWithCloudConnectors,
            uiSettings: mockCore.uiSettings,
            cloud: mockCloud,
            packageInfo,
            packagePolicy,
          }}
        >
          {children}
        </CloudSetupContext.Provider>
      );

      const { result } = renderHook(() => useCloudSetup(), { wrapper: customWrapper });
      expect(result.current.isAzureCloudConnectorEnabled).toBe(true);
    });

    it('enables Azure cloud connector on AWS host', () => {
      mockCloud.cloudHost = 'us-east-1.aws.elastic-cloud.com';
      const customWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
        <CloudSetupContext.Provider
          value={{
            config: mockConfigWithCloudConnectors,
            uiSettings: mockCore.uiSettings,
            cloud: mockCloud,
            packageInfo,
            packagePolicy,
          }}
        >
          {children}
        </CloudSetupContext.Provider>
      );

      const { result } = renderHook(() => useCloudSetup(), { wrapper: customWrapper });
      expect(result.current.isAzureCloudConnectorEnabled).toBe(true);
    });
  });
});
