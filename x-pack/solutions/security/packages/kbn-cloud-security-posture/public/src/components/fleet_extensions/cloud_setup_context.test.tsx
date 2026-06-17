/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { CloudSetupContext, CloudSetupProvider } from './cloud_setup_context';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { createNewPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import type { CloudSetupConfig } from './types';

// Internal test mocks
const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';
const CLOUDBEAT_GCP = 'cloudbeat/cis_gcp';
const CLOUDBEAT_AZURE = 'cloudbeat/cis_azure';
const TEMPLATE_NAME = 'cspm';
const AWS_PROVIDER = 'aws';

const getMockPackageInfo = (): PackageInfo => {
  return {
    name: TEMPLATE_NAME,
    title: 'Cloud Security Posture Management',
    version: '1.5.0',
    description: 'Test package',
    type: 'integration',
    categories: [],
    requirement: { kibana: { versions: '>=8.0.0' } },
    format_version: '1.0.0',
    release: 'ga',
    owner: { github: 'elastic/security-team' },
    latestVersion: '1.5.0',
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

const getMockPolicyAWS = (): NewPackagePolicy => {
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
      getStartedPath: '/gcp/start',
    },
    azure: {
      type: CLOUDBEAT_AZURE,
      enableOrganization: true,
      getStartedPath: '/azure/start',
    },
  },
};

const mockCore = coreMock.createStart();
const mockCloud = cloudMock.createSetup();

const packageInfo = getMockPackageInfo() as PackageInfo;
const packagePolicy = getMockPolicyAWS() as NewPackagePolicy;

const TestComponent = () => {
  const context = useContext(CloudSetupContext);
  if (!context) return <div>{'No context'}</div>;
  return (
    <div>
      <span data-test-subj="integration-name">{context.config.name}</span>
      <span data-test-subj="default-provider">{context.config.defaultProvider}</span>
    </div>
  );
};

const mockProviderProps = {
  config: mockConfig,
  uiSettings: mockCore.uiSettings,
  cloud: mockCloud,
  packageInfo,
  packagePolicy,
};

describe('CloudSetupContext', () => {
  it('provides the config to children via context', async () => {
    render(
      <CloudSetupProvider {...mockProviderProps}>
        <TestComponent />
      </CloudSetupProvider>
    );
    expect(screen.getByTestId('integration-name')).toHaveTextContent('Test Integration');
    expect(screen.getByTestId('default-provider')).toHaveTextContent('aws');
  });

  it('returns undefined if used outside the provider', () => {
    render(<TestComponent />);
    expect(screen.getByText('No context')).toBeInTheDocument();
  });
});
