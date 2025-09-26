/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAwsCredentialsFormOptions,
  getAwsCredentialsFormManualOptions,
} from './get_aws_credentials_form_options';

// Mock utility functions with AWS-specific behavior
jest.mock('../utils', () => ({
  isAgentlessSupported: jest.fn(() => true),
  getInputTypesFromPackageInfo: jest.fn(() => [
    { type: 'cloudbeat/cis_aws', policy_template: 'cspm' },
  ]),
  getPosturePolicy: jest.fn(() => 'cspm'),
  getAwsCredentialsType: jest.fn(() => 'direct_access_keys'),
}));

describe('get_aws_credentials_form_options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAwsCredentialsFormOptions', () => {
    it('should return AWS credential options with correct structure', () => {
      const result = getAwsCredentialsFormOptions();

      // Check the actual properties returned (no cloud_connectors in basic options)
      expect(result).toHaveProperty('cloud_formation');
      expect(result).toHaveProperty('direct_access_keys');
      expect(result).toHaveProperty('temporary_keys');
      expect(result).toHaveProperty('assume_role');
      expect(result).toHaveProperty('shared_credentials');

      // Verify each option has expected structure
      Object.values(result).forEach((option) => {
        expect(option).toHaveProperty('label');
        expect(option).toHaveProperty('fields');
        expect(typeof option.label).toBe('string');
      });
    });

    it('should include direct access keys with correct field structure', () => {
      const result = getAwsCredentialsFormOptions();
      const directAccessKeys = result.direct_access_keys;

      expect(directAccessKeys.label).toContain('Direct access');
      expect(directAccessKeys.fields).toBeDefined();
      expect(Object.keys(directAccessKeys.fields).length).toBeGreaterThan(0);
    });
  });

  describe('getAwsCredentialsFormManualOptions', () => {
    it('should return manual credential options as array', () => {
      const result = getAwsCredentialsFormManualOptions();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Each option should have value and text
      result.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('text');
      });
    });

    it('should filter out cloud connectors for manual options', () => {
      const result = getAwsCredentialsFormManualOptions();

      const cloudConnectorOption = result.find((option) => option.value === 'cloud_connectors');
      expect(cloudConnectorOption).toBeUndefined();
    });
  });

  describe('Cross-functional patterns', () => {
    it('should demonstrate consistent structure across providers', () => {
      const result = getAwsCredentialsFormOptions();

      // Demonstrate that the pattern works for multiple credential types
      const credentialTypes = Object.keys(result);
      expect(credentialTypes.length).toBeGreaterThan(2);

      // Show that each type follows the same pattern
      credentialTypes.forEach((type) => {
        const option = result[type as keyof typeof result];
        expect(option).toMatchObject({
          label: expect.any(String),
          fields: expect.any(Object),
        });
      });
    });

    it('should handle different credential configurations (demonstrates reusability)', () => {
      // Test with different field mappings - demonstrates cross-functional capability
      const basicResult = getAwsCredentialsFormOptions();
      const customResult = getAwsCredentialsFormOptions({
        role_arn: 'custom.role.arn',
        access_key_id: 'custom.access.key',
        'aws.credentials.external_id': 'custom.external.id',
      });

      // Both should have the same structure but potentially different field mappings
      expect(Object.keys(basicResult)).toEqual(Object.keys(customResult));
    });
  });
});
