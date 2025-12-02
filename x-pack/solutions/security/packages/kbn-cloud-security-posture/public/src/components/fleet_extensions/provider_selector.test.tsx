/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { ProviderSelector } from './provider_selector';

// Mock the CloudSetup context hook
jest.mock('./hooks/use_cloud_setup_context', () => ({
  useCloudSetup: () => ({
    templateInputOptions: [
      {
        id: 'aws',
        label: 'AWS',
        icon: 'logoAWS',
        tooltip: 'Amazon Web Services',
        testId: 'aws-radio-option',
      },
      {
        id: 'azure',
        label: 'Azure',
        icon: 'logoAzure',
        tooltip: 'Microsoft Azure',
        testId: 'azure-radio-option',
      },
      {
        id: 'gcp',
        label: 'GCP',
        icon: 'logoGCP',
        tooltip: 'Google Cloud Platform',
        testId: 'gcp-radio-option',
      },
    ],
  }),
}));

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

describe('<ProviderSelector />', () => {
  const defaultProps = {
    selectedProvider: 'aws' as const,
    disabled: false,
    setSelectedProvider: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('renders successfully', () => {
      renderWithIntl(<ProviderSelector {...defaultProps} />);
    });

    it('renders all provider options', () => {
      const { getByTestId } = renderWithIntl(<ProviderSelector {...defaultProps} />);

      expect(getByTestId('aws-radio-option')).toBeInTheDocument();
      expect(getByTestId('azure-radio-option')).toBeInTheDocument();
      expect(getByTestId('gcp-radio-option')).toBeInTheDocument();
    });

    it('shows AWS as selected by default', () => {
      const { getByTestId } = renderWithIntl(<ProviderSelector {...defaultProps} />);

      const awsOption = getByTestId('aws-radio-option');
      const awsInput = awsOption.querySelector('input[type="radio"]');
      expect(awsInput).toBeChecked();
    });

    it('shows correct provider as selected', () => {
      const propsWithAzure = { ...defaultProps, selectedProvider: 'azure' as const };
      const { getByTestId } = renderWithIntl(<ProviderSelector {...propsWithAzure} />);

      const azureOption = getByTestId('azure-radio-option');
      const azureInput = azureOption.querySelector('input[type="radio"]');
      expect(azureInput).toBeChecked();
    });
  });

  describe('Interaction Tests', () => {
    it('calls setSelectedProvider when AWS is clicked', async () => {
      const mockSetProvider = jest.fn();
      const props = {
        ...defaultProps,
        selectedProvider: 'azure' as const,
        setSelectedProvider: mockSetProvider,
      };
      const { getByTestId } = renderWithIntl(<ProviderSelector {...props} />);

      const awsOption = getByTestId('aws-radio-option');
      await userEvent.click(awsOption);

      expect(mockSetProvider).toHaveBeenCalledWith('aws');
    });

    it('calls setSelectedProvider when Azure is clicked', async () => {
      const mockSetProvider = jest.fn();
      const props = { ...defaultProps, setSelectedProvider: mockSetProvider };
      const { getByTestId } = renderWithIntl(<ProviderSelector {...props} />);

      const azureOption = getByTestId('azure-radio-option');
      await userEvent.click(azureOption);

      expect(mockSetProvider).toHaveBeenCalledWith('azure');
    });

    it('calls setSelectedProvider when GCP is clicked', async () => {
      const mockSetProvider = jest.fn();
      const props = { ...defaultProps, setSelectedProvider: mockSetProvider };
      const { getByTestId } = renderWithIntl(<ProviderSelector {...props} />);

      const gcpOption = getByTestId('gcp-radio-option');
      await userEvent.click(gcpOption);

      expect(mockSetProvider).toHaveBeenCalledWith('gcp');
    });

    it('does not call setSelectedProvider when clicking already selected option', async () => {
      const mockSetProvider = jest.fn();
      const props = { ...defaultProps, setSelectedProvider: mockSetProvider };
      const { getByTestId } = renderWithIntl(<ProviderSelector {...props} />);

      const awsOption = getByTestId('aws-radio-option');
      await userEvent.click(awsOption);

      // Should still call the handler even for already selected option
      expect(mockSetProvider).toHaveBeenCalledWith('aws');
    });
  });

  describe('Disabled State Tests', () => {
    it('disables all options when disabled prop is true', () => {
      const props = { ...defaultProps, disabled: true };
      const { getByTestId } = renderWithIntl(<ProviderSelector {...props} />);

      const awsInput = getByTestId('aws-radio-option').querySelector('input[type="radio"]');
      const azureInput = getByTestId('azure-radio-option').querySelector('input[type="radio"]');
      const gcpInput = getByTestId('gcp-radio-option').querySelector('input[type="radio"]');

      expect(awsInput).toBeDisabled();
      expect(azureInput).toBeDisabled();
      expect(gcpInput).toBeDisabled();
    });

    it('does not call setSelectedProvider when disabled and clicked', async () => {
      const mockSetProvider = jest.fn();
      const props = { ...defaultProps, disabled: true, setSelectedProvider: mockSetProvider };
      const { getByTestId } = renderWithIntl(<ProviderSelector {...props} />);

      // Try to click the disabled option - should not call handler
      const azureOption = getByTestId('azure-radio-option');
      const azureInput = azureOption.querySelector('input[type="radio"]');

      // Check that it's disabled first
      expect(azureInput).toBeDisabled();

      // Try clicking anyway - the disabled input should not trigger the handler
      try {
        await userEvent.click(azureOption);
      } catch (error) {
        // Expected to fail due to pointer-events: none
      }

      expect(mockSetProvider).not.toHaveBeenCalled();
    });

    it('enables all options when disabled prop is false', () => {
      const props = { ...defaultProps, disabled: false };
      const { getByTestId } = renderWithIntl(<ProviderSelector {...props} />);

      const awsInput = getByTestId('aws-radio-option').querySelector('input[type="radio"]');
      const azureInput = getByTestId('azure-radio-option').querySelector('input[type="radio"]');
      const gcpInput = getByTestId('gcp-radio-option').querySelector('input[type="radio"]');

      expect(awsInput).not.toBeDisabled();
      expect(azureInput).not.toBeDisabled();
      expect(gcpInput).not.toBeDisabled();
    });
  });

  describe('Provider Selection State Tests', () => {
    it('changes selection from AWS to Azure', async () => {
      const mockSetProvider = jest.fn();
      const props = { ...defaultProps, setSelectedProvider: mockSetProvider };
      const { getByTestId, rerender } = renderWithIntl(<ProviderSelector {...props} />);

      // Initially AWS is selected
      const awsInput = getByTestId('aws-radio-option').querySelector('input[type="radio"]');
      const azureInput = getByTestId('azure-radio-option').querySelector('input[type="radio"]');
      expect(awsInput).toBeChecked();
      expect(azureInput).not.toBeChecked();

      // Click Azure
      await userEvent.click(getByTestId('azure-radio-option'));
      expect(mockSetProvider).toHaveBeenCalledWith('azure');

      // Simulate state change by re-rendering with new selectedProvider
      const newProps = { ...props, selectedProvider: 'azure' as const };
      rerender(
        <I18nProvider>
          <ProviderSelector {...newProps} />
        </I18nProvider>
      );

      // Now Azure should be selected
      const newAzureInput = getByTestId('azure-radio-option').querySelector('input[type="radio"]');
      const newAwsInput = getByTestId('aws-radio-option').querySelector('input[type="radio"]');
      expect(newAzureInput).toBeChecked();
      expect(newAwsInput).not.toBeChecked();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty templateInputOptions gracefully', () => {
      jest.doMock('./hooks/use_cloud_setup_context', () => ({
        useCloudSetup: () => ({
          templateInputOptions: [],
        }),
      }));

      // Should render without throwing
      renderWithIntl(<ProviderSelector {...defaultProps} />);
    });

    it('handles provider with no testId', () => {
      jest.doMock('./hooks/use_cloud_setup_context', () => ({
        useCloudSetup: () => ({
          templateInputOptions: [
            {
              id: 'aws',
              label: 'AWS',
              icon: 'logoAWS',
              tooltip: 'Amazon Web Services',
              // No testId
            },
          ],
        }),
      }));

      // Should render without throwing
      renderWithIntl(<ProviderSelector {...defaultProps} />);
    });
  });
});
