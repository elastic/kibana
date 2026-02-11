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
import { ORGANIZATION_ACCOUNT, SINGLE_ACCOUNT } from '@kbn/fleet-plugin/common';
import { AwsAccountTypeSelect } from './aws_account_type_selector';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import { createAwsCloudSetupMock } from '../test/cloud_setup_mocks';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';

jest.mock('../hooks/use_cloud_setup_context');

const mockUseCloudSetup = useCloudSetup as jest.Mock;

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
          value: SINGLE_ACCOUNT,
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

const ORGANIZATION_TEXT = 'AWS Organization';
const SINGLE_ACCOUNT_TEXT = 'Single Account';

describe('AwsAccountTypeSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue(
      createAwsCloudSetupMock({
        awsOrganizationEnabled: true,
        awsPolicyType: 'aws-policy-type',
      })
    );
  });

  it('renders both account type options with correct default selection', () => {
    renderComponent();

    // Both radio options should be available
    expect(screen.getByText(ORGANIZATION_TEXT)).toBeInTheDocument();
    expect(screen.getByText(SINGLE_ACCOUNT_TEXT)).toBeInTheDocument();

    // Single Account should be selected by default
    const singleRadio = screen.getByLabelText(SINGLE_ACCOUNT_TEXT);
    const orgRadio = screen.getByLabelText(ORGANIZATION_TEXT);
    expect(singleRadio).toBeChecked();
    expect(orgRadio).not.toBeChecked();
  });

  it('handles user interaction and calls updatePolicy when selection changes', async () => {
    renderComponent();
    const orgRadio = screen.getByLabelText(ORGANIZATION_TEXT);

    await userEvent.click(orgRadio);
    await waitFor(() =>
      expect(mockUpdatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedPolicy: expect.anything(),
        })
      )
    );
  });

  it('displays correct descriptions based on selected account type', () => {
    // Single account description (default)
    renderComponent();
    expect(
      screen.getByText(/Deploying to a single account is suitable for an initial POC/)
    ).toBeInTheDocument();

    // Organization account description
    const orgInput = {
      streams: [
        {
          vars: {
            'aws.account_type': {
              value: ORGANIZATION_ACCOUNT,
            },
          },
        },
      ],
    };
    renderComponent({ input: orgInput });
    expect(screen.getByText(/Connect Elastic to every AWS Account/)).toBeInTheDocument();
  });

  it('handles disabled states correctly', () => {
    // Disabled prop affects all radios
    renderComponent({ disabled: true });
    expect(screen.getByLabelText(SINGLE_ACCOUNT_TEXT)).toBeDisabled();
    expect(screen.getByLabelText(ORGANIZATION_TEXT)).toBeDisabled();
  });

  it('disables AWS Organization when not enabled in cloud setup', () => {
    mockUseCloudSetup.mockReturnValue(
      createAwsCloudSetupMock({
        awsOrganizationEnabled: false,
        awsPolicyType: 'aws',
      })
    );

    renderComponent({ packageInfo: { version: '3.0.0' } });

    const orgRadio = screen.getByLabelText(ORGANIZATION_TEXT);
    expect(orgRadio).toBeDisabled();
    expect(
      screen.getByText(/AWS Organization not supported in current integration version/)
    ).toBeInTheDocument();
  });
});
