/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import {
  getAzureCredentialsFormOptions,
  getAzureCredentialsFormManualOptions,
  getInputVarsFields,
  getAgentlessCredentialsType,
} from './get_azure_credentials_form_options';
import { AZURE_CREDENTIALS_TYPE } from '../constants';

// Mock the utils function
jest.mock('../utils', () => ({
  getAzureCredentialsType: jest.fn(),
}));

const { getAzureCredentialsType } = jest.requireMock('../utils');

// Shared mock factories for Azure tests
const createBaseMockInput = (): NewPackagePolicyInput => ({
  type: 'cloudbeat/azure',
  enabled: true,
  streams: [
    {
      id: 'cloudbeat-azure-stream',
      enabled: true,
      data_stream: { type: 'logs', dataset: 'cloud_security_posture.findings' },
      vars: {},
    },
  ],
});

const createMockInputWithVars = (
  vars: Record<string, { value: string }>
): NewPackagePolicyInput => ({
  ...createBaseMockInput(),
  streams: [
    {
      ...createBaseMockInput().streams[0],
      vars,
    },
  ],
});

const createMockInputWithAzureCredentials = (): NewPackagePolicyInput =>
  createMockInputWithVars({
    'azure.credentials.tenant_id': { value: 'test-tenant-id' },
    'azure.credentials.client_id': { value: 'test-client-id' },
    'azure.credentials.client_secret': { value: 'test-client-secret' },
    'unknown.field': { value: 'should-be-filtered' },
  });

const getStandardAzureFields = () => ({
  'azure.credentials.tenant_id': {
    label: 'Tenant ID',
    type: 'text' as const,
    testSubj: 'azure-tenant-id',
  },
  'azure.credentials.client_id': {
    label: 'Client ID',
    type: 'text' as const,
    testSubj: 'azure-client-id',
  },
  'azure.credentials.client_secret': {
    label: 'Client Secret',
    type: 'password' as const,
    testSubj: 'azure-client-secret',
    isSecret: true,
  },
});

describe('get_azure_credentials_form_options', () => {
  describe('getAzureCredentialsFormOptions', () => {
    it('should return all Azure credential options with correct structure', () => {
      const options = getAzureCredentialsFormOptions();

      // Check that all expected credential types are present
      expect(options).toHaveProperty(AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY);
      expect(options).toHaveProperty(AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE);
      expect(options).toHaveProperty(AZURE_CREDENTIALS_TYPE.MANUAL);
      expect(options).toHaveProperty(AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET);
      expect(options).toHaveProperty(
        AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE
      );

      // Check structure of each option
      Object.values(options).forEach((option) => {
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('fields');
        expect(typeof option.label).toBe('string');
        expect(typeof option.fields).toBe('object');
      });
    });

    it('should have correct labels for credential types', () => {
      const options = getAzureCredentialsFormOptions();

      expect(options[AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY].label).toBe('Managed Identity');
      expect(options[AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE].label).toBe('ARM Template');
      expect(options[AZURE_CREDENTIALS_TYPE.MANUAL].label).toBe('Manual');
      expect(options[AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET].label).toBe(
        'Service principal with Client Secret'
      );
      expect(options[AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE].label).toBe(
        'Service principal with Client Certificate'
      );
    });

    it('should have correct fields for service principal with client secret', () => {
      const options = getAzureCredentialsFormOptions();
      const servicePrincipalFields =
        options[AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET].fields;

      // Check that required fields exist
      expect(Object.keys(servicePrincipalFields)).toContain('azure.credentials.tenant_id');
      expect(Object.keys(servicePrincipalFields)).toContain('azure.credentials.client_id');
      expect(Object.keys(servicePrincipalFields)).toContain('azure.credentials.client_secret');

      // Check that client secret is marked as secret
      expect(servicePrincipalFields['azure.credentials.client_secret'].isSecret).toBe(true);
      expect(servicePrincipalFields['azure.credentials.client_secret'].type).toBe('password');
    });
  });

  describe('getAzureCredentialsFormManualOptions', () => {
    it('should return filtered credential options for manual selection', () => {
      const manualOptions = getAzureCredentialsFormManualOptions();

      // Should not include ARM_TEMPLATE, MANUAL, or SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD
      const filteredTypes = manualOptions.map((option) => option.value);
      expect(filteredTypes).not.toContain(AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE);
      expect(filteredTypes).not.toContain(AZURE_CREDENTIALS_TYPE.MANUAL);
      expect(filteredTypes).not.toContain(
        AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD
      );

      // Should include these types
      expect(filteredTypes).toContain(AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY);
      expect(filteredTypes).toContain(AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET);
      expect(filteredTypes).toContain(
        AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE
      );
    });

    it('should return options with correct structure', () => {
      const manualOptions = getAzureCredentialsFormManualOptions();

      manualOptions.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('text');
        expect(typeof option.value).toBe('string');
        expect(typeof option.text).toBe('string');
      });
    });
  });

  describe('getInputVarsFields', () => {
    it('should map input vars to fields correctly', () => {
      const mockInput = createMockInputWithAzureCredentials();
      const fields = getStandardAzureFields();

      const result = getInputVarsFields(mockInput, fields);

      expect(result).toHaveLength(3);
      expect(result.find((field) => field.id === 'azure.credentials.tenant_id')).toEqual({
        id: 'azure.credentials.tenant_id',
        label: 'Tenant ID',
        type: 'text',
        testSubj: 'azure-tenant-id',
        value: 'test-tenant-id',
        isSecret: undefined,
      });

      expect(result.find((field) => field.id === 'azure.credentials.client_secret')).toEqual({
        id: 'azure.credentials.client_secret',
        label: 'Client Secret',
        type: 'password',
        testSubj: 'azure-client-secret',
        value: 'test-client-secret',
        isSecret: true,
      });

      // Should not include unknown fields
      expect(result.find((field) => field.id === 'unknown.field')).toBeUndefined();
    });

    it('should handle empty input vars', () => {
      const mockInput = createBaseMockInput();
      const fields = {
        'azure.credentials.tenant_id': {
          label: 'Tenant ID',
          type: 'text' as const,
        },
      };

      const result = getInputVarsFields(mockInput, fields);
      expect(result).toHaveLength(0);
    });
  });

  describe('getAgentlessCredentialsType', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return CLOUD_CONNECTORS when showCloudConnectors is true and no credentials type', () => {
      getAzureCredentialsType.mockReturnValue(null);
      const mockInput = createBaseMockInput();

      const result = getAgentlessCredentialsType(mockInput, true);
      expect(result).toBe(AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS);
    });

    it('should return CLOUD_CONNECTORS when showCloudConnectors is true and credentials type is ARM_TEMPLATE', () => {
      getAzureCredentialsType.mockReturnValue(AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE);
      const mockInput = createBaseMockInput();

      const result = getAgentlessCredentialsType(mockInput, true);
      expect(result).toBe(AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS);
    });

    it('should return SERVICE_PRINCIPAL_WITH_CLIENT_SECRET when no credentials type and showCloudConnectors is false', () => {
      getAzureCredentialsType.mockReturnValue(null);
      const mockInput = createBaseMockInput();

      const result = getAgentlessCredentialsType(mockInput, false);
      expect(result).toBe(AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET);
    });

    it('should return SERVICE_PRINCIPAL_WITH_CLIENT_SECRET when credentials type is ARM_TEMPLATE and showCloudConnectors is false', () => {
      getAzureCredentialsType.mockReturnValue(AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE);
      const mockInput = createBaseMockInput();

      const result = getAgentlessCredentialsType(mockInput, false);
      expect(result).toBe(AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET);
    });

    it('should return the existing credentials type when it exists and is not ARM_TEMPLATE', () => {
      getAzureCredentialsType.mockReturnValue(AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY);
      const mockInput = createBaseMockInput();

      const result = getAgentlessCredentialsType(mockInput, false);
      expect(result).toBe(AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY);
    });
  });
});
