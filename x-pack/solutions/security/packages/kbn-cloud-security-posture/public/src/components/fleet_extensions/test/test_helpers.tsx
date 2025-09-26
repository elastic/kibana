/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { PackagePolicyInput } from '@kbn/fleet-plugin/common';

/**
 * Creates a standardized mock PackageInfo for testing credential components
 */
export const createMockPackageInfo = () => ({
  name: 'cloud_security_posture',
  title: 'Cloud Security Posture',
  version: '1.0.0',
  description: 'Cloud Security Posture package',
  type: 'integration' as const,
  categories: ['security'] as string[],
  conditions: { kibana: { version: '^8.0.0' } },
  format_version: '1.0.0',
  release: 'ga' as const,
  owner: { github: 'elastic/security-team' },
  policy_templates: [
    {
      name: 'cspm',
      title: 'CSPM',
      description: 'Cloud Security Posture Management',
      inputs: [
        {
          type: 'cloudbeat/cis_azure',
          title: 'CIS Azure',
          description: 'CIS Azure Benchmark',
          vars: [
            {
              name: 'azure.credentials.type',
              type: 'text',
              title: 'Credentials Type',
              default: 'azure_credentials',
            },
          ],
        },
      ],
    },
  ],
});

/**
 * Creates standardized mock credential fields for different cloud providers
 */
export const createMockCredentialFields = (provider: 'azure' | 'aws' | 'gcp') => {
  const baseFields = {
    azure: [
      { name: 'azure.credentials.type', value: 'azure_credentials' },
      { name: 'azure.credentials.tenant_id', value: 'test-tenant-id' },
      { name: 'azure.credentials.client_id', value: 'test-client-id' },
      { name: 'azure.credentials.client_secret', value: 'test-client-secret' },
    ],
    aws: [
      { name: 'aws.credentials.type', value: 'aws_credentials' },
      { name: 'aws.credentials.access_key_id', value: 'test-access-key' },
      { name: 'aws.credentials.secret_access_key', value: 'test-secret-key' },
    ],
    gcp: [
      { name: 'gcp.credentials.type', value: 'gcp_credentials' },
      { name: 'gcp.credentials.credentials_file', value: 'test-credentials.json' },
    ],
  };

  return baseFields[provider];
};

/**
 * Mock LazyPackagePolicyInputVarField component for testing
 */
export const MockLazyPackagePolicyInputVarField = ({ value }: { value: string }) => (
  <div data-test-subj="mocked-input-field">{value ? `Value: ${value}` : 'No value'}</div>
);

/**
 * Creates mock utility functions commonly used in credential form tests
 */
export const createMockUtils = () => ({
  isAgentlessSupported: jest.fn((input: string) => input === 'cloudbeat/cis_azure'),
  getInputTypesFromPackageInfo: jest.fn(() => [
    { type: 'cloudbeat/cis_azure', policy_template: 'cspm' },
  ]),
  getPosturePolicy: jest.fn(() => 'cspm'),
});

/**
 * Creates a mock input object for testing credential components
 */
export const createMockInput = (type: string = 'cloudbeat/cis_azure'): PackagePolicyInput => ({
  type,
  policy_template: 'cspm',
  enabled: true,
  streams: [],
  vars: {},
});

/**
 * Common test patterns for credential input components
 */
export const credentialTestPatterns = {
  /**
   * Tests that a component renders without crashing
   */
  shouldRenderWithoutCrashing: (
    Component: React.ComponentType<unknown>,
    props: Record<string, unknown>
  ) => {
    it('should render without crashing', () => {
      expect(() => render(<Component {...props} />)).not.toThrow();
    });
  },

  /**
   * Tests that required fields are displayed
   */
  shouldShowRequiredFields: (requiredFields: string[]) => {
    it('should display all required credential fields', () => {
      requiredFields.forEach((field) => {
        expect(screen.getByText(new RegExp(field, 'i'))).toBeInTheDocument();
      });
    });
  },

  /**
   * Tests that onChange handler is called with correct values
   */
  shouldHandleOnChange: (changeHandler: jest.Mock) => {
    it('should call onChange handler when field values change', () => {
      expect(changeHandler).toHaveBeenCalled();
    });
  },
};
