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
  getAwsCredentialsFormAgentlessOptions,
  getAwsCredentialsFormManualOptions,
} from './get_aws_credentials_form_options';

const formOptions = getAwsCredentialsFormManualOptions();
const formAgentlessOptions = getAwsCredentialsFormAgentlessOptions();

describe('AwsCredentialTypeSelector', () => {
  const label = 'AWS Credential Type';
  const onChange = jest.fn();

  it('renders with given props', () => {
    render(
      <AwsCredentialTypeSelector
        type={'direct_access_keys'}
        onChange={onChange}
        label={label}
        options={formOptions}
        disabled={false}
      />
    );
    expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(
      <AwsCredentialTypeSelector
        type={'direct_access_keys'}
        onChange={onChange}
        label={label}
        options={formOptions}
        disabled={false}
      />
    );
    formOptions.forEach((option) => {
      expect(screen.getByRole('option', { name: option.text })).toBeInTheDocument();
    });
  });

  it('calls onChange with correct value when selection changes', () => {
    render(
      <AwsCredentialTypeSelector
        type={'direct_access_keys'}
        onChange={onChange}
        label={label}
        options={formOptions}
        disabled={false}
      />
    );
    fireEvent.change(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ), {
      target: { value: 'assume_role' },
    });
    expect(onChange).toHaveBeenCalledWith('assume_role');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <AwsCredentialTypeSelector
        type={'direct_access_keys'}
        onChange={onChange}
        label={label}
        options={formOptions}
        disabled={true}
      />
    );
    expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeDisabled();
  });

  it('shows the correct selected value', () => {
    render(
      <AwsCredentialTypeSelector
        type={'assume_role'}
        onChange={onChange}
        label={label}
        options={formOptions}
        disabled={false}
      />
    );
    const select = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ) as HTMLSelectElement;
    expect(select.value).toBe('assume_role');
  });

  it('renders agentless options when provided', () => {
    render(
      <AwsCredentialTypeSelector
        type={'cloud_connectors'}
        onChange={onChange}
        label={label}
        options={formAgentlessOptions}
        disabled={false}
      />
    );
    formAgentlessOptions.forEach((option) => {
      expect(screen.getByRole('option', { name: option.text })).toBeInTheDocument();
    });
  });
  it('shows the cloud connectors option when type is cloud_connectors', () => {
    const cloudConnectorAwsOptions = getAwsCredentialsCloudConnectorsFormAgentlessOptions();
    render(
      <AwsCredentialTypeSelector
        type={'cloud_connectors'}
        onChange={onChange}
        label={label}
        options={cloudConnectorAwsOptions}
        disabled={false}
      />
    );
    expect(
      screen
        .getAllByRole('option')
        .some((option) => /cloud connectors/i.test(option.textContent || ''))
    ).toBe(true);
  });
});
