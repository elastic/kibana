/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AwsInputVarFields } from './aws_input_var_fields';
// Create simple inline mock to avoid import scope issues
const createMockPackageInfo = () => ({
  name: 'cloud_security_posture',
  version: '1.0.0',
  title: 'Cloud Security Posture',
  policy_templates: [],
  owner: { github: 'elastic' },
  description: 'Test package for cloud security posture',
  status: 'installed',
});

// Mock Fleet plugin with consistent pattern
jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: ({ value }: { value: string }) => (
    <div data-test-subj="mocked-input-field">{value ? `Value: ${value}` : 'No value'}</div>
  ),
}));

// Mock utility functions with AWS-specific behavior
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
  const mockPackageInfo = createMockPackageInfo() as any;
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockAwsFields = (provider = 'aws') => [
    {
      id: `${provider}.credentials.access_key_id`,
      value: 'test-access-key',
      label: 'Access Key ID',
      type: 'text' as const,
      dataTestSubj: `${provider}-access-key-input`,
    },
    {
      id: `${provider}.credentials.secret_access_key`,
      value: 'test-secret-key',
      label: 'Secret Access Key',
      type: 'password' as const,
      isSecret: true,
      dataTestSubj: `${provider}-secret-key-input`,
    },
    {
      id: `${provider}.credentials.session_token`,
      value: '',
      label: 'Session Token',
      type: 'password' as const,
      isSecret: true,
      dataTestSubj: `${provider}-session-token-input`,
    },
  ];

  it('should render AWS credential input fields correctly', () => {
    const fields = createMockAwsFields();

    render(
      <AwsInputVarFields fields={fields} onChange={mockOnChange} packageInfo={mockPackageInfo} />
    );

    // Verify text field is rendered
    expect(screen.getByText('Access Key ID')).toBeInTheDocument();

    // Password fields are rendered as mocked components
    const mockedFields = screen.getAllByTestId('mocked-input-field');
    expect(mockedFields).toHaveLength(2); // Secret key and session token
    expect(screen.getByText('Value: test-secret-key')).toBeInTheDocument();
  });

  it('should show field values in text inputs', () => {
    const fields = createMockAwsFields();

    render(
      <AwsInputVarFields fields={fields} onChange={mockOnChange} packageInfo={mockPackageInfo} />
    );

    // Verify field values are displayed
    const accessKeyInput = screen.getByDisplayValue('test-access-key');
    expect(accessKeyInput).toBeInTheDocument();

    // Password fields show values via mocked components, not form inputs
    expect(screen.getByText('Value: test-secret-key')).toBeInTheDocument();
  });

  it('should call onChange when field values change', () => {
    const fields = createMockAwsFields();

    render(
      <AwsInputVarFields fields={fields} onChange={mockOnChange} packageInfo={mockPackageInfo} />
    );

    const accessKeyInput = screen.getByDisplayValue('test-access-key');
    fireEvent.change(accessKeyInput, { target: { value: 'new-access-key' } });

    expect(mockOnChange).toHaveBeenCalledWith('aws.credentials.access_key_id', 'new-access-key');
  });

  it('should handle empty field values', () => {
    const fields = createMockAwsFields().map((field) => ({ ...field, value: '' }));

    render(
      <AwsInputVarFields fields={fields} onChange={mockOnChange} packageInfo={mockPackageInfo} />
    );

    // Verify empty fields are handled correctly
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toHaveValue('');
    });
  });

  it('should render with proper data-test-subj attributes', () => {
    const fields = createMockAwsFields();

    render(
      <AwsInputVarFields fields={fields} onChange={mockOnChange} packageInfo={mockPackageInfo} />
    );

    // Verify test subjects are present
    expect(screen.getByTestId('aws-access-key-input')).toBeInTheDocument();

    // Password fields use mocked components
    const mockedFields = screen.getAllByTestId('mocked-input-field');
    expect(mockedFields).toHaveLength(2);
  });

  it('should handle mixed field types (text and password)', () => {
    const fields = createMockAwsFields();

    render(
      <AwsInputVarFields fields={fields} onChange={mockOnChange} packageInfo={mockPackageInfo} />
    );

    // Text fields render as textbox role, password fields as mocked components
    expect(screen.getAllByRole('textbox')).toHaveLength(1); // Only text field
    expect(screen.getAllByTestId('mocked-input-field')).toHaveLength(2); // Password fields
  });

  it('should support GCP fields using the same pattern', () => {
    const gcpFields = createMockAwsFields('gcp').map((field) => ({
      ...field,
      id: field.id.replace('aws', 'gcp'),
      dataTestSubj: field.dataTestSubj.replace('aws', 'gcp'),
      label: field.label
        .replace('Access Key ID', 'Service Account Key')
        .replace('Secret Access Key', 'Private Key')
        .replace('Session Token', 'Project ID'),
    }));

    render(
      <AwsInputVarFields fields={gcpFields} onChange={mockOnChange} packageInfo={mockPackageInfo} />
    );

    // Demonstrate cross-functional reusability - only text field shows label
    expect(screen.getByText('Service Account Key')).toBeInTheDocument();

    // Password fields (Private Key, Project ID) are rendered as mocked components
    const mockedFields = screen.getAllByTestId('mocked-input-field');
    expect(mockedFields).toHaveLength(2); // Private Key and Project ID
  });

  it('should handle validation states correctly', () => {
    const fields = createMockAwsFields();
    const utils = jest.requireMock('../utils');

    // Mock invalid field detection
    utils.fieldIsInvalid.mockReturnValue(true);
    render(
      <AwsInputVarFields
        fields={fields}
        onChange={mockOnChange}
        packageInfo={mockPackageInfo}
        hasInvalidRequiredVars={true}
      />
    );

    // Component should render even with validation errors
    expect(screen.getByText('Access Key ID')).toBeInTheDocument();
    expect(mockOnChange).toHaveBeenCalledTimes(0);
  });
});
