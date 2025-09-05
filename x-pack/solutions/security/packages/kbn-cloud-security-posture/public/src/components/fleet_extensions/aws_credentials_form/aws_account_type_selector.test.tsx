/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { AWS_ORGANIZATION_ACCOUNT, AWS_SINGLE_ACCOUNT } from '@kbn/cloud-security-posture-common';
import { AwsAccountTypeSelect } from './aws_account_type_selector';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';

jest.mock('../hooks/use_cloud_setup_context');
(useCloudSetup as jest.Mock).mockReturnValue({
  awsOrganizationEnabled: true,
  awsPolicyType: 'aws-policy-type',
});

const mockUpdatePolicy = jest.fn();

const defaultInput: NewPackagePolicyInput = {
  type: 'aws-policy-type',
  enabled: true,
  streams: [
    {
      enabled: true,
      data_stream: { type: 'aws-policy-type', dataset: 'aws.test' },
      vars: {
        'aws.account_type': {
          value: AWS_SINGLE_ACCOUNT,
        },
      },
    },
  ],
};

const defaultNewPolicy = {
  inputs: [defaultInput],
} as NewPackagePolicy;

const defaultPackageInfo = { version: '1.5.0' } as PackageInfo;

const renderComponent = (props = {}) => {
  return render(
    <I18nProvider>
      <AwsAccountTypeSelect
        input={defaultInput}
        newPolicy={defaultNewPolicy}
        updatePolicy={mockUpdatePolicy}
        packageInfo={defaultPackageInfo}
        disabled={false}
        {...props}
      />
    </I18nProvider>
  );
};

describe('AwsAccountTypeSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders radio options', () => {
    renderComponent();
    expect(screen.getByText('AWS Organization')).toBeInTheDocument();
    expect(screen.getByText('Single Account')).toBeInTheDocument();
  });

  it('selects the correct radio based on input', () => {
    renderComponent();
    const singleRadio = screen.getByLabelText('Single Account');
    expect(singleRadio).toBeChecked();
  });

  it('calls updatePolicy when radio is changed', async () => {
    renderComponent();
    const singleRadio = screen.getByLabelText('Single Account');
    expect(singleRadio).toBeChecked();
    const orgRadio = screen.getByLabelText('AWS Organization');
    expect(orgRadio).not.toBeChecked();
    await userEvent.click(orgRadio);
    await waitFor(() =>
      expect(mockUpdatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedPolicy: expect.anything(),
        })
      )
    );
  });

  it('disables AWS Organization radio if awsOrganizationEnabled is false', () => {
    (useCloudSetup as jest.Mock).mockReturnValue({
      awsOrganizationEnabled: false,
      awsPolicyType: 'aws',
    });
    renderComponent({
      packageInfo: { version: '3.0.0' },
    });
    const orgRadio = screen.getByLabelText('AWS Organization');
    expect(orgRadio).toBeDisabled();
    expect(
      screen.getByText(/AWS Organization not supported in current integration version/)
    ).toBeInTheDocument();
  });

  it('shows organization description when AWS Organization is selected', () => {
    const input = {
      streams: [
        {
          vars: {
            'aws.account_type': {
              value: AWS_ORGANIZATION_ACCOUNT,
            },
          },
        },
      ],
    };
    renderComponent({ input });
    expect(screen.getByText(/Connect Elastic to every AWS Account/)).toBeInTheDocument();
  });

  it('shows single account description when Single Account is selected', () => {
    renderComponent();
    expect(
      screen.getByText(/Deploying to a single account is suitable for an initial POC/)
    ).toBeInTheDocument();
  });

  it('disables all radios if disabled prop is true', () => {
    renderComponent({ disabled: true });
    expect(screen.getByLabelText('Single Account')).toBeDisabled();
    expect(screen.getByLabelText('AWS Organization')).toBeDisabled();
  });
});
