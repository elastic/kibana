/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { AzureInputVarFields } from './azure_input_var_fields';

// Mock the Fleet plugin components
jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: jest.fn(
    ({ value, onChange, varDef, errors, forceShowErrors }) => (
      <div data-test-subj="lazy-package-policy-input-var-field">
        <input
          data-test-subj={`secret-field-${varDef.name}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Secret field for ${varDef.name}`}
          aria-invalid={forceShowErrors && errors.length > 0}
        />
        {forceShowErrors && errors.length > 0 && (
          <div data-test-subj="field-error">{errors[0]}</div>
        )}
      </div>
    )
  ),
}));

// Mock utils
jest.mock('../utils', () => ({
  fieldIsInvalid: jest.fn((value, hasInvalidRequiredVars) => !value && hasInvalidRequiredVars),
  findVariableDef: jest.fn((packageInfo, fieldId) => ({
    name: fieldId,
    type: 'text',
    title: `Variable ${fieldId}`,
    description: `Description for ${fieldId}`,
  })),
}));

describe('AzureInputVarFields', () => {
  const mockPackageInfo = {
    name: 'cloud_security_posture',
    version: '1.0.0',
    title: 'Cloud Security Posture',
    policy_templates: [],
    owner: { github: 'elastic' },
    description: 'Azure credentials test package',
    status: 'installed',
  } as unknown as PackageInfo;

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Fields', () => {
    it('should render text field correctly', () => {
      const fields = [
        {
          id: 'azure_tenant_id',
          label: 'Tenant ID',
          type: 'text' as const,
          value: 'test-tenant',
          testSubj: 'azure-tenant-id-field',
          isSecret: false,
        },
      ];

      render(
        <AzureInputVarFields
          fields={fields}
          packageInfo={mockPackageInfo}
          onChange={mockOnChange}
          hasInvalidRequiredVars={false}
        />
      );

      expect(screen.getByLabelText('Tenant ID')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-tenant')).toBeInTheDocument();
      expect(screen.getByTestId('azure-tenant-id-field')).toBeInTheDocument();
    });

    it('should handle text field changes', () => {
      const fields = [
        {
          id: 'azure_tenant_id',
          label: 'Tenant ID',
          type: 'text' as const,
          value: '',
          testSubj: 'azure-tenant-id-field',
          isSecret: false,
        },
      ];

      render(
        <AzureInputVarFields
          fields={fields}
          packageInfo={mockPackageInfo}
          onChange={mockOnChange}
          hasInvalidRequiredVars={false}
        />
      );

      const input = screen.getByTestId('azure-tenant-id-field');
      fireEvent.change(input, { target: { value: 'new-tenant-id' } });

      expect(mockOnChange).toHaveBeenCalledWith('azure_tenant_id', 'new-tenant-id');
    });
  });

  describe('Secret Fields', () => {
    it('should render secret field correctly', () => {
      const fields = [
        {
          id: 'azure_client_secret',
          label: 'Client Secret',
          type: 'password' as const,
          value: 'secret-value',
          testSubj: 'azure-client-secret-field',
          isSecret: true,
        },
      ];

      render(
        <AzureInputVarFields
          fields={fields}
          packageInfo={mockPackageInfo}
          onChange={mockOnChange}
          hasInvalidRequiredVars={false}
        />
      );

      expect(screen.getByTestId('lazy-package-policy-input-var-field')).toBeInTheDocument();
      expect(screen.getByTestId('secret-field-azure_client_secret')).toBeInTheDocument();
      expect(screen.getByDisplayValue('secret-value')).toBeInTheDocument();
    });
  });

  describe('Validation Behavior', () => {
    it('should not show errors when hasInvalidRequiredVars is false', () => {
      const fields = [
        {
          id: 'azure_tenant_id',
          label: 'Tenant ID',
          type: 'text' as const,
          value: '',
          testSubj: 'azure-tenant-id-field',
          isSecret: false,
        },
      ];

      render(
        <AzureInputVarFields
          fields={fields}
          packageInfo={mockPackageInfo}
          onChange={mockOnChange}
          hasInvalidRequiredVars={false}
        />
      );

      expect(screen.queryByText('Tenant ID is required')).not.toBeInTheDocument();
    });

    it('should show errors when hasInvalidRequiredVars is true and field is empty', () => {
      const fields = [
        {
          id: 'azure_tenant_id',
          label: 'Tenant ID',
          type: 'text' as const,
          value: '',
          testSubj: 'azure-tenant-id-field',
          isSecret: false,
        },
      ];

      render(
        <AzureInputVarFields
          fields={fields}
          packageInfo={mockPackageInfo}
          onChange={mockOnChange}
          hasInvalidRequiredVars={true}
        />
      );

      expect(screen.getByText('Tenant ID is required')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty fields array', () => {
      const fields: Array<{
        id: string;
        label: string;
        type?: 'text' | 'password';
        value: string;
        testSubj?: string;
        isSecret?: boolean;
      }> = [];

      const { container } = render(
        <AzureInputVarFields
          fields={fields}
          packageInfo={mockPackageInfo}
          onChange={mockOnChange}
          hasInvalidRequiredVars={false}
        />
      );

      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });
});
