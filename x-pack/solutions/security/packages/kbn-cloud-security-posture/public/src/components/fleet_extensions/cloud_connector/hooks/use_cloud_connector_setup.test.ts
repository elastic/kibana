/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useCloudConnectorSetup } from './use_cloud_connector_setup';

import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import type { UpdatePolicy } from '../../types';
import type { CloudConnectorCredentials } from '../types';

// Mock utility functions
jest.mock('../utils', () => ({
  updateInputVarsWithCredentials: jest.fn(),
  updatePolicyInputs: jest.fn(),
  isAzureCloudConnectorVars: jest.fn(),
}));

import {
  updateInputVarsWithCredentials,
  updatePolicyInputs,
  isAzureCloudConnectorVars,
} from '../utils';

const mockIsAzureCloudConnectorVars = isAzureCloudConnectorVars as jest.MockedFunction<
  typeof isAzureCloudConnectorVars
>;

describe('useCloudConnectorSetup', () => {
  const mockPolicy = {
    id: 'test-policy-id',
    enabled: true,
    policy_id: 'test-policy',
    policy_ids: ['test-policy'],
    name: 'test-policy',
    namespace: 'default',
    package: {
      name: 'cloud_security_posture',
      title: 'Cloud Security Posture',
      version: '1.0.0',
    },
    supports_cloud_connector: true,
    inputs: [
      {
        type: 'cloudbeat/cis_aws',
        policy_template: 'cis_aws',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole' },
              external_id: { value: 'test-external-id' },
            },
          },
        ],
      },
    ],
  } as NewPackagePolicy;

  const mockInput = {
    type: 'cloudbeat/cis_aws',
    policy_template: 'cis_aws',
    enabled: true,
    streams: [
      {
        enabled: true,
        data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
        vars: {
          role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole' },
          external_id: { value: 'test-external-id' },
        },
      },
    ],
  } as NewPackagePolicyInput;

  const mockUpdatePolicy: UpdatePolicy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks to simulate real behavior
    (updateInputVarsWithCredentials as jest.Mock).mockImplementation((inputVars, credentials) => {
      if (!inputVars || !credentials) return inputVars;

      const updatedVars = { ...inputVars };

      return updatedVars;
    });

    (updatePolicyInputs as jest.Mock).mockImplementation((policy, vars) => {
      return {
        ...mockPolicy,
        inputs: mockPolicy.inputs.map((input) => ({
          ...input,
          streams: input.streams.map((stream) => ({
            ...stream,
            vars: { ...stream.vars, ...vars },
          })),
        })),
      };
    });
  });

  describe('updatePolicyWithNewCredentials', () => {
    it('should call utility functions and update policy with new credentials and validation', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
      );

      const newCredentials: CloudConnectorCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/NewRole',
        externalId: 'new-external-id',
      };

      act(() => {
        result.current.updatePolicyWithNewCredentials(newCredentials);
      });

      expect(updateInputVarsWithCredentials).toHaveBeenCalledWith(
        mockInput.streams[0].vars,
        newCredentials
      );
      expect(updatePolicyInputs).toHaveBeenCalled();
      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        isValid: expect.any(Boolean),
        updatedPolicy: expect.objectContaining({
          cloud_connector_id: undefined,
        }),
      });
    });
  });

  describe('updatePolicyWithExistingCredentials', () => {
    it('should call utility functions and update policy with existing credentials without validation', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
      );

      const existingCredentials: CloudConnectorCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/ExistingRole',
        externalId: 'existing-external-id',
        cloudConnectorId: 'existing-connector-123',
      };

      act(() => {
        result.current.updatePolicyWithExistingCredentials(existingCredentials);
      });

      expect(updateInputVarsWithCredentials).toHaveBeenCalledWith(
        mockInput.streams[0].vars,
        existingCredentials
      );
      expect(updatePolicyInputs).toHaveBeenCalled();
      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          cloud_connector_id: 'existing-connector-123',
        }),
        // No isValid property - existing credentials don't need validation
      });
    });

    it('should work with incomplete existing credentials without validation', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
      );

      const incompleteExistingCredentials: CloudConnectorCredentials = {
        roleArn: undefined,
        externalId: undefined,
        cloudConnectorId: 'existing-connector-123',
      };

      act(() => {
        result.current.updatePolicyWithExistingCredentials(incompleteExistingCredentials);
      });

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          cloud_connector_id: 'existing-connector-123',
        }),
        // No validation for existing credentials - just updates the policy
      });
    });
  });

  describe('AWS credential state management', () => {
    it('should initialize with empty credentials when the input has no var values', () => {
      const emptyMockPolicy = {
        ...mockPolicy,
        inputs: [
          {
            ...mockInput,
            streams: [
              {
                ...mockInput.streams[0],
                vars: {
                  role_arn: { value: undefined },
                  external_id: { value: undefined },
                },
              },
            ],
          },
        ],
      } as NewPackagePolicy;

      const emptyMockInput = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              role_arn: { value: undefined },
              external_id: { value: undefined },
            },
          },
        ],
      } as NewPackagePolicyInput;

      const { result } = renderHook(() =>
        useCloudConnectorSetup(emptyMockInput, emptyMockPolicy, mockUpdatePolicy)
      );

      expect(result.current.newConnectionCredentials).toEqual({
        roleArn: undefined,
        externalId: undefined,
      });

      expect(result.current.existingConnectionCredentials).toEqual({
        roleArn: undefined,
        externalId: undefined,
        cloudConnectorId: undefined,
      });
    });

    it('should initialize with credentials from input vars when available', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
      );

      expect(result.current.newConnectionCredentials).toEqual({
        roleArn: 'arn:aws:iam::123456789012:role/TestRole',
        externalId: 'test-external-id',
      });

      expect(result.current.existingConnectionCredentials).toEqual({
        roleArn: undefined,
        externalId: undefined,
        cloudConnectorId: undefined,
      });
    });

    it('should update new connection credentials when updatePolicyWithNewCredentials is called', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
      );

      const newCredentials: CloudConnectorCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/NewRole',
        externalId: 'new-external-id',
      };

      act(() => {
        result.current.updatePolicyWithNewCredentials(newCredentials);
      });

      expect(result.current.newConnectionCredentials).toEqual(newCredentials);
    });

    it('should update existing connection credentials when updatePolicyWithExistingCredentials is called', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
      );

      const existingCredentials: CloudConnectorCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/ExistingRole',
        externalId: 'existing-external-id',
        cloudConnectorId: 'existing-connector-123',
      };

      act(() => {
        result.current.updatePolicyWithExistingCredentials(existingCredentials);
      });

      expect(result.current.existingConnectionCredentials).toEqual(existingCredentials);
    });

    it('should provide setters for direct credential updates', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
      );

      const directCredentials: CloudConnectorCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/DirectRole',
        externalId: 'direct-external-id',
      };

      act(() => {
        result.current.setNewConnectionCredentials(directCredentials);
      });

      expect(result.current.newConnectionCredentials).toEqual(directCredentials);

      const directExistingCredentials: CloudConnectorCredentials = {
        roleArn: 'arn:aws:iam::123456789012:role/DirectExistingRole',
        externalId: 'direct-existing-external-id',
        cloudConnectorId: 'direct-existing-connector-456',
      };

      act(() => {
        result.current.setExistingConnectionCredentials(directExistingCredentials);
      });

      expect(result.current.existingConnectionCredentials).toEqual(directExistingCredentials);
    });
  });

  describe('Azure credential state management', () => {
    const mockAzurePolicy = {
      ...mockPolicy,
      inputs: [
        {
          type: 'cloudbeat/cis_azure',
          policy_template: 'cis_azure',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'azure.activitylogs' },
              vars: {
                tenant_id: { value: 'test-tenant-id', type: 'text' },
                client_id: { value: 'test-client-id', type: 'text' },
                azure_credentials_cloud_connector_id: {
                  value: 'test-azure-connector',
                  type: 'text',
                },
              },
            },
          ],
        },
      ],
    } as NewPackagePolicy;

    const mockAzureInput = {
      type: 'cloudbeat/cis_azure',
      policy_template: 'cis_azure',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'azure.activitylogs' },
          vars: {
            tenant_id: { value: 'test-tenant-id', type: 'text' },
            client_id: { value: 'test-client-id', type: 'text' },
            azure_credentials_cloud_connector_id: { value: 'test-azure-connector', type: 'text' },
          },
        },
      ],
    } as NewPackagePolicyInput;

    beforeEach(() => {
      // Mock isAzureCloudConnectorVars to return true for Azure tests
      mockIsAzureCloudConnectorVars.mockReturnValue(true);
    });

    it('should initialize with Azure credentials from input vars when available', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
      );

      expect(result.current.newConnectionCredentials).toEqual({
        tenantId: 'test-tenant-id',
        clientId: 'test-client-id',
        azure_credentials_cloud_connector_id: 'test-azure-connector',
      });
    });

    it('should initialize with empty Azure credentials when input vars are empty', () => {
      const emptyAzureMockInput = {
        ...mockAzureInput,
        streams: [
          {
            ...mockAzureInput.streams[0],
            vars: {
              tenant_id: { value: undefined, type: 'text' },
              client_id: { value: undefined, type: 'text' },
            },
          },
        ],
      } as NewPackagePolicyInput;

      const emptyAzureMockPolicy = {
        ...mockAzurePolicy,
        inputs: [
          {
            ...mockAzureInput,
            streams: [
              {
                ...mockAzureInput.streams[0],
                vars: {
                  tenant_id: { value: undefined, type: 'text' },
                  client_id: { value: undefined, type: 'text' },
                },
              },
            ],
          },
        ],
      } as NewPackagePolicy;

      const { result } = renderHook(() =>
        useCloudConnectorSetup(emptyAzureMockInput, emptyAzureMockPolicy, mockUpdatePolicy)
      );

      expect(result.current.newConnectionCredentials).toEqual({
        tenantId: undefined,
        clientId: undefined,
        azure_credentials_cloud_connector_id: undefined,
      });
    });

    it('should update new connection Azure credentials when updatePolicyWithNewCredentials is called', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
      );

      const newAzureCredentials = {
        tenantId: 'new-tenant-id',
        clientId: 'new-client-id',
      };

      act(() => {
        result.current.updatePolicyWithNewCredentials(newAzureCredentials);
      });

      expect(result.current.newConnectionCredentials).toEqual(newAzureCredentials);
    });

    it('should update existing connection Azure credentials when updatePolicyWithExistingCredentials is called', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
      );

      const existingAzureCredentials = {
        tenantId: 'existing-tenant-id',
        clientId: 'existing-client-id',
        azure_credentials_cloud_connector_id: 'existing-azure-connector-123',
        cloudConnectorId: 'existing-azure-connector-123',
      };

      act(() => {
        result.current.updatePolicyWithExistingCredentials(existingAzureCredentials);
      });

      expect(result.current.existingConnectionCredentials).toEqual(existingAzureCredentials);
    });

    it('should handle azure.credentials.tenant_id and azure.credentials.client_id format', () => {
      const newFormatAzureInput = {
        ...mockAzureInput,
        streams: [
          {
            ...mockAzureInput.streams[0],
            vars: {
              'azure.credentials.tenant_id': { value: 'new-format-tenant', type: 'text' },
              'azure.credentials.client_id': { value: 'new-format-client', type: 'text' },
            },
          },
        ],
      } as NewPackagePolicyInput;

      const newFormatAzurePolicy = {
        ...mockAzurePolicy,
        inputs: [
          {
            ...mockAzureInput,
            streams: [
              {
                ...mockAzureInput.streams[0],
                vars: {
                  'azure.credentials.tenant_id': { value: 'new-format-tenant', type: 'text' },
                  'azure.credentials.client_id': { value: 'new-format-client', type: 'text' },
                },
              },
            ],
          },
        ],
      } as NewPackagePolicy;

      const { result } = renderHook(() =>
        useCloudConnectorSetup(newFormatAzureInput, newFormatAzurePolicy, mockUpdatePolicy)
      );

      expect(result.current.newConnectionCredentials).toEqual({
        tenantId: 'new-format-tenant',
        clientId: 'new-format-client',
        azure_credentials_cloud_connector_id: undefined,
      });
    });
  });

  describe('Azure updatePolicy validation', () => {
    const mockAzureInput = {
      type: 'cloudbeat/cis_azure',
      policy_template: 'cis_azure',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'azure.activitylogs' },
          vars: {
            tenant_id: { value: 'initial-tenant', type: 'text' },
            client_id: { value: 'initial-client', type: 'text' },
          },
        },
      ],
    } as NewPackagePolicyInput;

    const mockAzurePolicy = {
      ...mockPolicy,
      inputs: [mockAzureInput],
    } as NewPackagePolicy;

    beforeEach(() => {
      mockIsAzureCloudConnectorVars.mockReturnValue(true);
    });

    it('should call updatePolicy with Azure credentials for new connection', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
      );

      const newAzureCredentials = {
        tenantId: 'updated-tenant-id',
        clientId: 'updated-client-id',
      };

      act(() => {
        result.current.updatePolicyWithNewCredentials(newAzureCredentials);
      });

      expect(updateInputVarsWithCredentials).toHaveBeenCalledWith(
        mockAzureInput.streams[0].vars,
        newAzureCredentials
      );
      expect(updatePolicyInputs).toHaveBeenCalled();
      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        isValid: expect.any(Boolean),
        updatedPolicy: expect.objectContaining({
          cloud_connector_id: undefined,
        }),
      });
    });

    it('should call updatePolicy with Azure cloud_connector_id for existing connection', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
      );

      const existingAzureCredentials = {
        tenantId: 'existing-tenant-id',
        clientId: 'existing-client-id',
        azure_credentials_cloud_connector_id: 'azure-connector-456',
        cloudConnectorId: 'azure-connector-456',
      };

      act(() => {
        result.current.updatePolicyWithExistingCredentials(existingAzureCredentials);
      });

      expect(updateInputVarsWithCredentials).toHaveBeenCalledWith(
        mockAzureInput.streams[0].vars,
        existingAzureCredentials
      );
      expect(updatePolicyInputs).toHaveBeenCalled();
      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          cloud_connector_id: 'azure-connector-456',
        }),
      });
    });

    it('should handle Azure credentials without cloud_connector_id', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
      );

      const azureCredentialsWithoutConnector = {
        tenantId: 'tenant-without-connector',
        clientId: 'client-without-connector',
      };

      act(() => {
        result.current.updatePolicyWithNewCredentials(azureCredentialsWithoutConnector);
      });

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        isValid: expect.any(Boolean),
        updatedPolicy: expect.objectContaining({
          cloud_connector_id: undefined,
        }),
      });
    });

    it('should update Azure credentials using setter methods', () => {
      const { result } = renderHook(() =>
        useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
      );

      const directAzureCredentials = {
        tenantId: 'direct-tenant-id',
        clientId: 'direct-client-id',
        azure_credentials_cloud_connector_id: 'direct-connector',
      };

      act(() => {
        result.current.setNewConnectionCredentials(directAzureCredentials);
      });

      expect(result.current.newConnectionCredentials).toEqual(directAzureCredentials);

      const directExistingAzureCredentials = {
        tenantId: 'direct-existing-tenant',
        clientId: 'direct-existing-client',
        azure_credentials_cloud_connector_id: 'direct-existing-connector',
        cloudConnectorId: 'direct-existing-connector',
      };

      act(() => {
        result.current.setExistingConnectionCredentials(directExistingAzureCredentials);
      });

      expect(result.current.existingConnectionCredentials).toEqual(directExistingAzureCredentials);
    });
  });

  describe('Cloud connector name validation', () => {
    describe('AWS credentials with name validation', () => {
      it('should set isValid to undefined when name is valid (any string)', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const credentialsWithValidName: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
          externalId: 'test-external-id',
          name: 'Valid Connector Name 123',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(credentialsWithValidName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
            cloud_connector_name: 'Valid Connector Name 123',
          }),
        });
      });

      it('should set isValid to undefined when name is 1 character', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const credentialsWithShortName: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
          externalId: 'test-external-id',
          name: 'A',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(credentialsWithShortName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should set isValid to false when name is too long (> 255 chars)', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const credentialsWithLongName: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
          externalId: 'test-external-id',
          name: 'A'.repeat(256), // 256 characters
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(credentialsWithLongName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: false,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should set isValid to undefined when name contains special characters', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const credentialsWithSpecialChars: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
          externalId: 'test-external-id',
          name: 'Special@Connector#Name!',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(credentialsWithSpecialChars);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
            cloud_connector_name: 'Special@Connector#Name!',
          }),
        });
      });

      it('should set isValid to false when name is undefined', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const credentialsWithoutName: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
          externalId: 'test-external-id',
          name: undefined,
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(credentialsWithoutName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: false,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should set isValid to undefined when name contains any valid characters', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const credentialsWithSpecialChars: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
          externalId: 'test-external-id',
          name: 'AWS-Connector_123 Test',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(credentialsWithSpecialChars);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should set isValid to false when name is empty string', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const credentialsWithEmptyName: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
          externalId: 'test-external-id',
          name: '',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(credentialsWithEmptyName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: false,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should set isValid to undefined when name is exactly 255 characters', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const longName = 'A'.repeat(255);
        const credentialsWithMaxLength: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/TestRole',
          externalId: 'test-external-id',
          name: longName, // Exactly 255 characters
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(credentialsWithMaxLength);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
            cloud_connector_name: longName,
          }),
        });
      });
    });

    describe('Azure credentials with name validation', () => {
      // Use existing mockAzureInput and mockAzurePolicy from outer scope
      const mockAzurePolicy: NewPackagePolicy = {
        id: 'azure-test-policy-id',
        enabled: true,
        policy_id: 'azure-test-policy',
        policy_ids: ['azure-test-policy'],
        name: 'azure-test-policy',
        namespace: 'default',
        package: {
          name: 'cloud_security_posture',
          title: 'Cloud Security Posture',
          version: '1.0.0',
        },
        supports_cloud_connector: true,
        inputs: [
          {
            type: 'cloudbeat/cis_azure',
            policy_template: 'cis_azure',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: 'azure.activitylogs' },
                vars: {
                  'azure.credentials.tenant_id': { value: 'test-tenant-id' },
                  'azure.credentials.client_id': { value: 'test-client-id' },
                },
              },
            ],
          },
        ],
      } as NewPackagePolicy;

      const mockAzureInput: NewPackagePolicyInput = {
        type: 'cloudbeat/cis_azure',
        policy_template: 'cis_azure',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { type: 'logs', dataset: 'azure.activitylogs' },
            vars: {
              'azure.credentials.tenant_id': { value: 'test-tenant-id' },
              'azure.credentials.client_id': { value: 'test-client-id' },
            },
          },
        ],
      };

      beforeEach(() => {
        mockIsAzureCloudConnectorVars.mockReturnValue(true);
      });

      it('should set isValid to undefined when Azure name is valid', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
        );

        const azureCredentialsWithValidName = {
          tenantId: 'test-tenant-id',
          clientId: 'test-client-id',
          name: 'Valid Azure Connector',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(azureCredentialsWithValidName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
            cloud_connector_name: 'Valid Azure Connector',
          }),
        });
      });

      it('should set isValid to undefined when Azure name is 1 character', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
        );

        const azureCredentialsWithShortName = {
          tenantId: 'test-tenant-id',
          clientId: 'test-client-id',
          name: 'A',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(azureCredentialsWithShortName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should set isValid to false when Azure name is too long (> 255 chars)', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
        );

        const azureCredentialsWithLongName = {
          tenantId: 'test-tenant-id',
          clientId: 'test-client-id',
          name: 'A'.repeat(256), // 256 characters
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(azureCredentialsWithLongName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: false,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should set isValid to undefined when Azure name contains special characters', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
        );

        const azureCredentialsWithSpecialChars = {
          tenantId: 'test-tenant-id',
          clientId: 'test-client-id',
          name: 'Azure@Connector#2024',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(azureCredentialsWithSpecialChars);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
            cloud_connector_name: 'Azure@Connector#2024',
          }),
        });
      });

      it('should set isValid to false when Azure name is undefined', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
        );

        const azureCredentialsWithoutName = {
          tenantId: 'test-tenant-id',
          clientId: 'test-client-id',
          name: undefined,
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(azureCredentialsWithoutName);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: false,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should store credentials with valid name in state', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
        );

        const azureCredentialsWithName = {
          tenantId: 'test-tenant-id',
          clientId: 'test-client-id',
          name: 'My Azure Connection',
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(azureCredentialsWithName);
        });

        expect(result.current.newConnectionCredentials).toEqual(azureCredentialsWithName);
      });

      it('should set isValid to undefined for any length up to 255', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
        );

        const azureCredentialsWith100Chars = {
          tenantId: 'test-tenant-id',
          clientId: 'test-client-id',
          name: 'A'.repeat(100),
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(azureCredentialsWith100Chars);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
          }),
        });
      });

      it('should set isValid to undefined when name is exactly 255 characters', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockAzureInput, mockAzurePolicy, mockUpdatePolicy)
        );

        const longName = 'A'.repeat(255);
        const azureCredentialsMaxLength = {
          tenantId: 'test-tenant-id',
          clientId: 'test-client-id',
          name: longName, // Exactly 255 characters
        };

        act(() => {
          result.current.updatePolicyWithNewCredentials(azureCredentialsMaxLength);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          isValid: undefined,
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: undefined,
            cloud_connector_name: longName,
          }),
        });
      });
    });

    describe('Existing credentials should not validate name', () => {
      it('should not include isValid when using existing AWS credentials', () => {
        const { result } = renderHook(() =>
          useCloudConnectorSetup(mockInput, mockPolicy, mockUpdatePolicy)
        );

        const existingCredentials: CloudConnectorCredentials = {
          roleArn: 'arn:aws:iam::123456789012:role/ExistingRole',
          externalId: 'existing-external-id',
          cloudConnectorId: 'existing-connector-123',
          name: 'X', // Invalid name, but should be ignored for existing credentials
        };

        act(() => {
          result.current.updatePolicyWithExistingCredentials(existingCredentials);
        });

        expect(mockUpdatePolicy).toHaveBeenCalledWith({
          updatedPolicy: expect.objectContaining({
            cloud_connector_id: 'existing-connector-123',
          }),
          // No isValid property - existing credentials don't validate name
        });
      });
    });
  });
});

describe('extractVarValue helper - secret reference handling', () => {
  const mockBasePolicy = {
    id: 'test-policy-id',
    enabled: true,
    policy_id: 'test-policy',
    policy_ids: ['test-policy'],
    name: 'test-policy',
    namespace: 'default',
    package: {
      name: 'cloud_security_posture',
      title: 'Cloud Security Posture',
      version: '1.0.0',
    },
    supports_cloud_connector: true,
  };

  const mockBaseInput = {
    type: 'cloudbeat/cis_aws',
    policy_template: 'cis_aws',
    enabled: true,
    streams: [
      {
        enabled: true,
        data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
        vars: {},
      },
    ],
  } as NewPackagePolicyInput;

  const mockUpdatePolicy: UpdatePolicy = jest.fn();

  it('should extract string values directly', () => {
    const stringInput = {
      ...mockBaseInput,
      streams: [
        {
          ...mockBaseInput.streams[0],
          vars: {
            tenant_id: { value: 'simple-string-value' },
            client_id: { value: 'another-string' },
          },
        },
      ],
    } as NewPackagePolicyInput;

    const stringPolicy = {
      ...mockBasePolicy,
      inputs: [stringInput],
    } as NewPackagePolicy;

    const { result } = renderHook(() =>
      useCloudConnectorSetup(stringInput, stringPolicy, mockUpdatePolicy)
    );

    expect(result.current.newConnectionCredentials).toEqual({
      tenantId: 'simple-string-value',
      clientId: 'another-string',
      azure_credentials_cloud_connector_id: undefined,
    });
  });

  it('should extract id from secret reference objects', () => {
    const secretInput = {
      ...mockBaseInput,
      streams: [
        {
          ...mockBaseInput.streams[0],
          vars: {
            tenant_id: { value: { id: 'secret-123', isSecretRef: true } },
            client_id: { value: { id: 'secret-456', isSecretRef: true } },
            azure_credentials_cloud_connector_id: {
              value: 'secret-cc-789',
            },
          },
        },
      ],
    } as NewPackagePolicyInput;

    const secretPolicy = {
      ...mockBasePolicy,
      inputs: [secretInput],
    } as NewPackagePolicy;

    const { result } = renderHook(() =>
      useCloudConnectorSetup(secretInput, secretPolicy, mockUpdatePolicy)
    );

    expect(result.current.newConnectionCredentials).toEqual({
      tenantId: 'secret-123',
      clientId: 'secret-456',
      azure_credentials_cloud_connector_id: 'secret-cc-789',
    });
  });

  it('should handle undefined values', () => {
    const undefinedInput = {
      ...mockBaseInput,
      streams: [
        {
          ...mockBaseInput.streams[0],
          vars: {
            tenant_id: { value: undefined },
            client_id: { value: undefined },
            azure_credentials_cloud_connector_id: { value: undefined },
          },
        },
      ],
    } as NewPackagePolicyInput;

    const undefinedPolicy = {
      ...mockBasePolicy,
      inputs: [undefinedInput],
    } as NewPackagePolicy;

    const { result } = renderHook(() =>
      useCloudConnectorSetup(undefinedInput, undefinedPolicy, mockUpdatePolicy)
    );

    expect(result.current.newConnectionCredentials).toEqual({
      tenantId: undefined,
      clientId: undefined,
      azure_credentials_cloud_connector_id: undefined,
    });
  });

  it('should handle mixed string and secret reference values', () => {
    const mixedInput = {
      ...mockBaseInput,
      streams: [
        {
          ...mockBaseInput.streams[0],
          vars: {
            tenant_id: { value: 'plain-string' },
            client_id: { value: { id: 'secret-client', isSecretRef: true } },
            azure_credentials_cloud_connector_id: { value: undefined },
          },
        },
      ],
    } as NewPackagePolicyInput;

    const mixedPolicy = {
      ...mockBasePolicy,
      inputs: [mixedInput],
    } as NewPackagePolicy;

    const { result } = renderHook(() =>
      useCloudConnectorSetup(mixedInput, mixedPolicy, mockUpdatePolicy)
    );

    expect(result.current.newConnectionCredentials).toEqual({
      tenantId: 'plain-string',
      clientId: 'secret-client',
      azure_credentials_cloud_connector_id: undefined,
    });
  });
});

describe('Azure credentials with mixed secret and text vars', () => {
  const mockBasePolicy = {
    id: 'test-policy-id',
    enabled: true,
    policy_id: 'test-policy',
    policy_ids: ['test-policy'],
    name: 'test-policy',
    namespace: 'default',
    package: {
      name: 'cloud_security_posture',
      title: 'Cloud Security Posture',
      version: '1.0.0',
    },
    supports_cloud_connector: true,
  };

  const mockAzureInput = {
    type: 'cloudbeat/cis_azure',
    policy_template: 'cis_azure',
    enabled: true,
    streams: [
      {
        enabled: true,
        data_stream: { type: 'logs', dataset: 'azure.activitylogs' },
        vars: {
          tenant_id: { value: 'test-tenant-id', type: 'text' },
          client_id: { value: 'test-client-id', type: 'text' },
          azure_credentials_cloud_connector_id: { value: 'test-azure-connector', type: 'text' },
        },
      },
    ],
  } as NewPackagePolicyInput;

  const mockAzurePolicy = {
    ...mockBasePolicy,
    inputs: [mockAzureInput],
  } as NewPackagePolicy;

  const mockUpdatePolicy: UpdatePolicy = jest.fn();

  beforeEach(() => {
    mockIsAzureCloudConnectorVars.mockReturnValue(true);
  });

  it('should handle azure_credentials_cloud_connector_id as string', () => {
    const stringInput = {
      ...mockAzureInput,
      streams: [
        {
          ...mockAzureInput.streams[0],
          vars: {
            ...mockAzureInput.streams[0].vars,
            azure_credentials_cloud_connector_id: { value: 'plain-connector-id', type: 'text' },
          },
        },
      ],
    } as NewPackagePolicyInput;

    const stringPolicy = {
      ...mockAzurePolicy,
      inputs: [stringInput],
    } as NewPackagePolicy;

    const { result } = renderHook(() =>
      useCloudConnectorSetup(stringInput, stringPolicy, mockUpdatePolicy)
    );

    expect(result.current.newConnectionCredentials).toEqual({
      tenantId: 'test-tenant-id',
      clientId: 'test-client-id',
      azure_credentials_cloud_connector_id: 'plain-connector-id',
    });
  });

  it('should handle azure.credentials.* format with secret references', () => {
    const azureCredentialsInput = {
      ...mockAzureInput,
      streams: [
        {
          ...mockAzureInput.streams[0],
          vars: {
            'azure.credentials.tenant_id': {
              value: { id: 'azure-secret-tenant', isSecretRef: true },
              type: 'password',
            },
            'azure.credentials.client_id': {
              value: { id: 'azure-secret-client', isSecretRef: true },
              type: 'password',
            },
          },
        },
      ],
    } as NewPackagePolicyInput;

    const azureCredentialsPolicy = {
      ...mockAzurePolicy,
      inputs: [azureCredentialsInput],
    } as NewPackagePolicy;

    const { result } = renderHook(() =>
      useCloudConnectorSetup(azureCredentialsInput, azureCredentialsPolicy, mockUpdatePolicy)
    );

    expect(result.current.newConnectionCredentials).toEqual({
      tenantId: 'azure-secret-tenant',
      clientId: 'azure-secret-client',
      azure_credentials_cloud_connector_id: undefined,
    });
  });
});
