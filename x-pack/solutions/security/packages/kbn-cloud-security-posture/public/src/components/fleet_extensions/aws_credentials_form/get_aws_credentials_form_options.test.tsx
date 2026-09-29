/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import {
  getAwsCredentialsFormOptions,
  getAwsCredentialsFormManualOptions,
} from './get_aws_credentials_form_options';

vi.mock('../utils', () => {
      const mocked = {
      isAgentlessSupported: vi.fn(() => true),
      getInputTypesFromPackageInfo: vi.fn(() => [
        { type: 'cloudbeat/cis_aws', policy_template: 'cspm' },
      ]),
      getPosturePolicy: vi.fn(() => 'cspm'),
      getAwsCredentialsType: vi.fn(() => 'direct_access_keys'),
    };
      return { ...mocked, default: mocked };
    });

describe('get_aws_credentials_form_options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AWS credential options with consistent structure and properties', () => {
    const result = getAwsCredentialsFormOptions();

    // Verify expected credential types are present
    expect(result).toHaveProperty('cloud_formation');
    expect(result).toHaveProperty('direct_access_keys');
    expect(result).toHaveProperty('temporary_keys');
    expect(result).toHaveProperty('assume_role');
    expect(result).toHaveProperty('shared_credentials');

    // Verify structure consistency across all options
    Object.values(result).forEach((option) => {
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('fields');
      expect(typeof option.label).toBe('string');
    });

    // Verify direct access keys specific structure
    const directAccessKeys = result.direct_access_keys;
    expect(directAccessKeys.label).toContain('Direct access');
    expect(Object.keys(directAccessKeys.fields).length).toBeGreaterThan(0);
  });

  it('returns manual options as array excluding cloud connectors', () => {
    const result = getAwsCredentialsFormManualOptions();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Verify option structure
    result.forEach((option) => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('text');
    });

    // Verify cloud connectors are filtered out for manual options
    const cloudConnectorOption = result.find((option) => option.value === 'cloud_connectors');
    expect(cloudConnectorOption).toBeUndefined();
  });

  it('handles custom field mappings while maintaining structure consistency', () => {
    const basicResult = getAwsCredentialsFormOptions();
    const customResult = getAwsCredentialsFormOptions({
      role_arn: 'custom.role.arn',
      access_key_id: 'custom.access.key',
      'aws.credentials.external_id': 'custom.external.id',
    });

    // Structure should remain consistent regardless of field mapping
    expect(Object.keys(basicResult)).toEqual(Object.keys(customResult));
  });
});
