/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  updateInputVarsWithCredentials,
  updatePolicyInputs,
  updatePolicyWithAwsCloudConnectorCredentials,
  isCloudConnectorReusableEnabled,
} from './utils';

import type {
  PackagePolicyConfigRecord,
  NewPackagePolicy,
  NewPackagePolicyInput,
} from '@kbn/fleet-plugin/common';
import { type CloudConnectorCredentials } from './hooks/use_cloud_connector_setup';

describe('updateInputVarsWithCredentials', () => {
  let mockInputVars: PackagePolicyConfigRecord;

  beforeEach(() => {
    mockInputVars = {
      role_arn: { value: 'arn:aws:iam::123456789012:role/OriginalRole' },
      external_id: { value: 'original-external-id' },
      'aws.role_arn': { value: 'arn:aws:iam::123456789012:role/OriginalAwsRole' },
      'aws.credentials.external_id': { value: 'original-aws-external-id' },
    };
  });

  it('should update role_arn fields when roleArn is provided', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.role_arn?.value).toBe('arn:aws:iam::123456789012:role/UpdatedRole');
    expect(result?.['aws.role_arn']?.value).toBe('arn:aws:iam::123456789012:role/UpdatedRole');
  });

  it('should update external_id fields when externalId is provided (not new credentials)', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.external_id?.value).toBe('updated-external-id');
    expect(result?.['aws.credentials.external_id']?.value).toBe('updated-external-id');
  });

  it('should update external_id fields when externalId is provided (new credentials)', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.external_id).toEqual({ value: 'updated-external-id' });
    expect(result?.['aws.credentials.external_id']?.value).toBe('updated-external-id');
  });

  it('should clear role_arn fields when roleArn is undefined', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: undefined,
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.role_arn).toEqual({ value: undefined });
    expect(result?.['aws.role_arn']).toEqual({ value: undefined });
  });

  it('should clear external_id fields when externalId is undefined', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: undefined,
    };

    const result = updateInputVarsWithCredentials(mockInputVars, credentials);

    expect(result?.external_id).toEqual({ value: undefined });
    expect(result?.['aws.credentials.external_id']).toEqual({ value: undefined });
  });

  it('should return undefined when inputVars is undefined', () => {
    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(undefined, credentials);

    expect(result).toBeUndefined();
  });

  it('should handle partial inputVars (missing some fields)', () => {
    const partialInputVars: PackagePolicyConfigRecord = {
      role_arn: { value: 'arn:aws:iam::123456789012:role/OriginalRole' },
      // Missing other fields
    };

    const credentials: CloudConnectorCredentials = {
      roleArn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      externalId: 'updated-external-id',
    };

    const result = updateInputVarsWithCredentials(partialInputVars, credentials);

    expect(result?.role_arn?.value).toBe('arn:aws:iam::123456789012:role/UpdatedRole');
    // Should not crash when fields are missing
    expect(result).toEqual(
      expect.objectContaining({
        role_arn: { value: 'arn:aws:iam::123456789012:role/UpdatedRole' },
      })
    );
  });

  it('should handle undefined credentials', () => {
    const result = updateInputVarsWithCredentials(mockInputVars, undefined);

    // Should clear all credential fields when credentials is undefined
    expect(result?.role_arn).toEqual({ value: undefined });
    expect(result?.external_id).toEqual({ value: undefined });
    expect(result?.['aws.role_arn']).toEqual({ value: undefined });
    expect(result?.['aws.credentials.external_id']).toEqual({ value: undefined });
  });
});

describe('updatePolicyInputs', () => {
  let mockPolicy: NewPackagePolicy;
  let mockInputVars: PackagePolicyConfigRecord;

  beforeEach(() => {
    mockPolicy = {
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
                role_arn: { value: 'arn:aws:iam::123456789012:role/OriginalRole' },
                external_id: { value: 'original-external-id' },
              },
            },
          ],
        },
      ],
    };

    mockInputVars = {
      role_arn: { value: 'arn:aws:iam::123456789012:role/UpdatedRole' },
      external_id: { value: 'updated-external-id' },
    };
  });

  it('should update vars in enabled streams of enabled inputs', () => {
    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    expect(result.inputs[0].streams[0].vars).toEqual(mockInputVars);
  });

  it('should not update vars in disabled streams', () => {
    mockPolicy.inputs[0].streams[0].enabled = false;
    const originalVars = mockPolicy.inputs[0].streams[0].vars;

    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    expect(result.inputs[0].streams[0].vars).toEqual(originalVars);
  });

  it('should not update vars in disabled inputs', () => {
    mockPolicy.inputs[0].enabled = false;
    const originalVars = mockPolicy.inputs[0].streams[0].vars;

    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    expect(result.inputs[0].streams[0].vars).toEqual(originalVars);
  });

  it('should handle multiple inputs with mixed enabled states', () => {
    mockPolicy.inputs.push({
      type: 'cloudbeat/cis_aws',
      policy_template: 'cis_aws',
      enabled: false,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/DisabledInputRole' },
          },
        },
      ],
    });

    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    // First input (enabled) should be updated
    expect(result.inputs[0].streams[0].vars).toEqual(mockInputVars);
    // Second input (disabled) should remain unchanged
    expect(result.inputs[1].streams[0].vars).toEqual({
      role_arn: { value: 'arn:aws:iam::123456789012:role/DisabledInputRole' },
    });
  });

  it('should handle multiple streams with mixed enabled states', () => {
    mockPolicy.inputs[0].streams.push({
      enabled: false,
      data_stream: { type: 'logs', dataset: 'aws.s3access' },
      vars: {
        role_arn: { value: 'arn:aws:iam::123456789012:role/DisabledStreamRole' },
      },
    });

    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    // First stream (enabled) should be updated
    expect(result.inputs[0].streams[0].vars).toEqual(mockInputVars);
    // Second stream (disabled) should remain unchanged
    expect(result.inputs[0].streams[1].vars).toEqual({
      role_arn: { value: 'arn:aws:iam::123456789012:role/DisabledStreamRole' },
    });
  });

  it('should return original policy when inputs is empty', () => {
    mockPolicy.inputs = [];

    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    expect(result).toEqual(mockPolicy);
  });

  it('should return original policy when inputs is undefined', () => {
    delete (mockPolicy as Partial<NewPackagePolicy>).inputs;

    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    expect(result).toEqual(mockPolicy);
  });

  it('should return original policy when inputVars is undefined', () => {
    const result = updatePolicyInputs(mockPolicy, undefined as never);

    expect(result).toEqual(mockPolicy);
  });

  it('should handle input with no streams', () => {
    mockPolicy.inputs[0].streams = [];

    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    expect(result.inputs[0].streams).toEqual([]);
  });

  it('should handle input with undefined streams', () => {
    delete (mockPolicy.inputs[0] as Partial<NewPackagePolicyInput>).streams;

    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    expect(result).toEqual(mockPolicy);
  });

  it('should preserve other policy properties', () => {
    const result = updatePolicyInputs(mockPolicy, mockInputVars);

    expect(result.id).toBe(mockPolicy.id);
    expect(result.name).toBe(mockPolicy.name);
    expect(result.namespace).toBe(mockPolicy.namespace);
    expect(result.package).toEqual(mockPolicy.package);
  });
});

describe('updatePolicyWithAwsCloudConnectorCredentials', () => {
  let mockPackagePolicy: NewPackagePolicy;
  let mockInput: NewPackagePolicyInput;

  beforeEach(() => {
    mockInput = {
      type: 'cloudbeat/cis_aws',
      policy_template: 'cis_aws',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/OriginalRole' },
            external_id: { value: 'original-external-id' },
            'aws.role_arn': { value: 'arn:aws:iam::123456789012:role/OriginalAwsRole' },
            'aws.credentials.external_id': { value: 'original-aws-external-id' },
          },
        },
      ],
    };

    mockPackagePolicy = {
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
      inputs: [
        {
          type: 'cloudbeat/cis_aws',
          policy_template: 'cis_aws',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
              vars: mockInput.streams[0].vars,
            },
          ],
        },
      ],
    };
  });

  it('should return original policy when credentials is empty object', () => {
    const result = updatePolicyWithAwsCloudConnectorCredentials(mockPackagePolicy, mockInput, {});

    expect(result).toStrictEqual(mockPackagePolicy);
  });

  it('should update role_arn when provided in credentials', () => {
    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    expect(result.inputs[0].streams[0].vars?.role_arn.value).toBe(
      'arn:aws:iam::123456789012:role/UpdatedRole'
    );
  });

  it('should update external_id when provided in credentials', () => {
    const credentials = {
      external_id: 'updated-external-id',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    expect(result.inputs[0].streams[0].vars?.external_id.value).toBe('updated-external-id');
  });

  it('should update aws.role_arn when provided in credentials', () => {
    const credentials = {
      'aws.role_arn': 'arn:aws:iam::123456789012:role/UpdatedAwsRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    expect(result.inputs[0].streams[0].vars?.['aws.role_arn'].value).toBe(
      'arn:aws:iam::123456789012:role/UpdatedAwsRole'
    );
  });

  it('should update aws.credentials.external_id when provided in credentials', () => {
    const credentials = {
      'aws.credentials.external_id': 'updated-aws-external-id',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    expect(result.inputs[0].streams[0].vars?.['aws.credentials.external_id'].value).toBe(
      'updated-aws-external-id'
    );
  });

  it('should handle multiple credential fields at once', () => {
    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
      external_id: 'updated-external-id',
      'aws.role_arn': 'arn:aws:iam::123456789012:role/UpdatedAwsRole',
      'aws.credentials.external_id': 'updated-aws-external-id',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      mockInput,
      credentials
    );

    const updatedVars = result.inputs[0].streams[0].vars;
    expect(updatedVars?.role_arn.value).toBe('arn:aws:iam::123456789012:role/UpdatedRole');
    expect(updatedVars?.external_id.value).toBe('updated-external-id');
    expect(updatedVars?.['aws.role_arn'].value).toBe(
      'arn:aws:iam::123456789012:role/UpdatedAwsRole'
    );
    expect(updatedVars?.['aws.credentials.external_id'].value).toBe('updated-aws-external-id');
  });

  it('should handle policy without inputs', () => {
    const policyWithoutInputs = { ...mockPackagePolicy, inputs: [] };

    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      policyWithoutInputs,
      mockInput,
      credentials
    );

    expect(result.inputs).toEqual([]);
  });

  it('should return policy with empty inputs array when inputs is undefined', () => {
    const policyWithoutInputs = { ...mockPackagePolicy };
    delete (policyWithoutInputs as Partial<NewPackagePolicy>).inputs;

    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      policyWithoutInputs,
      mockInput,
      credentials
    );

    expect(result.inputs).toEqual([]);
  });

  it('should return updated policy when input streams vars is undefined', () => {
    const inputWithoutVars: NewPackagePolicyInput = {
      type: 'test-input',
      policy_template: 'test-template',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'test.dataset' },
        },
      ],
    };

    const credentials = {
      role_arn: 'arn:aws:iam::123456789012:role/UpdatedRole',
    };

    const result = updatePolicyWithAwsCloudConnectorCredentials(
      mockPackagePolicy,
      inputWithoutVars,
      credentials
    );

    expect(result).toEqual(
      expect.objectContaining({
        inputs: expect.any(Array),
      })
    );
  });
});

describe('isCloudConnectorReusableEnabled', () => {
  it('should return true for CSPM when package version meets minimum requirement', () => {
    expect(isCloudConnectorReusableEnabled('3.1.0-preview06', 'cspm')).toBe(true);
    expect(isCloudConnectorReusableEnabled('3.2.0', 'cspm')).toBe(true);
    expect(isCloudConnectorReusableEnabled('4.0.0', 'cspm')).toBe(true);
  });

  it('should return false for CSPM when package version is below minimum requirement', () => {
    expect(isCloudConnectorReusableEnabled('3.0.0', 'cspm')).toBe(false);
    expect(isCloudConnectorReusableEnabled('3.1.0-preview05', 'cspm')).toBe(false);
    expect(isCloudConnectorReusableEnabled('2.5.0', 'cspm')).toBe(false);
  });

  it('should return true for asset inventory when package version meets minimum requirement', () => {
    expect(isCloudConnectorReusableEnabled('1.1.5', 'asset_inventory')).toBe(true);
    expect(isCloudConnectorReusableEnabled('1.2.0', 'asset_inventory')).toBe(true);
    expect(isCloudConnectorReusableEnabled('2.0.0', 'asset_inventory')).toBe(true);
  });

  it('should return false for asset inventory when package version is below minimum requirement', () => {
    expect(isCloudConnectorReusableEnabled('1.1.4', 'asset_inventory')).toBe(false);
    expect(isCloudConnectorReusableEnabled('1.0.0', 'asset_inventory')).toBe(false);
    expect(isCloudConnectorReusableEnabled('0.9.0', 'asset_inventory')).toBe(false);
  });

  it('should handle unknown template names by defaulting to asset inventory version', () => {
    expect(isCloudConnectorReusableEnabled('1.1.5', 'unknown_template')).toBe(false);
    expect(isCloudConnectorReusableEnabled('1.1.4', 'unknown_template')).toBe(false);
  });

  it('should handle edge cases with version formats', () => {
    expect(isCloudConnectorReusableEnabled('3.1.0', 'cspm')).toBe(true);
    expect(isCloudConnectorReusableEnabled('3.1.0-preview06', 'cspm')).toBe(true);
  });
});
