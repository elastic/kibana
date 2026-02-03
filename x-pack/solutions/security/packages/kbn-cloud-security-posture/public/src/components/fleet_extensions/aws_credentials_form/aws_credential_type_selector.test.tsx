/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AwsCredentialTypeSelector } from './aws_credential_type_selector';
import { AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ } from '@kbn/cloud-security-posture-common';
import {
  getAwsCredentialsCloudConnectorsFormAgentlessOptions,
  getAwsCredentialsFormManualOptions,
} from './get_aws_credentials_form_options';

describe('AwsCredentialTypeSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Manual credentials options', () => {
    const manualOptions = getAwsCredentialsFormManualOptions();

    it('renders all manual options, displays selected value, and handles selection changes', () => {
      render(
        <AwsCredentialTypeSelector
          type="direct_access_keys"
          onChange={mockOnChange}
          label="AWS Credential Type"
          options={manualOptions}
          disabled={false}
        />
      );

      // Verify all options are rendered
      manualOptions.forEach((option) => {
        expect(screen.getByRole('option', { name: option.text })).toBeInTheDocument();
      });

      const select = screen.getByTestId(
        AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ
      ) as HTMLSelectElement;
      expect(select.value).toBe('direct_access_keys');

      // Test selection change
      fireEvent.change(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ), {
        target: { value: 'assume_role' },
      });
      expect(mockOnChange).toHaveBeenCalledWith('assume_role');
    });

    it('displays correct selected value and disabled state', () => {
      render(
        <AwsCredentialTypeSelector
          type="assume_role"
          onChange={mockOnChange}
          label="AWS Credential Type"
          options={manualOptions}
          disabled={true}
        />
      );

      const select = screen.getByTestId(
        AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ
      ) as HTMLSelectElement;
      expect(select.value).toBe('assume_role');
      expect(select).toBeDisabled();
    });
  });

  describe('Agentless credentials options', () => {
    const agentlessOptions = getAwsCredentialsCloudConnectorsFormAgentlessOptions();

    it('renders agentless options, displays selected value, and handles selection changes', () => {
      render(
        <AwsCredentialTypeSelector
          type="direct_access_keys"
          onChange={mockOnChange}
          label="AWS Credential Type"
          options={agentlessOptions}
          disabled={false}
        />
      );

      // Verify all agentless options are rendered
      agentlessOptions.forEach((option) => {
        expect(screen.getByRole('option', { name: option.text })).toBeInTheDocument();
      });

      const select = screen.getByTestId(
        AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ
      ) as HTMLSelectElement;
      expect(select.value).toBe('direct_access_keys');

      // Test selection change for agentless options
      fireEvent.change(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ), {
        target: { value: 'cloud_connectors' },
      });
      expect(mockOnChange).toHaveBeenCalledWith('cloud_connectors');
    });
  });
});
