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
import type { CloudConnectorCredentials } from './use_cloud_connector_setup';

// Mock utility functions
jest.mock('../utils', () => ({
  updateInputVarsWithCredentials: jest.fn(),
  updatePolicyInputs: jest.fn(),
}));

import { updateInputVarsWithCredentials, updatePolicyInputs } from '../utils';

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

    // Reset mocks with debug output
    (updateInputVarsWithCredentials as jest.Mock).mockImplementation(
      (inputVars, credentials, isNew) => {
        return inputVars;
      }
    );

    (updatePolicyInputs as jest.Mock).mockImplementation((policy, vars) => {
      return { ...mockPolicy };
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

  describe('credential state management', () => {
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
});
