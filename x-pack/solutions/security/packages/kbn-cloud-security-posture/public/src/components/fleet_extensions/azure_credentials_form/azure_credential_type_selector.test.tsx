/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AzureCredentialTypeSelector } from './azure_credential_type_selector';
import { AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ } from '@kbn/cloud-security-posture-common';
import type { AzureCredentialsType } from '../types';

// Mock the TechnicalPreviewText component
jest.mock('../common', () => ({
  TechnicalPreviewText: () => (
    <span data-test-subj="technical-preview-text">{'Technical preview'}</span>
  ),
}));

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

const mockOptions = [
  { value: 'cloud_connectors', text: 'Cloud Connectors' },
  { value: 'arm_template', text: 'ARM Template' },
  { value: 'service_principal_with_client_secret', text: 'Service Principal with Client Secret' },
  {
    value: 'service_principal_with_client_certificate',
    text: 'Service Principal with Client Certificate',
  },
  {
    value: 'service_principal_with_client_username_and_password',
    text: 'Service Principal with Username/Password',
  },
  { value: 'managed_identity', text: 'Managed Identity' },
];

describe('AzureCredentialTypeSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the form row with correct label', () => {
      renderWithIntl(
        <AzureCredentialTypeSelector
          type="arm_template"
          onChange={mockOnChange}
          options={mockOptions}
        />
      );

      expect(screen.getByText('Preferred manual method')).toBeInTheDocument();
      expect(screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });

    it('renders with all provided options', () => {
      renderWithIntl(
        <AzureCredentialTypeSelector
          type="arm_template"
          onChange={mockOnChange}
          options={mockOptions}
        />
      );

      const select = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(select).toBeInTheDocument();

      // Check that all options are rendered
      mockOptions.forEach((option) => {
        expect(screen.getByRole('option', { name: option.text })).toBeInTheDocument();
      });
    });

    it('displays the correct selected value', () => {
      renderWithIntl(
        <AzureCredentialTypeSelector
          type="service_principal_with_client_secret"
          onChange={mockOnChange}
          options={mockOptions}
        />
      );

      const select = screen.getByTestId(
        AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ
      ) as HTMLSelectElement;
      expect(select.value).toBe('service_principal_with_client_secret');
    });
  });

  describe('technical preview text', () => {
    it('shows technical preview text when type is cloud_connectors', () => {
      renderWithIntl(
        <AzureCredentialTypeSelector
          type="cloud_connectors"
          onChange={mockOnChange}
          options={mockOptions}
        />
      );

      expect(screen.getByTestId('technical-preview-text')).toBeInTheDocument();
      expect(screen.getByText('Technical preview')).toBeInTheDocument();
    });

    it('does not show technical preview text for non-cloud_connectors types', () => {
      const nonCloudConnectorTypes: AzureCredentialsType[] = [
        'arm_template',
        'service_principal_with_client_secret',
        'service_principal_with_client_certificate',
        'service_principal_with_client_username_and_password',
        'managed_identity',
      ];

      nonCloudConnectorTypes.forEach((type) => {
        const { container } = renderWithIntl(
          <AzureCredentialTypeSelector type={type} onChange={mockOnChange} options={mockOptions} />
        );

        expect(screen.queryByTestId('technical-preview-text')).not.toBeInTheDocument();
        expect(screen.queryByText('Technical preview')).not.toBeInTheDocument();

        // Clean up for next iteration
        container.remove();
      });
    });
  });

  describe('interaction', () => {
    it('calls onChange when a different option is selected', () => {
      renderWithIntl(
        <AzureCredentialTypeSelector
          type="arm_template"
          onChange={mockOnChange}
          options={mockOptions}
        />
      );

      const select = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      fireEvent.change(select, { target: { value: 'service_principal_with_client_secret' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('service_principal_with_client_secret');
    });

    it('calls onChange with cloud_connectors type', () => {
      renderWithIntl(
        <AzureCredentialTypeSelector
          type="arm_template"
          onChange={mockOnChange}
          options={mockOptions}
        />
      );

      const select = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      fireEvent.change(select, { target: { value: 'cloud_connectors' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('cloud_connectors');
    });

    it('calls onChange with managed_identity type', () => {
      renderWithIntl(
        <AzureCredentialTypeSelector
          type="arm_template"
          onChange={mockOnChange}
          options={mockOptions}
        />
      );

      const select = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      fireEvent.change(select, { target: { value: 'managed_identity' } });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('managed_identity');
    });

    it('does not call onChange when the same option is selected', () => {
      renderWithIntl(
        <AzureCredentialTypeSelector
          type="arm_template"
          onChange={mockOnChange}
          options={mockOptions}
        />
      );

      const select = screen.getByTestId(AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      fireEvent.change(select, { target: { value: 'arm_template' } });

      // onChange should still be called even if it's the same value
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('arm_template');
    });
  });
});
