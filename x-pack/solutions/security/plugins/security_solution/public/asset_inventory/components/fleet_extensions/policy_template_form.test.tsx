/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from '../../test/test_provider';
import {
  getAwsPackageInfoMock,
  getMockPackageInfo,
  getMockPackageInfoAssetGCP,
  getMockPackageInfoAssetInventoryAWS,
  getMockPolicyAWS,
  getMockPolicyAzure,
  getMockPolicyGCP,
  getPackageInfoMock,
} from './mocks';
import type { NewPackagePolicy, PackageInfo, PackagePolicy } from '@kbn/fleet-plugin/common';
import { useParams } from 'react-router-dom';
import { ExperimentalFeaturesService } from '@kbn/fleet-plugin/public/services';
import { createFleetTestRendererMock } from '@kbn/fleet-plugin/public/mock';
import { CLOUDBEAT_AWS } from './aws_credentials_form/constants';
import { getAssetPolicy } from './utils';
import {
  CLOUDBEAT_GCP,
  GCP_ORGANIZATION_ACCOUNT,
  GCP_SINGLE_ACCOUNT,
} from './gcp_credentials_form/constants';
import {
  AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ,
  AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS,
  CAI_AZURE_OPTION_TEST_SUBJ,
  CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS,
  CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS,
  CAI_GCP_OPTION_TEST_SUBJ,
  GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ,
  SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ,
} from './test_subjects';
import { CLOUDBEAT_AZURE } from './azure_credentials_form/constants';
import CloudAssetInventoryPolicyTemplateForm from './policy_template_form';
import { useKibana } from '../../hooks/use_kibana';
import { SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING } from '@kbn/management-settings-ids';

// mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({
    integration: undefined,
  }),
}));
jest.mock('@kbn/fleet-plugin/public/services/experimental_features');

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

const onChange = jest.fn();
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

describe('<CloudAssetinventoryPolicyTemplateForm />', () => {
  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({
      integration: undefined,
    });

    mockedExperimentalFeaturesService.get.mockReturnValue({
      secretsStorage: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cloud: {
          csp: 'aws',
          cloudId: 'mock-cloud-id',
          deploymentId: 'mock-deployment-id',
          serverless: { projectId: '' },
          isCloudEnabled: true,
        },
        uiSettings: {
          get: (key: string) => false,
        },
      },
    });

    onChange.mockClear();
  });

  const WrappedComponent = ({
    newPolicy,
    edit = false,
    packageInfo = {} as PackageInfo,
    isAgentlessEnabled,
    integrationToEnable,
  }: {
    edit?: boolean;
    newPolicy: NewPackagePolicy;
    packageInfo?: PackageInfo;
    isAgentlessEnabled?: boolean;
    integrationToEnable?: string;
  }) => {
    const { AppWrapper: FleetAppWrapper } = createFleetTestRendererMock();
    return (
      <FleetAppWrapper>
        <TestProvider>
          {edit && (
            <CloudAssetInventoryPolicyTemplateForm
              policy={newPolicy as PackagePolicy}
              newPolicy={newPolicy}
              onChange={onChange}
              packageInfo={packageInfo}
              isEditPage={true}
              isAgentlessEnabled={isAgentlessEnabled}
              integrationToEnable={integrationToEnable}
            />
          )}
          {!edit && (
            <CloudAssetInventoryPolicyTemplateForm
              newPolicy={newPolicy}
              onChange={onChange}
              packageInfo={packageInfo}
              isEditPage={false}
              isAgentlessEnabled={isAgentlessEnabled}
              integrationToEnable={integrationToEnable}
            />
          )}
        </TestProvider>
      </FleetAppWrapper>
    );
  };

  it('renders and updates name field', async () => {
    const policy = getMockPolicyAWS();
    const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
    const name = getByLabelText('Name');
    expect(name).toBeInTheDocument();

    await userEvent.type(name, '1');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: { ...policy, name: `${policy.name}1` },
      });
    });
  });

  it('renders and updates description field', async () => {
    const policy = getMockPolicyAWS();
    const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
    const description = getByLabelText('Description');
    expect(description).toBeInTheDocument();

    await userEvent.type(description, '1');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: { ...policy, description: `${policy.description}1` },
      });
    });
  });

  it('renders CSP input selector', () => {
    const { getByLabelText } = render(<WrappedComponent newPolicy={getMockPolicyAWS()} />);

    const option1 = getByLabelText('AWS');
    const option2 = getByLabelText('GCP');
    const option3 = getByLabelText('Azure');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option3).toBeInTheDocument();
    expect(option1).toBeEnabled();
    expect(option2).toBeEnabled();
    expect(option3).toBeEnabled();
    expect(option1).toBeChecked();
  });

  it('renders disabled CSP inputs when editing', () => {
    const { getByLabelText } = render(
      <WrappedComponent newPolicy={getMockPolicyAWS()} edit={true} />
    );

    const option1 = getByLabelText('AWS');
    const option2 = getByLabelText('GCP');
    const option3 = getByLabelText('Azure');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option3).toBeInTheDocument();
    expect(option1).toBeDisabled();
    expect(option2).toBeDisabled();
    expect(option3).toBeDisabled();
    expect(option1).toBeChecked();
  });

  // it('selects default CSP input selector', async () => {
  //   const policy = getMockPolicyAWS();
  //   // enable all inputs of a policy template, same as fleet does
  //   policy.inputs = policy.inputs.map((input) => ({
  //     ...input,
  //     enabled: input.policy_template === 'asset_inventory',
  //   }));
  //   policy.name = 'cloud_asset_inventory-1';

  //   (useParams as jest.Mock).mockReturnValue({
  //     integration: 'cloud_asset_inventory',
  //   });

  //   render(<WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo()} />);

  //   const updatedPolicy = {
  //     ...getMockPolicyAWS(),
  //     name: 'cloud_asset_inventory-1',
  //     inputs: policy.inputs.map((input) => {
  //       if (input.type === CLOUDBEAT_AWS) {
  //         return {
  //           ...input,
  //           enabled: true,
  //         };
  //       }
  //       return input;
  //     }),
  //   };

  //   // 1st call happens on mount and selects the CloudFormation template
  //   await waitFor(() => {
  //     expect(onChange).toHaveBeenCalledWith({
  //       isValid: true,
  //       updatedPolicy,
  //     });
  //   });

  //   // // 2nd call happens on mount and increments cspm template enabled input
  //   // expect(onChange).toHaveBeenCalledWith({
  //   //   isValid: true,
  //   //   updatedPolicy: {
  //   //     ...getMockPolicyAWS(),
  //   //     inputs: policy.inputs.map((input) => {
  //   //       if (input.type === CLOUDBEAT_AWS) {
  //   //         return {
  //   //           ...input,
  //   //           enabled: true,
  //   //           config: { cloud_formation_template_url: { value: 's3_url' } },
  //   //         };
  //   //       }
  //   //       return input;
  //   //     }),
  //   //     name: 'cloud_asset_inventory-1',
  //   //   },
  //   // });

  //   // const updatedPolicy2 = {
  //   //   ...getMockPolicyAWS(),
  //   //   inputs: policy.inputs.map((input) => ({
  //   //     ...input,
  //   //     enabled: input.policy_template === 'cloud_asset_inventory',
  //   //   })),
  //   //   name: 'cloud_asset_inventory-2',
  //   // };

  //   // onChange({
  //   //   isValid: true,
  //   //   updatedPolicy: updatedPolicy2,
  //   // });

  //   // expect(onChange).toHaveBeenCalledWith({
  //   //   isValid: true,
  //   //   updatedPolicy: updatedPolicy2,
  //   // });
  // });

  describe('AWS Credentials input fields', () => {
    it(`renders ${CLOUDBEAT_AWS} Account Type field, AWS Single account is enabled`, () => {
      const { getByLabelText } = render(
        <WrappedComponent
          newPolicy={getAssetPolicy(getMockPolicyAWS(), CLOUDBEAT_AWS)}
          packageInfo={{ version: '1.0.0' } as PackageInfo}
        />
      );
      expect(getByLabelText('Single Account')).toBeInTheDocument();
      expect(getByLabelText('AWS Organization')).toBeInTheDocument();
      expect(getByLabelText('Single Account')).toBeEnabled();
    });
    it(`documentation Hyperlink should have correct URL to redirect users to elastic page if user chose Manual`, () => {
      let policy = getMockPolicyAWS();
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetInventoryAWS()} />
      );
      expect(getByTestId('externalLink')).toHaveAttribute(
        'href',
        'https://ela.st/cloud-asset-discovery-get-started'
      );
    });
    it(`documentation Hyperlink should have correct URL to redirect users to AWS page if user chose Cloudformation`, () => {
      let policy = getMockPolicyAWS();
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'cloud_formation' },
        'aws.account_type': { value: 'single-account' },
      });
      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetInventoryAWS()} />
      );
      expect(getByTestId('externalLink')).toHaveAttribute(
        'href',
        'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html'
      );
    });

    it(`renders ${CLOUDBEAT_AWS} Assume Role fields`, () => {
      let policy = getMockPolicyAWS();
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'assume_role' },
      });
      const { getByLabelText, getByRole } = render(<WrappedComponent newPolicy={policy} />);
      expect(getByRole('option', { name: 'Assume role', selected: true })).toBeInTheDocument();
      expect(getByLabelText('Role ARN')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_AWS} Assume Role fields`, async () => {
      const policy = getAssetPolicy(getMockPolicyAWS(), CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'assume_role' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);
      await userEvent.type(getByLabelText('Role ARN'), 'a');

      const newPolicy = getAssetPolicy(policy, CLOUDBEAT_AWS, { 'aws.role_arn': { value: 'a' } });
      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: newPolicy,
      });
    });

    it(`renders ${CLOUDBEAT_AWS} Direct Access Keys fields`, async () => {
      const policy = getAssetPolicy(getMockPolicyAWS(), CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
      });
      const { getByLabelText, getByRole } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );
      expect(
        getByRole('option', { name: 'Direct access keys', selected: true })
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(getByLabelText('Access Key ID')).toBeInTheDocument();
        expect(getByLabelText('Secret Access Key')).toBeInTheDocument();
      });
    });

    it(`updates ${CLOUDBEAT_AWS} Direct Access Keys fields`, async () => {
      let policy = getMockPolicyAWS();
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
      });
      const { getByLabelText, rerender, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );
      await userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, { 'aws.access_key_id': { value: 'a' } });
      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );
      await userEvent.type(getByTestId('passwordInput-secret-access-key'), 'b');
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, { 'aws.secret_access_key': { value: 'b' } });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_AWS} Temporary Keys fields`, async () => {
      const policy = getAssetPolicy(getMockPolicyAWS(), CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'temporary_keys' },
      });
      const { getByLabelText, getByRole } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );
      expect(getByRole('option', { name: 'Temporary keys', selected: true })).toBeInTheDocument();
      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      await waitFor(() => expect(getByLabelText('Secret Access Key')).toBeInTheDocument());
      expect(getByLabelText('Session Token')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_AWS} Temporary Keys fields`, async () => {
      const policy = getAssetPolicy(getMockPolicyAWS(), CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'temporary_keys' },
      });

      const { getByLabelText, rerender, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      await userEvent.type(getByLabelText('Access Key ID'), 'a');

      const updatedPolicy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.access_key_id': { value: 'a' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy,
      });

      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      await userEvent.type(getByTestId('passwordInput-secret-access-key'), 'b');

      const updatedPolicy2 = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.secret_access_key': { value: 'b' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: updatedPolicy2,
      });

      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      await userEvent.type(getByLabelText('Session Token'), 'a');
      const updatedPolicy3 = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.session_token': { value: 'a' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: updatedPolicy3,
      });
    });

    it(`renders ${CLOUDBEAT_AWS} Shared Credentials fields`, () => {
      let policy: NewPackagePolicy = getMockPolicyAWS();
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'shared_credentials' },
      });
      const { getByLabelText, getByRole } = render(<WrappedComponent newPolicy={policy} />);
      expect(
        getByRole('option', { name: 'Shared credentials', selected: true })
      ).toBeInTheDocument();
      expect(getByLabelText('Shared Credential File')).toBeInTheDocument();
      expect(getByLabelText('Credential Profile Name')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_AWS} Shared Credentials fields`, async () => {
      let policy = getMockPolicyAWS();
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'shared_credentials' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      await userEvent.type(getByLabelText('Shared Credential File'), 'a');
      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.shared_credential_file': { value: 'a' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);
      await userEvent.type(getByLabelText('Credential Profile Name'), 'b');

      policy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credential_profile_name': { value: 'b' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });

  describe('GCP Credentials input fields', () => {
    it(`documentation Hyperlink should have correct URL to redirect users to elastic page`, () => {
      let policy = getMockPolicyGCP();
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.credentials.type': { value: 'credentials-file' },
      });
      const { getByText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetGCP()} />
      );
      expect(getByText('documentation')).toHaveAttribute(
        'href',
        'https://ela.st/cloud-asset-discovery-get-started-gcp.html'
      );
    });

    it(`renders Google Cloud Shell forms when Setup Access is set to Google Cloud Shell`, () => {
      const policy = getAssetPolicy(getMockPolicyGCP(), CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
        'gcp.credentials.type': { value: 'credentials-none', type: 'text' },
      });
      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetGCP()} />
      );
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
      expect(
        getByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.GOOGLE_CLOUD_SHELL_SETUP)
      ).toBeInTheDocument();
    });

    it(`renders ${CLOUDBEAT_GCP} Credentials File fields`, () => {
      let policy = getMockPolicyGCP();
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.credentials.type': { value: 'credentials-file' },
      });
      const { getByLabelText, getByRole } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetGCP()} />
      );
      expect(getByRole('option', { name: 'Credentials File', selected: true })).toBeInTheDocument();
      expect(
        getByLabelText('Path to JSON file containing the credentials and key used to subscribe')
      ).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_GCP} Credentials File fields`, async () => {
      let policy = getMockPolicyGCP();
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.project_id': { value: 'a' },
        'gcp.credentials.type': { value: 'credentials-file' },
      });
      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetGCP()} />
      );
      await userEvent.type(getByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE), 'b');
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.credentials.file': { value: 'b' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
    it(`${CLOUDBEAT_GCP} form do not displays upgrade message for supported versions and gcp organization option is enabled`, () => {
      let policy = getMockPolicyGCP();
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.credentials.type': { value: 'manual' },
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
      });
      const { queryByText, getByLabelText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={{ version: '1.0.0' } as PackageInfo} />
      );
      expect(
        queryByText(
          'GCP Organization not supported in current integration version. Please upgrade to the latest version to enable GCP Organizations integration.'
        )
      ).not.toBeInTheDocument();
      expect(getByLabelText('GCP Organization')).toBeEnabled();
    });
    it(`renders ${CLOUDBEAT_GCP} Organization fields when account type is Organization and Setup Access is Google Cloud Shell`, () => {
      let policy = getMockPolicyGCP();
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
      });
      const { getByLabelText, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetGCP()} />
      );
      expect(getByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)).toBeInTheDocument();
      expect(getByLabelText('Organization ID')).toBeInTheDocument();
    });

    it(`renders ${CLOUDBEAT_GCP} Organization fields when account type is Organization and Setup Access is manual`, () => {
      let policy = getMockPolicyGCP();
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
      });
      const { getByLabelText, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetGCP()} />
      );
      expect(getByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)).toBeInTheDocument();
      expect(getByLabelText('Organization ID')).toBeInTheDocument();
    });

    it(`Should not render ${CLOUDBEAT_GCP} Organization fields when account type is Single`, () => {
      let policy = getMockPolicyGCP();
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_SINGLE_ACCOUNT },
      });
      const { queryByLabelText, queryByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetGCP()} />
      );
      expect(queryByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)).toBeNull();
      expect(queryByLabelText('Organization ID')).toBeNull();
    });

    it(`updates ${CLOUDBEAT_GCP} organization id`, async () => {
      let policy = getMockPolicyGCP();
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
      });
      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfoAssetGCP()} />
      );
      await userEvent.type(getByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID), 'c');
      policy = getAssetPolicy(policy, CLOUDBEAT_GCP, {
        'gcp.organization_id': { value: 'c' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });
  describe('Azure Credentials input fields', () => {
    it(`renders ${CLOUDBEAT_AZURE} Service Principal with Client Secret fields`, async () => {
      let policy = getMockPolicyAzure();
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.type': { value: 'service_principal_with_client_secret' },
      });
      const { getByLabelText, getByRole } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      expect(
        getByRole('option', { name: 'Service principal with Client Secret', selected: true })
      ).toBeInTheDocument();
      expect(getByLabelText('Tenant ID')).toBeInTheDocument();
      expect(getByLabelText('Client ID')).toBeInTheDocument();
      await waitFor(() => expect(getByLabelText('Client Secret')).toBeInTheDocument());
    });

    it(`updates ${CLOUDBEAT_AZURE} Service Principal with Client Secret fields`, async () => {
      let policy = getMockPolicyAzure();
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.type': { value: 'service_principal_with_client_secret' },
      });
      const { rerender, getByLabelText, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      await userEvent.type(getByLabelText('Tenant ID'), 'a');
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.tenant_id': { value: 'a' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      await userEvent.type(getByLabelText('Client ID'), 'b');
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.client_id': { value: 'b' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      await userEvent.type(getByTestId('passwordInput-client-secret'), 'c');
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.client_secret': { value: 'c' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });
  describe('Agentless', () => {
    it('should not render setup technology selector if agentless is not available and CSPM integration supports agentless', async () => {
      const policy = getMockPolicyAWS();
      const newPackagePolicy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
      });

      const { queryByTestId } = render(
        <WrappedComponent newPolicy={newPackagePolicy} isAgentlessEnabled={false} />
      );
      const setupTechnologySelector = queryByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);
      // default state
      expect(setupTechnologySelector).not.toBeInTheDocument();
    });
    it('should render setup technology selector for AWS and allow to select agentless', async () => {
      const policy = getMockPolicyAWS();
      const newPackagePolicy = getAssetPolicy(policy, CLOUDBEAT_AWS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
      });

      const { getByTestId, getByLabelText } = render(
        <WrappedComponent newPolicy={newPackagePolicy} isAgentlessEnabled={true} />
      );
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);
      // default state
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agent-based/i);
      expect(
        getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION)
      ).toBeInTheDocument();
      expect(getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL)).toBeInTheDocument();
      // select agent-based and check for cloudformation option
      await userEvent.click(setupTechnologySelector);
      const agentlessOption = getByLabelText(/agentless/i);
      await userEvent.click(agentlessOption);
      const awsCredentialsTypeSelector = getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      const options: HTMLOptionElement[] = within(awsCredentialsTypeSelector).getAllByRole(
        'option'
      );
      const optionValues = options.map((option) => option.value);
      await waitFor(() => {
        expect(options).toHaveLength(2);
        expect(optionValues).toEqual(
          expect.arrayContaining(['direct_access_keys', 'temporary_keys'])
        );
      });
    });

    it.skip('should render setup technology selector for GCP for organization account type', async () => {
      const newPackagePolicy = getAssetPolicy(getMockPolicyGCP(), CLOUDBEAT_GCP, {
        'gcp.account_type': { value: GCP_ORGANIZATION_ACCOUNT },
      });
      const { getByTestId, queryByTestId, getByLabelText } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={getMockPackageInfoAssetGCP()}
        />
      );
      // navigate to GCP
      const gcpSelectorButton = getByTestId(CAI_GCP_OPTION_TEST_SUBJ);
      await userEvent.click(gcpSelectorButton);
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);
      const orgIdField = queryByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID);
      const projectIdField = queryByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      // const credentialsJsonField = queryByTestId(
      //   CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON
      // );
      const credentialsTypSelector = queryByTestId(
        CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE
      );
      const credentialsFileField = queryByTestId(
        CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
      );
      // default state for GCP with the Org selected
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agentless/i);
      expect(orgIdField).toBeInTheDocument();
      // expect(credentialsJsonField).toBeInTheDocument();
      expect(projectIdField).not.toBeInTheDocument();
      expect(credentialsTypSelector).not.toBeInTheDocument();
      expect(credentialsFileField).not.toBeInTheDocument();
      // select agent-based and check for Cloud Shell option
      await userEvent.click(setupTechnologySelector);
      const agentBasedOption = getByLabelText(/agent-based/i);
      await userEvent.click(agentBasedOption);
      await waitFor(() => {
        expect(getByTestId(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUD_SHELL)).toBeInTheDocument();
        expect(getByTestId(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL)).toBeInTheDocument();
      });
    });
    it.skip('should render setup technology selector for GCP for single-account', async () => {
      const newPackagePolicy = getMockPolicyGCP({
        'gcp.account_type': { value: GCP_SINGLE_ACCOUNT, type: 'text' },
      });
      const { getByTestId, queryByTestId } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={{ version: '1.0.0' } as PackageInfo}
        />
      );
      // navigate to GCP
      const gcpSelectorButton = getByTestId(CAI_GCP_OPTION_TEST_SUBJ);
      await userEvent.click(gcpSelectorButton);
      const setupTechnologySelector = queryByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);
      const orgIdField = queryByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID);
      const projectIdField = queryByTestId(CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      const credentialsJsonField = queryByTestId(
        CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON
      );
      const credentialsTypSelector = queryByTestId(
        CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE
      );
      const credentialsFileField = queryByTestId(
        CAI_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE
      );
      // default state for GCP with the Org selected
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agentless/i);
      expect(orgIdField).not.toBeInTheDocument();
      expect(credentialsJsonField).toBeInTheDocument();
      expect(projectIdField).toBeInTheDocument();
      expect(credentialsTypSelector).not.toBeInTheDocument();
      expect(credentialsFileField).not.toBeInTheDocument();
    });

    it('should render setup technology selector for Azure for Organization type', async () => {
      const newPackagePolicy = getMockPolicyAzure();
      const { getByTestId, queryByTestId, getByLabelText } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={getPackageInfoMock() as PackageInfo}
        />
      );
      // navigate to Azure
      const azureSelectorButton = getByTestId(CAI_AZURE_OPTION_TEST_SUBJ);
      await userEvent.click(azureSelectorButton);
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);
      // default state for Azure with the Org selected
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agent-based/i);
      await waitFor(() => {
        expect(getByTestId(CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE)).toBeInTheDocument();
        expect(getByTestId(CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL)).toBeInTheDocument();
      });
      // select agent-based and check for ARM template option
      await userEvent.click(setupTechnologySelector);
      const agentlessOption = getByLabelText(/agentless/i);
      await userEvent.click(agentlessOption);
      const tenantIdField = queryByTestId(CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID);
      const clientIdField = queryByTestId(CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID);
      const clientSecretField = queryByTestId(CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET);
      const armTemplateSelector = queryByTestId(CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE);
      const manualSelector = queryByTestId(CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agentless/i);
      expect(tenantIdField).toBeInTheDocument();
      expect(clientIdField).toBeInTheDocument();
      expect(clientSecretField).toBeInTheDocument();
      expect(armTemplateSelector).not.toBeInTheDocument();
      expect(manualSelector).not.toBeInTheDocument();
    });

    it('should render setup technology selector for Azure for Single Subscription type', async () => {
      const newPackagePolicy = getMockPolicyAzure({
        'azure.account_type': { value: 'single-account', type: 'text' },
      });
      const { getByTestId, queryByTestId, getByLabelText } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={getPackageInfoMock() as PackageInfo}
        />
      );
      // navigate to Azure
      const azureSelectorButton = getByTestId(CAI_AZURE_OPTION_TEST_SUBJ);
      await userEvent.click(azureSelectorButton);
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);
      // select agentless and check for ARM template option
      await userEvent.click(setupTechnologySelector);
      const agentlessOption = getByLabelText(/agentless/i);
      await userEvent.click(agentlessOption);
      const tenantIdField = queryByTestId(CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID);
      const clientIdField = queryByTestId(CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID);
      const clientSecretField = queryByTestId(CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET);
      const armTemplateSelector = queryByTestId(CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE);
      const manualSelector = queryByTestId(CAI_AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
      // default state for Azure with the Org selected
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agentless/i);
      expect(tenantIdField).toBeInTheDocument();
      expect(clientIdField).toBeInTheDocument();
      expect(clientSecretField).toBeInTheDocument();
      expect(armTemplateSelector).not.toBeInTheDocument();
      expect(manualSelector).not.toBeInTheDocument();
    });

    it(`renders Service principal with Client Certificate fields`, async () => {
      let policy = getMockPolicyAzure();
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.type': { value: 'service_principal_with_client_certificate' },
      });
      const { getByLabelText, getByRole } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      expect(
        getByRole('option', { name: 'Service principal with Client Certificate', selected: true })
      ).toBeInTheDocument();
      expect(getByLabelText('Tenant ID')).toBeInTheDocument();
      expect(getByLabelText('Client ID')).toBeInTheDocument();
      expect(getByLabelText('Client Certificate Path')).toBeInTheDocument();
      await waitFor(() =>
        expect(getByLabelText('Client Certificate Password')).toBeInTheDocument()
      );
    });
    it(`updates Service principal with Client Certificate fields`, async () => {
      let policy = getMockPolicyAzure();
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.type': { value: 'service_principal_with_client_certificate' },
      });
      const { rerender, getByLabelText, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      await userEvent.type(getByLabelText('Tenant ID'), 'a');
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.tenant_id': { value: 'a' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      await userEvent.type(getByLabelText('Client ID'), 'b');
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.client_id': { value: 'b' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      await userEvent.type(getByLabelText('Client Certificate Path'), 'c');
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.client_certificate_path': { value: 'c' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getPackageInfoMock() as PackageInfo} />
      );
      await userEvent.type(getByTestId('passwordInput-client-certificate-password'), 'd');
      policy = getAssetPolicy(policy, CLOUDBEAT_AZURE, {
        'azure.credentials.client_certificate_password': { value: 'd' },
      });
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it('should render setup technology selector for AWS and allow to select cloud connector in ess  aws environnement', async () => {
      const newPackagePolicy = getMockPolicyAWS();
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          cloud: {
            cloudId:
              'cloud_connector_cspm:dXMtZWFzdC0xLmF3cy5zdGFnaW5nLmZvdW5kaXQubm86NDQzJDYyMjExNzI5MDhjZTQ0YmE5YWNkOGFmN2NlYmUyYmVjJGZmYmUyNDc2NGFkNTQwODJhZTkyYjU1NDQ0ZDI3NzA5',
            deploymentUrl: 'https://cloud.elastic.co/deployments/bfdad4ef99a24212a06d387593686d63',
            isCloudEnabled: true,
            isServerlessEnabled: false,
            cloudHost: 'eu-west-1.aws.qa.elastic.cloud',
            serverless: {},
          },
          uiSettings: {
            get: (key: string) => key === SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const { getByTestId, getByLabelText } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={{ ...getAwsPackageInfoMock(), version: '0.19.0' } as PackageInfo}
        />
      );
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);

      // default state
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agent-based/i);

      expect(
        getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION)
      ).toBeInTheDocument();
      expect(getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL)).toBeInTheDocument();

      // select agent-based and check for cloudformation option
      await userEvent.click(setupTechnologySelector);
      const agentlessOption = getByLabelText(/agentless/i);
      await userEvent.click(agentlessOption);

      const awsCredentialsTypeSelector = getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      const options: HTMLOptionElement[] = within(awsCredentialsTypeSelector).getAllByRole(
        'option'
      );
      const optionValues = options.map((option) => option.value);

      await waitFor(() => {
        expect(options).toHaveLength(3);
        expect(optionValues).toEqual(
          expect.arrayContaining(['cloud_connectors', 'direct_access_keys', 'temporary_keys'])
        );
      });
    });

    it('should render setup technology selector for AWS and allow to select cloud connector in ess gcp environment', async () => {
      const newPackagePolicy = getMockPolicyAWS();
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          cloud: {
            cloudId:
              'cloud_connector_cspm:dXMtZWFzdC0xLmF3cy5zdGFnaW5nLmZvdW5kaXQubm86NDQzJDYyMjExNzI5MDhjZTQ0YmE5YWNkOGFmN2NlYmUyYmVjJGZmYmUyNDc2NGFkNTQwODJhZTkyYjU1NDQ0ZDI3NzA5',
            deploymentUrl: 'https://cloud.elastic.co/deployments/bfdad4ef99a24212a06d387593686d63',
            isCloudEnabled: true,
            isServerlessEnabled: false,
            cloudHost: 'eu-west-1.gcp.qa.elastic.cloud',
            serverless: {},
          },
          uiSettings: {
            get: (key: string) => key === SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const { getByTestId, getByLabelText } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={{ ...getAwsPackageInfoMock(), version: '0.19.0' } as PackageInfo}
        />
      );
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);

      // default state
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agent-based/i);

      expect(
        getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION)
      ).toBeInTheDocument();
      expect(getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL)).toBeInTheDocument();

      // select agent-based and check for cloudformation option
      await userEvent.click(setupTechnologySelector);
      const agentlessOption = getByLabelText(/agentless/i);
      await userEvent.click(agentlessOption);

      const awsCredentialsTypeSelector = getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      const options: HTMLOptionElement[] = within(awsCredentialsTypeSelector).getAllByRole(
        'option'
      );
      const optionValues = options.map((option) => option.value);

      await waitFor(() => {
        expect(options).toHaveLength(2);
        expect(optionValues).toEqual(
          expect.arrayContaining(['direct_access_keys', 'temporary_keys'])
        );
      });
    });
    it('should render setup technology selector for AWS and allow to select cloud connectors in serverless aws environment', async () => {
      const newPackagePolicy = getMockPolicyAWS();
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          cloud: {
            cloudId: undefined,
            cloudHost: 'eu-west-1.aws.qa.elastic.cloud',
            deploymentUrl: undefined,
            isCloudEnabled: true,
            isServerlessEnabled: true,
            serverless: {
              projectId: 'project-xyz123',
              projectName: 'cloudconnectoraws',
              projectType: 'security',
            },
          },
          uiSettings: {
            get: (key: string) => key === SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING,
          },
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const { getByTestId, getByLabelText } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={{ ...getAwsPackageInfoMock(), version: '0.19.0' } as PackageInfo}
        />
      );
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);

      // default state
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agent-based/i);

      expect(
        getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION)
      ).toBeInTheDocument();
      expect(getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL)).toBeInTheDocument();

      // select agent-based and check for cloudformation option
      await userEvent.click(setupTechnologySelector);
      const agentlessOption = getByLabelText(/agentless/i);
      await userEvent.click(agentlessOption);

      const awsCredentialsTypeSelector = getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      const options: HTMLOptionElement[] = within(awsCredentialsTypeSelector).getAllByRole(
        'option'
      );
      const optionValues = options.map((option) => option.value);

      await waitFor(() => {
        expect(options).toHaveLength(3);
        expect(optionValues).toEqual(
          expect.arrayContaining(['cloud_connectors', 'direct_access_keys', 'temporary_keys'])
        );
      });
    });

    it('should render setup technology selector for AWS and hide cloud connectors in serverless gcp environment', async () => {
      const newPackagePolicy = getMockPolicyAWS();
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          cloud: {
            cloudId: undefined,
            cloudHost: 'eu-west-1.gcp.qa.elastic.cloud',
            deploymentUrl: undefined,
            isCloudEnabled: true,
            isServerlessEnabled: true,
            serverless: {
              projectId: 'project-xyz123',
              projectName: 'cloudconnectoraws',
              projectType: 'security',
            },
          },
          uiSettings: {
            get: (key: string) => key === SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING,
          },
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const { getByTestId, getByLabelText } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={{ ...getAwsPackageInfoMock(), version: '0.19.0' } as PackageInfo}
        />
      );
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);

      // default state
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agent-based/i);

      expect(
        getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION)
      ).toBeInTheDocument();
      expect(getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL)).toBeInTheDocument();

      // select agent-based and check for cloudformation option
      await userEvent.click(setupTechnologySelector);
      const agentlessOption = getByLabelText(/agentless/i);
      await userEvent.click(agentlessOption);

      const awsCredentialsTypeSelector = getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      const options: HTMLOptionElement[] = within(awsCredentialsTypeSelector).getAllByRole(
        'option'
      );
      const optionValues = options.map((option) => option.value);

      await waitFor(() => {
        expect(options).toHaveLength(2);
        expect(optionValues).toEqual(
          expect.arrayContaining(['direct_access_keys', 'temporary_keys'])
        );
      });
    });

    it('should render setup technology selector for AWS and hide cloud connectors in serverless azure environment', async () => {
      const newPackagePolicy = getMockPolicyAWS();
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          cloud: {
            cloudId: undefined,
            cloudHost: 'eu-west-1.azure.qa.elastic.cloud',
            deploymentUrl: undefined,
            isCloudEnabled: true,
            isServerlessEnabled: true,
            serverless: {
              projectId: 'project-xyz123',
              projectName: 'cloudconnectoraws',
              projectType: 'security',
            },
          },
          uiSettings: {
            get: (key: string) => key === SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING,
          },
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const { getByTestId, getByLabelText } = render(
        <WrappedComponent
          newPolicy={newPackagePolicy}
          isAgentlessEnabled={true}
          packageInfo={{ ...getAwsPackageInfoMock(), version: '0.19.0' } as PackageInfo}
        />
      );
      const setupTechnologySelector = getByTestId(SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ);

      // default state
      expect(setupTechnologySelector).toBeInTheDocument();
      expect(setupTechnologySelector).toHaveTextContent(/agent-based/i);

      expect(
        getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION)
      ).toBeInTheDocument();
      expect(getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL)).toBeInTheDocument();

      // select agent-based and check for cloudformation option
      await userEvent.click(setupTechnologySelector);
      const agentlessOption = getByLabelText(/agentless/i);
      await userEvent.click(agentlessOption);

      const awsCredentialsTypeSelector = getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      const options: HTMLOptionElement[] = within(awsCredentialsTypeSelector).getAllByRole(
        'option'
      );
      const optionValues = options.map((option) => option.value);

      await waitFor(() => {
        expect(options).toHaveLength(2);
        expect(optionValues).toEqual(
          expect.arrayContaining(['direct_access_keys', 'temporary_keys'])
        );
      });
    });
  });
});
