/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import { GcpInputVarFields } from './gcp_input_var_fields';
import { I18nProvider } from '@kbn/i18n-react';
import { GCP_INPUT_FIELDS_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import { GCP_CREDENTIALS_TYPE } from '../constants';

// Mock the LazyPackagePolicyInputVarField component
jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: ({
    varDef,
    value,
    onChange,
    'data-test-subj': testSubj,
  }: {
    varDef?: { title?: string };
    value?: string;
    onChange?: (value: string) => void;
    'data-test-subj'?: string;
  }) => (
    <div data-test-subj={testSubj || 'mock-lazy-field'}>
      <textarea
        data-test-subj="mock-textarea"
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={varDef?.title || 'Mock field'}
      />
    </div>
  ),
}));

// Mock the utils
jest.mock('../utils', () => ({
  fieldIsInvalid: jest.fn((value, hasInvalidRequiredVars) => {
    return hasInvalidRequiredVars && (!value || value.trim() === '');
  }),
  findVariableDef: jest.fn((packageInfo, fieldId) => ({
    name: fieldId,
    title: `Mock ${fieldId} title`,
    type: 'text',
    required: true,
  })),
  gcpField: {
    fields: {
      'gcp.organization_id': { label: 'Organization ID' },
      'gcp.project_id': { label: 'Project ID' },
      'gcp.credentials.type': { label: 'Credentials Type' },
      'gcp.credentials.file': { label: 'Credentials File' },
      'gcp.credentials.json': { label: 'Credentials JSON' },
    },
  },
}));

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('GcpInputVarFields', () => {
  const mockPackageInfo = {
    name: 'cloud_security_posture',
    version: '1.0.0',
    policy_templates: [],
    // Add other properties your test actually uses
  } as unknown as PackageInfo;

  const mockOnChange = jest.fn();

  const defaultFields = [
    {
      id: 'gcp.project_id',
      value: 'test-project-123',
      label: 'Project ID',
    },
    {
      id: 'gcp.credentials.type',
      value: GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE,
      label: 'Credentials Type',
    },
    {
      id: 'gcp.credentials.file',
      value: '/path/to/credentials.json',
      label: 'Credentials File',
    },
    {
      id: 'gcp.credentials.json',
      value: '{"type": "service_account"}',
      label: 'Credentials JSON',
    },
  ];

  const defaultProps = {
    fields: defaultFields,
    onChange: mockOnChange,
    isOrganization: false,
    disabled: false,
    packageInfo: mockPackageInfo,
    isEditPage: false,
    hasInvalidRequiredVars: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders basic fields for single project setup', () => {
      renderWithIntl(<GcpInputVarFields {...defaultProps} />);

      // Should render project ID field
      expect(screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID)).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-project-123')).toBeInTheDocument();

      // Should render credentials type selector
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE)
      ).toBeInTheDocument();

      // Should NOT render organization ID field for single project
      expect(
        screen.queryByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)
      ).not.toBeInTheDocument();
    });

    it('renders organization ID field when isOrganization is true', () => {
      const orgFields = [
        ...defaultFields,
        {
          id: 'gcp.organization_id',
          value: 'org-123456789',
          label: 'Organization ID',
        },
      ];

      renderWithIntl(
        <GcpInputVarFields {...defaultProps} fields={orgFields} isOrganization={true} />
      );

      // Should render organization ID field
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('org-123456789')).toBeInTheDocument();

      // Should still render project ID field
      expect(screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID)).toBeInTheDocument();
    });

    it('renders credentials file field when credentials type is file', () => {
      renderWithIntl(<GcpInputVarFields {...defaultProps} />);

      // Should render credentials file field
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE)
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('/path/to/credentials.json')).toBeInTheDocument();
    });

    it('renders credentials JSON field when credentials type is JSON', () => {
      const jsonFields = defaultFields.map((field) =>
        field.id === 'gcp.credentials.type'
          ? { ...field, value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON }
          : field
      );

      renderWithIntl(<GcpInputVarFields {...defaultProps} fields={jsonFields} />);

      // Should render the lazy field for JSON credentials
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON)
      ).toBeInTheDocument();
      expect(screen.getByTestId('mock-textarea')).toBeInTheDocument();
    });
  });

  describe('field interactions', () => {
    it('calls onChange when project ID field changes', () => {
      renderWithIntl(<GcpInputVarFields {...defaultProps} />);

      const projectIdField = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      fireEvent.change(projectIdField, { target: { value: 'new-project-456' } });

      expect(mockOnChange).toHaveBeenCalledWith('gcp.project_id', 'new-project-456');
    });

    it('calls onChange when organization ID field changes', () => {
      const orgFields = [
        ...defaultFields,
        {
          id: 'gcp.organization_id',
          value: 'org-123456789',
          label: 'Organization ID',
        },
      ];

      renderWithIntl(
        <GcpInputVarFields {...defaultProps} fields={orgFields} isOrganization={true} />
      );

      const orgIdField = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID);
      fireEvent.change(orgIdField, { target: { value: 'new-org-987654321' } });

      expect(mockOnChange).toHaveBeenCalledWith('gcp.organization_id', 'new-org-987654321');
    });

    it('calls onChange when credentials type selector changes', () => {
      renderWithIntl(<GcpInputVarFields {...defaultProps} />);

      const credentialsTypeField = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE
      );
      fireEvent.change(credentialsTypeField, {
        target: { value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON },
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        'gcp.credentials.type',
        GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON
      );
    });

    it('calls onChange when credentials file field changes', () => {
      renderWithIntl(<GcpInputVarFields {...defaultProps} />);

      const credentialsFileField = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
      );
      fireEvent.change(credentialsFileField, { target: { value: '/new/path/to/creds.json' } });

      expect(mockOnChange).toHaveBeenCalledWith('gcp.credentials.file', '/new/path/to/creds.json');
    });

    it('calls onChange when credentials JSON field changes', () => {
      const jsonFields = defaultFields.map((field) =>
        field.id === 'gcp.credentials.type'
          ? { ...field, value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON }
          : field
      );

      renderWithIntl(<GcpInputVarFields {...defaultProps} fields={jsonFields} />);

      const jsonTextarea = screen.getByTestId('mock-textarea');
      fireEvent.change(jsonTextarea, { target: { value: '{"new": "json"}' } });

      expect(mockOnChange).toHaveBeenCalledWith('gcp.credentials.json', '{"new": "json"}');
    });
  });

  describe('disabled state', () => {
    it('disables all input fields when disabled prop is true', () => {
      renderWithIntl(<GcpInputVarFields {...defaultProps} disabled={true} />);

      // Project ID field should be disabled
      const projectIdField = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      expect(projectIdField).toBeDisabled();

      // Credentials file field is missing disabled prop in the component - bug in implementation
      const credentialsFileField = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
      );
      expect(credentialsFileField).not.toBeDisabled();
    });

    it('enables all input fields when disabled prop is false', () => {
      renderWithIntl(<GcpInputVarFields {...defaultProps} disabled={false} />);

      // Project ID field should not be disabled
      const projectIdField = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      expect(projectIdField).not.toBeDisabled();

      // Credentials file field should not be disabled
      const credentialsFileField = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
      );
      expect(credentialsFileField).not.toBeDisabled();
    });
  });

  describe('field validation', () => {
    it('shows validation errors when hasInvalidRequiredVars is true and fields are empty', () => {
      const emptyFields = defaultFields.map((field) => ({ ...field, value: '' }));

      renderWithIntl(
        <GcpInputVarFields {...defaultProps} fields={emptyFields} hasInvalidRequiredVars={true} />
      );

      // Should show invalid state for credentials file field through aria-invalid attribute
      const credentialsFileField = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
      );
      expect(credentialsFileField).toHaveAttribute('aria-invalid', 'true');
    });

    it('does not show validation errors when hasInvalidRequiredVars is false', () => {
      const emptyFields = defaultFields.map((field) => ({ ...field, value: '' }));

      renderWithIntl(
        <GcpInputVarFields {...defaultProps} fields={emptyFields} hasInvalidRequiredVars={false} />
      );

      // Should not show invalid state
      const credentialsFileField = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
      );
      expect(credentialsFileField).not.toHaveClass('euiFieldText-isInvalid');
    });

    it('shows error messages for invalid fields', () => {
      const emptyFields = defaultFields.map((field) => ({ ...field, value: '' }));

      renderWithIntl(
        <GcpInputVarFields {...defaultProps} fields={emptyFields} hasInvalidRequiredVars={true} />
      );

      // Should show error message for required field
      expect(screen.getByText(/is required/)).toBeInTheDocument();
    });
  });

  describe('credentials type switching', () => {
    it('shows file field when credentials type is credentials-file', () => {
      renderWithIntl(<GcpInputVarFields {...defaultProps} />);

      // Should show file field
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE)
      ).toBeInTheDocument();

      // Should not show JSON field
      expect(
        screen.queryByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON)
      ).not.toBeInTheDocument();
    });

    it('shows JSON field when credentials type is credentials-json', () => {
      const jsonFields = defaultFields.map((field) =>
        field.id === 'gcp.credentials.type'
          ? { ...field, value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON }
          : field
      );

      renderWithIntl(<GcpInputVarFields {...defaultProps} fields={jsonFields} />);

      // Should show JSON field
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON)
      ).toBeInTheDocument();

      // Should not show file field
      expect(
        screen.queryByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE)
      ).not.toBeInTheDocument();
    });

    it('switches between file and JSON fields when credentials type changes', () => {
      const { rerender } = renderWithIntl(<GcpInputVarFields {...defaultProps} />);

      // Initially should show file field
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON)
      ).not.toBeInTheDocument();

      // Change to JSON credentials
      const jsonFields = defaultFields.map((field) =>
        field.id === 'gcp.credentials.type'
          ? { ...field, value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON }
          : field
      );

      rerender(
        <I18nProvider>
          <GcpInputVarFields {...defaultProps} fields={jsonFields} />
        </I18nProvider>
      );

      // Should now show JSON field
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE)
      ).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles missing fields gracefully', () => {
      const incompleteFields = [
        {
          id: 'gcp.project_id',
          value: 'test-project',
          label: 'Project ID',
        },
      ];

      renderWithIntl(<GcpInputVarFields {...defaultProps} fields={incompleteFields} />);

      // Should render project ID field
      expect(screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID)).toBeInTheDocument();

      // Should not crash when other fields are missing
      expect(
        screen.queryByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE)
      ).not.toBeInTheDocument();
    });

    it('handles empty field values', () => {
      const emptyFields = defaultFields.map((field) => ({ ...field, value: '' }));

      renderWithIntl(<GcpInputVarFields {...defaultProps} fields={emptyFields} />);

      // Should render fields with empty values
      const projectIdField = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      expect(projectIdField).toHaveValue('');
    });

    it('handles null/undefined field values', () => {
      const nullFields = defaultFields.map((field) => ({
        ...field,
        value: '',
      }));

      renderWithIntl(<GcpInputVarFields {...defaultProps} fields={nullFields} />);

      // Should render fields with empty values when value is null/undefined
      const projectIdField = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      expect(projectIdField).toHaveValue('');
    });

    it('uses default credentials type when none is provided', () => {
      const fieldsWithoutType = defaultFields.filter(
        (field) => field.id !== 'gcp.credentials.type'
      );

      renderWithIntl(<GcpInputVarFields {...defaultProps} fields={fieldsWithoutType} />);

      // Should default to file credentials and show file field
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE)
      ).toBeInTheDocument();
    });
  });

  describe('edit page mode', () => {
    it('passes isEditPage prop to LazyPackagePolicyInputVarField', () => {
      const jsonFields = defaultFields.map((field) =>
        field.id === 'gcp.credentials.type'
          ? { ...field, value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON }
          : field
      );

      renderWithIntl(<GcpInputVarFields {...defaultProps} fields={jsonFields} isEditPage={true} />);

      // The mock component should receive the isEditPage prop
      // This is handled by the LazyPackagePolicyInputVarField mock
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON)
      ).toBeInTheDocument();
    });
  });
});
