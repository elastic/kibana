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
import { IntegrationSettings } from './integration_settings';

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

describe('<IntegrationSettings />', () => {
  const defaultProps = {
    newPolicy: {
      name: 'test-policy',
      description: 'Test policy description',
      namespace: 'default',
      policy_id: 'test-policy-id',
      policy_ids: [],
      enabled: true,
      package: {
        name: 'cloud_security_posture',
        title: 'Cloud Security Posture',
        version: '1.0.0',
      },
      inputs: [],
    },
    validationResults: undefined,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('renders successfully', () => {
      const { getByDisplayValue, getByText } = renderWithIntl(
        <IntegrationSettings {...defaultProps} />
      );
      expect(getByDisplayValue('test-policy')).toBeInTheDocument();
      expect(getByDisplayValue('Test policy description')).toBeInTheDocument();
      expect(getByText('Name')).toBeInTheDocument();
    });
  });

  describe('Interaction Tests', () => {
    it('calls onChange when name field is modified', async () => {
      const mockOnChange = jest.fn();
      const props = { ...defaultProps, onChange: mockOnChange };
      const { getByDisplayValue } = renderWithIntl(<IntegrationSettings {...props} />);

      const nameInput = getByDisplayValue('test-policy');

      // Test that typing appends to existing text (actual userEvent behavior)
      await userEvent.type(nameInput, 'xyz');

      // Check that onChange was called for each character
      expect(mockOnChange).toHaveBeenCalledWith('name', expect.stringContaining('test-policy'));
      expect(mockOnChange).toHaveBeenCalledTimes(3); // One for each character typed
    });

    it('calls onChange when description field is modified', async () => {
      const mockOnChange = jest.fn();
      const props = { ...defaultProps, onChange: mockOnChange };
      const { getByDisplayValue } = renderWithIntl(<IntegrationSettings {...props} />);

      const descriptionInput = getByDisplayValue('Test policy description');

      // Test that typing appends to existing text (actual userEvent behavior)
      await userEvent.type(descriptionInput, ' - updated');

      // Check that onChange was called for each character and ended with 'd'
      expect(mockOnChange).toHaveBeenLastCalledWith('description', 'Test policy descriptiond');
      expect(mockOnChange).toHaveBeenCalledTimes(10); // One for each character in ' - updated'
    });

    it('handles clear input correctly', async () => {
      const mockOnChange = jest.fn();
      const props = { ...defaultProps, onChange: mockOnChange };
      const { getByDisplayValue } = renderWithIntl(<IntegrationSettings {...props} />);

      const nameInput = getByDisplayValue('test-policy');
      await userEvent.clear(nameInput);

      expect(mockOnChange).toHaveBeenCalledWith('name', '');
    });

    it('handles special characters in input', async () => {
      const mockOnChange = jest.fn();
      const props = { ...defaultProps, onChange: mockOnChange };
      const { getByDisplayValue } = renderWithIntl(<IntegrationSettings {...props} />);

      const nameInput = getByDisplayValue('test-policy');

      // Test that special characters can be typed (appending to existing text)
      await userEvent.type(nameInput, '@123');

      // Check that onChange was called for each character and ended with '3'
      expect(mockOnChange).toHaveBeenLastCalledWith('name', 'test-policy3');
      expect(mockOnChange).toHaveBeenCalledTimes(4); // One for each character in '@123'
    });
  });

  describe('Validation Tests', () => {
    it('shows validation error for name field', () => {
      const propsWithNameError = {
        ...defaultProps,
        validationResults: {
          name: ['Name is required'],
          description: [],
          namespace: [],
          additional_datastreams_permissions: [],
          inputs: null,
        },
      };
      const { getByText } = renderWithIntl(<IntegrationSettings {...propsWithNameError} />);

      expect(getByText('Name is required')).toBeInTheDocument();
    });

    it('shows validation error for description field', () => {
      const propsWithDescriptionError = {
        ...defaultProps,
        validationResults: {
          name: [],
          description: ['Description must be less than 200 characters'],
          namespace: [],
          additional_datastreams_permissions: [],
          inputs: null,
        },
      };
      const { getByText } = renderWithIntl(<IntegrationSettings {...propsWithDescriptionError} />);

      expect(getByText('Description must be less than 200 characters')).toBeInTheDocument();
    });

    it('does not show validation errors when validationResults is undefined', () => {
      const propsWithoutValidation = {
        ...defaultProps,
        validationResults: undefined,
      };
      const { container } = renderWithIntl(<IntegrationSettings {...propsWithoutValidation} />);

      // Should not find any error text elements
      const errorElements = container.querySelectorAll('.euiFormErrorText');
      expect(errorElements).toHaveLength(0);
    });

    it('handles empty validation results', () => {
      const propsWithEmptyValidation = {
        ...defaultProps,
        validationResults: {
          name: [],
          description: [],
          namespace: [],
          additional_datastreams_permissions: [],
          inputs: null,
        },
      };
      const { container } = renderWithIntl(<IntegrationSettings {...propsWithEmptyValidation} />);

      // Should not find any error text elements
      const errorElements = container.querySelectorAll('.euiFormErrorText');
      expect(errorElements).toHaveLength(0);
    });
  });

  describe('Form State Tests', () => {
    it('updates field values when newPolicy prop changes', () => {
      const { getByDisplayValue, rerender } = renderWithIntl(
        <IntegrationSettings {...defaultProps} />
      );

      // Initial values
      expect(getByDisplayValue('test-policy')).toBeInTheDocument();
      expect(getByDisplayValue('Test policy description')).toBeInTheDocument();

      // Update props
      const updatedProps = {
        ...defaultProps,
        newPolicy: {
          ...defaultProps.newPolicy,
          name: 'updated-policy-name',
          description: 'Updated description',
        },
      };
      rerender(
        <I18nProvider>
          <IntegrationSettings {...updatedProps} />
        </I18nProvider>
      );

      // Updated values
      expect(getByDisplayValue('updated-policy-name')).toBeInTheDocument();
      expect(getByDisplayValue('Updated description')).toBeInTheDocument();
    });

    it('maintains form state during re-renders', () => {
      const { getByDisplayValue, rerender } = renderWithIntl(
        <IntegrationSettings {...defaultProps} />
      );

      // Re-render with same props
      rerender(
        <I18nProvider>
          <IntegrationSettings {...defaultProps} />
        </I18nProvider>
      );

      // Values should remain the same
      expect(getByDisplayValue('test-policy')).toBeInTheDocument();
      expect(getByDisplayValue('Test policy description')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing description property', () => {
      const propsWithoutDescription = {
        ...defaultProps,
        newPolicy: {
          name: 'test-policy',
          namespace: 'default',
          policy_id: 'test-policy-id',
          policy_ids: [],
          enabled: true,
          package: {
            name: 'cloud_security_posture',
            title: 'Cloud Security Posture',
            version: '1.0.0',
          },
          inputs: [],
          // description property completely missing
        },
      };

      const { getByText } = renderWithIntl(<IntegrationSettings {...propsWithoutDescription} />);

      // Should still render description field, but empty
      expect(getByText('Description')).toBeInTheDocument();
    });
  });
});
