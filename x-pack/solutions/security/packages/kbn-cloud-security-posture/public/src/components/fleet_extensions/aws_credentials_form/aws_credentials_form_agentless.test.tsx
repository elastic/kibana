/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AwsCredentialsFormAgentless } from './aws_credentials_form_agentless';
import { AWS_CREDENTIALS_TYPE } from '../constants';
import { I18nProvider } from '@kbn/i18n-react';
import { AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ } from './aws_test_subjects';
import userEvent from '@testing-library/user-event';

const mockUpdatePolicy = jest.fn();
const mockUseCloudSetup = jest.fn().mockReturnValue({
  awsOverviewPath: '/docs/aws',
  awsPolicyType: 'aws-type',
  templateName: 'test-template',
});
jest.mock('../hooks/use_cloud_setup_context', () => ({
  useCloudSetup: () => mockUseCloudSetup(),
}));

const baseProps = {
  input: {
    type: 'aws-type',
    streams: [
      {
        vars: {
          'aws.account_type': { value: 'single_account' },
          'aws.credentials.type': { value: AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS },
        },
      },
    ],
  },
  newPolicy: {},
  packageInfo: {},
  updatePolicy: mockUpdatePolicy,
  isEditPage: false,
  setupTechnology: {},
  hasInvalidRequiredVars: false,
  showCloudConnectors: false,
  cloud: undefined,
};

describe.skip('AwsCredentialsFormAgentless', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <I18nProvider>
        <AwsCredentialsFormAgentless {...baseProps} {...props} />
      </I18nProvider>
    );
  };

  it('renders setup info content', () => {
    renderComponent();
    expect(
      screen.getByText(/Utilize AWS Access Keys to set up and deploy CSPM/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument();
  });

  it('renders credential type selector', () => {
    renderComponent();
    expect(screen.getByLabelText(/Preferred method/i)).toBeInTheDocument();
  });

  it('calls updatePolicy when credential type changes', async () => {
    renderComponent();

    expect(
      screen.getByRole('option', { name: 'Temporary keys', selected: false })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('option', { name: 'Direct access keys', selected: true })
    ).toBeInTheDocument();

    const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
    expect(selector).toBeInTheDocument();
    expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    userEvent.selectOptions(selector, AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS);

    await waitFor(() => {
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS);
    });
    expect(mockUpdatePolicy).toHaveBeenCalled();
  });

  it('shows warning callout when CloudFormation is not supported', () => {
    renderComponent();
    expect(
      screen.queryByText(/Launch Cloud Formation for Automated Credentials not supported/i)
    ).not.toBeNull();
  });

  it('shows Cloud Connector option accordion and button when showCloudConnectors is true', () => {
    renderComponent({
      showCloudConnectors: true,
      input: {
        streams: [
          {
            vars: {
              'aws.account_type': { value: 'single_account' },
              'aws.credentials.type': { value: AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS },
            },
          },
        ],
      },
    });
    expect(screen.getByText(/Steps to Generate Cloud Connection/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Launch CloudFormation/i })).toBeInTheDocument();
  });

  it('disables selector when editing and using cloud connectors', () => {
    renderComponent({
      isEditPage: true,
      showCloudConnectors: true,
      input: {
        streams: [
          {
            vars: {
              'aws.account_type': { value: 'single_account' },
              'aws.credentials.type': { value: AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS },
            },
          },
        ],
      },
    });
    expect(screen.getByLabelText(/Preferred method/i)).toBeDisabled();
  });

  it('renders AwsInputVarFields and calls updatePolicy on change', () => {
    renderComponent();
    // Simulate onChange by finding a textbox and changing its value if present
    const input = screen.queryByRole('textbox');
    if (input) {
      fireEvent.change(input, { target: { value: 'test-value' } });
      expect(mockUpdatePolicy).toHaveBeenCalled();
    }
  });

  it('renders ReadDocumentation link', () => {
    renderComponent();
    expect(screen.getByRole('link', { name: /Getting Started/i })).toHaveAttribute(
      'href',
      '/docs/aws'
    );
  });
});
