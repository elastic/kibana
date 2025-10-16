/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AwsInputVarFields } from './aws_input_var_fields';
import type { PackageInfo } from '@kbn/fleet-plugin/common';

const mockPackageInfo = {
  name: 'cloud_security_posture',
  version: '1.0.0',
  title: 'Cloud Security Posture',
  policy_templates: [],
  owner: { github: 'elastic' },
  description: 'Test package for cloud security posture',
  status: 'installed',
} as unknown as PackageInfo;

jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: ({ value }: { value: string }) => (
    <div data-test-subj="mocked-input-field">{value ? `Value: ${value}` : 'No value'}</div>
  ),
}));

jest.mock('../utils', () => ({
  findVariableDef: jest.fn((packageInfo, varName) => ({
    name: varName,
    type: 'text',
    title: varName.split('.').pop(),
    required: true,
  })),
  fieldIsInvalid: jest.fn(() => false),
}));

describe('AwsInputVarFields', () => {
  const mockOnChange = jest.fn();

  const awsFields = [
    {
      id: 'aws.credentials.access_key_id',
      value: 'test-access-key',
      label: 'Access Key ID',
      type: 'text' as const,
      dataTestSubj: 'aws-access-key-input',
    },
    {
      id: 'aws.credentials.secret_access_key',
      value: 'test-secret-key',
      label: 'Secret Access Key',
      type: 'password' as const,
      isSecret: true,
      dataTestSubj: 'aws-secret-key-input',
    },
    {
      id: 'aws.credentials.session_token',
      value: '',
      label: 'Session Token',
      type: 'password' as const,
      isSecret: true,
      dataTestSubj: 'aws-session-token-input',
    },
  ];

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders text and password fields with correct values and handles changes', () => {
    render(
      <AwsInputVarFields fields={awsFields} onChange={mockOnChange} packageInfo={mockPackageInfo} />
    );

    // Text field renders with value and responds to changes
    const accessKeyInput = screen.getByDisplayValue('test-access-key');
    expect(screen.getByText('Access Key ID')).toBeInTheDocument();
    expect(screen.getByTestId('aws-access-key-input')).toBeInTheDocument();

    fireEvent.change(accessKeyInput, { target: { value: 'new-access-key' } });
    expect(mockOnChange).toHaveBeenCalledWith('aws.credentials.access_key_id', 'new-access-key');

    // Password fields rendered as mocked components
    const mockedFields = screen.getAllByTestId('mocked-input-field');
    expect(mockedFields).toHaveLength(2);
    expect(screen.getByText('Value: test-secret-key')).toBeInTheDocument();
    expect(screen.getByText('No value')).toBeInTheDocument(); // Empty session token
  });

  it('handles validation errors and field variations', () => {
    const utils = jest.requireMock('../utils');
    utils.fieldIsInvalid.mockReturnValue(true);

    const emptyFields = awsFields.map((field) => ({ ...field, value: '' }));

    render(
      <AwsInputVarFields
        fields={emptyFields}
        onChange={mockOnChange}
        packageInfo={mockPackageInfo}
        hasInvalidRequiredVars={true}
      />
    );

    // Component renders with validation errors
    expect(screen.getByText('Access Key ID')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1); // Text field for access key
    expect(screen.getAllByText('No value')).toHaveLength(2); // Password fields only
  });
});
