/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PackageInfo } from '@kbn/fleet-plugin/common';

/**
 * Shared mock utilities for fleet_extensions tests
 * This file provides reusable mocks to avoid duplication across test files
 */

/**
 * Creates a minimal PackageInfo mock with only essential properties
 */
export const createMockPackageInfo = (overrides: Partial<PackageInfo> = {}): PackageInfo =>
  ({
    name: 'cloud_security_posture',
    version: '1.0.0',
    title: 'Cloud Security Posture',
    policy_templates: [],
    owner: { github: 'elastic' },
    description: 'Test package for cloud security posture',
    status: 'installed',
    ...overrides,
  } as unknown as PackageInfo);

/**
 * Mock for LazyPackagePolicyInputVarField component
 */
export const createMockLazyPackagePolicyInputVarField = () =>
  jest.fn(({ value, onChange, varDef, errors, forceShowErrors }) => (
    <div data-test-subj="lazy-package-policy-input-var-field">
      <input
        data-test-subj={`secret-field-${varDef.name}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Secret field for ${varDef.name}`}
        aria-invalid={forceShowErrors && errors.length > 0}
      />
      {forceShowErrors && errors.length > 0 && <div data-test-subj="field-error">{errors[0]}</div>}
    </div>
  ));

/**
 * Mock for Fleet plugin utilities
 */
export const createFleetPluginMocks = () => ({
  LazyPackagePolicyInputVarField: createMockLazyPackagePolicyInputVarField(),
});

/**
 * Mock for utils functions
 */
export const createUtilsMocks = () => ({
  fieldIsInvalid: jest.fn((value, hasInvalidRequiredVars) => !value && hasInvalidRequiredVars),
  findVariableDef: jest.fn((packageInfo, fieldId) => ({
    name: fieldId,
    type: 'text',
    title: `Variable ${fieldId}`,
    description: `Description for ${fieldId}`,
  })),
  getAzureCredentialsType: jest.fn(),
  getAwsCredentialsType: jest.fn(),
  getGcpCredentialsType: jest.fn(),
});

/**
 * Mock for cloud setup context
 */
export const createCloudSetupContextMock = (overrides: Record<string, unknown> = {}) => ({
  useCloudSetup: jest.fn(() => ({
    shortName: 'CSPM',
    azurePolicyType: 'cloudbeat/cis_azure',
    azureEnabled: true,
    azureManualFieldsEnabled: true,
    awsPolicyType: 'cloudbeat/cis_aws',
    awsEnabled: true,
    awsManualFieldsEnabled: true,
    gcpPolicyType: 'cloudbeat/cis_gcp',
    gcpEnabled: true,
    gcpManualFieldsEnabled: true,
    ...overrides,
  })),
});

/**
 * Common test field types for credentials forms
 */
export const createMockCredentialFields = () => ({
  azure: {
    text: {
      id: 'azure.credentials.tenant_id',
      label: 'Tenant ID',
      type: 'text' as const,
      value: 'test-tenant-id',
      testSubj: 'azure-tenant-id-field',
      isSecret: false,
    },
    secret: {
      id: 'azure.credentials.client_secret',
      label: 'Client Secret',
      type: 'password' as const,
      value: 'test-secret',
      testSubj: 'azure-client-secret-field',
      isSecret: true,
    },
  },
  aws: {
    text: {
      id: 'aws.credentials.access_key_id',
      label: 'Access Key ID',
      type: 'text' as const,
      value: 'test-access-key',
      testSubj: 'aws-access-key-field',
      isSecret: false,
    },
    secret: {
      id: 'aws.credentials.secret_access_key',
      label: 'Secret Access Key',
      type: 'password' as const,
      value: 'test-secret-key',
      testSubj: 'aws-secret-key-field',
      isSecret: true,
    },
  },
  gcp: {
    text: {
      id: 'gcp.credentials.project_id',
      label: 'Project ID',
      type: 'text' as const,
      value: 'test-project-id',
      testSubj: 'gcp-project-id-field',
      isSecret: false,
    },
    secret: {
      id: 'gcp.credentials.credentials_json',
      label: 'Credentials JSON',
      type: 'password' as const,
      value: 'test-credentials-json',
      testSubj: 'gcp-credentials-json-field',
      isSecret: true,
    },
  },
});

/**
 * Mock for NewPackagePolicyInput
 */
export const createMockInput = (
  provider: 'azure' | 'aws' | 'gcp',
  vars: Record<string, unknown> = {}
) => ({
  type: `cloudbeat/${provider}`,
  enabled: true,
  streams: [
    {
      id: `cloudbeat-${provider}-stream`,
      enabled: true,
      data_stream: { type: 'logs', dataset: 'cloud_security_posture.findings' },
      vars,
    },
  ],
});

/**
 * Sets up common jest mocks for fleet extensions tests
 */
export const setupFleetExtensionsMocks = () => {
  // Mock Fleet plugin
  jest.mock('@kbn/fleet-plugin/public', () => ({
    LazyPackagePolicyInputVarField: createMockLazyPackagePolicyInputVarField(),
  }));

  // Mock utils
  jest.mock('../utils', () => createUtilsMocks());

  // Mock cloud setup context
  jest.mock('../hooks/use_cloud_setup_context', () => createCloudSetupContextMock());
};

/**
 * Test helper to get mocked functions
 */
export const getMockedFunctions = () => {
  const fleetMocks = jest.requireMock('@kbn/fleet-plugin/public');
  const utilsMocks = jest.requireMock('../utils');
  const contextMocks = jest.requireMock('../hooks/use_cloud_setup_context');

  return {
    LazyPackagePolicyInputVarField: fleetMocks.LazyPackagePolicyInputVarField,
    fieldIsInvalid: utilsMocks.fieldIsInvalid,
    findVariableDef: utilsMocks.findVariableDef,
    getAzureCredentialsType: utilsMocks.getAzureCredentialsType,
    getAwsCredentialsType: utilsMocks.getAwsCredentialsType,
    getGcpCredentialsType: utilsMocks.getGcpCredentialsType,
    useCloudSetup: contextMocks.useCloudSetup,
  };
};

/**
 * Common test scenarios for credential field validation
 */
export const createValidationTestScenarios = () => ({
  valid: {
    hasInvalidRequiredVars: false,
    expectedErrorCount: 0,
    description: 'should not show errors when validation passes',
  },
  invalid: {
    hasInvalidRequiredVars: true,
    expectedErrorCount: 1,
    description: 'should show errors when validation fails',
  },
  empty: {
    value: '',
    hasInvalidRequiredVars: true,
    expectedErrorCount: 1,
    description: 'should show errors for empty required fields',
  },
});

/**
 * Helper to create consistent test descriptions
 */
export const createTestDescription = (component: string, action: string, condition?: string) => {
  const base = `${component} ${action}`;
  return condition ? `${base} ${condition}` : base;
};
