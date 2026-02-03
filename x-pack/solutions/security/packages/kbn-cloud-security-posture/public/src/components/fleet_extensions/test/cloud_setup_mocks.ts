/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetupContextValue } from '../hooks/use_cloud_setup_context';
import type { CloudSetupConfig } from '../types';

/**
 * Creates a mock CloudSetupContextValue with all required properties.
 * This replaces the duplicated mock objects across AWS, Azure, and GCP test files.
 *
 * @param overrides - Partial CloudSetupContextValue to override defaults
 * @returns Complete CloudSetupContextValue mock
 */
export const createCloudSetupMock = (
  overrides: Partial<CloudSetupContextValue> = {}
): CloudSetupContextValue => {
  const defaultMock: CloudSetupContextValue = {
    // AWS related properties
    awsPolicyType: 'cloudbeat/cis_aws',
    awsInputFieldMapping: {},
    isAwsCloudConnectorEnabled: false,
    awsOrganizationEnabled: false,
    awsOverviewPath: '/get-started/aws',

    // Azure related properties
    azureEnabled: false,
    isAzureCloudConnectorEnabled: false,
    azureOrganizationEnabled: false,
    azurePolicyType: 'cloudbeat/cis_azure',
    azureOverviewPath: '/get-started/azure',

    // GCP related properties
    gcpEnabled: false,
    isGcpCloudConnectorEnabled: false,
    gcpOrganizationEnabled: false,
    gcpPolicyType: 'cloudbeat/cis_gcp',
    gcpOverviewPath: '/get-started/gcp',

    // Common properties
    shortName: 'CSPM',
    templateName: 'cspm',
    config: {} as CloudSetupConfig,
    showCloudTemplates: true,
    defaultProvider: 'aws',
    defaultProviderType: 'aws',
    templateInputOptions: [],

    // Function mocks
    getCloudSetupProviderByInputType: jest.fn(),
  };

  return {
    ...defaultMock,
    ...overrides,
  };
};

/**
 * Creates a mock specifically for AWS provider tests
 */
export const createAwsCloudSetupMock = (overrides: Partial<CloudSetupContextValue> = {}) => {
  return createCloudSetupMock({
    isAwsCloudConnectorEnabled: true,
    awsOrganizationEnabled: true,
    ...overrides,
  });
};

/**
 * Creates a mock specifically for Azure provider tests
 */
export const createAzureCloudSetupMock = (overrides: Partial<CloudSetupContextValue> = {}) => {
  return createCloudSetupMock({
    azureEnabled: true,
    isAzureCloudConnectorEnabled: true,
    azureOrganizationEnabled: true,
    defaultProvider: 'azure',
    defaultProviderType: 'azure',
    ...overrides,
  });
};

/**
 * Creates a mock specifically for GCP provider tests
 */
export const createGcpCloudSetupMock = (overrides: Partial<CloudSetupContextValue> = {}) => {
  return createCloudSetupMock({
    gcpEnabled: true,
    isGcpCloudConnectorEnabled: true,
    gcpOrganizationEnabled: true,
    defaultProvider: 'gcp',
    defaultProviderType: 'gcp',
    ...overrides,
  });
};

/**
 * Creates a common test props object for credentials form components
 */
export interface CredentialsFormTestProps {
  disabled?: boolean;
  hasInvalidRequiredVars?: boolean;
  isValid?: boolean;
}

export const createDefaultCredentialsFormProps = (
  overrides: CredentialsFormTestProps = {}
): Required<CredentialsFormTestProps> => ({
  disabled: false,
  hasInvalidRequiredVars: false,
  isValid: true,
  ...overrides,
});
