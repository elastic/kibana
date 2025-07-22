/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CspPolicyTemplateForm } from './policy_template_form';
import { TestProvider } from '../../test/test_provider';
import {
  getMockPackageInfo,
  getMockPackageInfoCspmAWS,
  getMockPackageInfoVulnMgmtAWS,
  getMockPolicyAWS,
  getMockPolicyEKS,
  getMockPolicyK8s,
  getMockPolicyVulnMgmtAWS,
} from './mocks';
import type { NewPackagePolicy, PackageInfo, PackagePolicy } from '@kbn/fleet-plugin/common';
import { getPosturePolicy, POLICY_TEMPLATE_FORM_DTS } from './utils';
import { CLOUDBEAT_AWS, CLOUDBEAT_EKS } from '../../../common/constants';
import { useParams } from 'react-router-dom';
import { createReactQueryResponse } from '../../test/fixtures/react_query';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import { usePackagePolicyList } from '../../common/api/use_package_policy_list';
import { SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT } from '../test_subjects';
import { createFleetTestRendererMock } from '@kbn/fleet-plugin/public/mock';
import { useIsSubscriptionStatusValid } from '../../common/hooks/use_is_subscription_status_valid';
import { useLicenseManagementLocatorApi } from '../../common/api/use_license_management_locator_api';
import { SetupTechnology } from '@kbn/fleet-plugin/public';

// mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({
    integration: undefined,
  }),
}));
jest.mock('@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api');
jest.mock('../../common/api/use_package_policy_list');
jest.mock('../../common/hooks/use_is_subscription_status_valid');
jest.mock('../../common/api/use_license_management_locator_api');
jest.mock('@kbn/fleet-plugin/public/services/experimental_features');

const onChange = jest.fn();

const createReactQueryResponseWithRefetch = (
  data: Parameters<typeof createReactQueryResponse>[0]
) => {
  return {
    ...createReactQueryResponse(data),
    refetch: jest.fn(),
  };
};

describe('<CspPolicyTemplateForm />', () => {
  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({
      integration: undefined,
    });

    (usePackagePolicyList as jest.Mock).mockImplementation((packageName) =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          items: [],
        },
      })
    );

    onChange.mockClear();

    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: { status: 'indexed', installedPackageVersion: '1.2.13' },
      })
    );

    (useIsSubscriptionStatusValid as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );
  });

  const WrappedComponent = ({
    newPolicy,
    edit = false,
    packageInfo = {} as PackageInfo,
    isAgentlessEnabled,
    integrationToEnable,
    defaultSetupTechnology = SetupTechnology.AGENT_BASED,
  }: {
    edit?: boolean;
    newPolicy: NewPackagePolicy;
    packageInfo?: PackageInfo;
    onChange?: jest.Mock<void, [NewPackagePolicy]>;
    isAgentlessEnabled?: boolean;
    integrationToEnable?: string;
    defaultSetupTechnology?: SetupTechnology;
  }) => {
    const { AppWrapper: FleetAppWrapper } = createFleetTestRendererMock();
    return (
      <FleetAppWrapper>
        <TestProvider>
          {edit && (
            <CspPolicyTemplateForm
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
            <CspPolicyTemplateForm
              newPolicy={newPolicy}
              onChange={onChange}
              packageInfo={packageInfo}
              isEditPage={false}
              isAgentlessEnabled={isAgentlessEnabled}
              integrationToEnable={integrationToEnable}
              defaultSetupTechnology={defaultSetupTechnology}
            />
          )}
        </TestProvider>
      </FleetAppWrapper>
    );
  };

  it('shows loader when useIsSubscriptionStatusValid is loading', () => {
    (useIsSubscriptionStatusValid as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'loading',
        data: undefined,
      })
    );

    const policy = getMockPolicyAWS();
    render(<WrappedComponent newPolicy={policy} />);

    expect(screen.getByTestId(POLICY_TEMPLATE_FORM_DTS.LOADER)).toBeInTheDocument();
  });

  it('shows license block if subscription is not allowed', () => {
    (useIsSubscriptionStatusValid as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: false,
      })
    );

    const policy = getMockPolicyK8s();
    const { rerender } = render(<WrappedComponent newPolicy={policy} />);

    rerender(<WrappedComponent newPolicy={{ ...policy, namespace: 'some-namespace' }} />);
    expect(screen.getByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).toBeInTheDocument();
  });

  it('license block renders with license url locator', () => {
    (useIsSubscriptionStatusValid as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: false,
      })
    );
    (useLicenseManagementLocatorApi as jest.Mock).mockImplementation(() => 'http://license-url');

    const policy = getMockPolicyK8s();
    const { rerender } = render(<WrappedComponent newPolicy={policy} />);

    rerender(<WrappedComponent newPolicy={{ ...policy, namespace: 'some-namespace' }} />);
    expect(screen.getByTestId('has_locator')).toBeInTheDocument();
  });

  it('license block renders without license url locator', () => {
    (useIsSubscriptionStatusValid as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: false,
      })
    );
    (useLicenseManagementLocatorApi as jest.Mock).mockImplementation(undefined);

    const policy = getMockPolicyK8s();
    const { rerender } = render(<WrappedComponent newPolicy={policy} />);

    rerender(<WrappedComponent newPolicy={{ ...policy, namespace: 'some-namespace' }} />);
    expect(screen.getByTestId('no_locator')).toBeInTheDocument();
  });

  it('updates package policy namespace to default when it changes', () => {
    const policy = getMockPolicyK8s();
    const { rerender } = render(<WrappedComponent newPolicy={policy} />);

    rerender(<WrappedComponent newPolicy={{ ...policy, namespace: 'some-namespace' }} />);

    // Listen to the onChange triggered by the test (re-render with new policy namespace)
    // It should ensure the initial state is valid.
    expect(onChange).toHaveBeenNthCalledWith(1, {
      isValid: true,
      updatedPolicy: {
        ...policy,
        namespace: 'default',
      },
    });
  });

  it('renders and updates name field', async () => {
    const policy = getMockPolicyK8s();
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
    const policy = getMockPolicyK8s();
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

  it('renders KSPM input selector', () => {
    const { getByLabelText } = render(<WrappedComponent newPolicy={getMockPolicyK8s()} />);

    const option1 = getByLabelText('Self-Managed');
    const option2 = getByLabelText('EKS');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option1).toBeEnabled();
    expect(option2).toBeEnabled();
    expect(option1).toBeChecked();
  });

  it('updates selected KSPM input', async () => {
    const k8sPolicy = getMockPolicyK8s();
    const eksPolicy = getMockPolicyEKS();

    const { getByLabelText } = render(<WrappedComponent newPolicy={k8sPolicy} />);
    const option = getByLabelText('EKS');
    await userEvent.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: eksPolicy,
      });
    });
  });

  it('renders CSPM input selector', () => {
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

  it('renders disabled KSPM input when editing', () => {
    const { getByLabelText } = render(
      <WrappedComponent newPolicy={getMockPolicyK8s()} edit={true} />
    );

    const option1 = getByLabelText('Self-Managed');
    const option2 = getByLabelText('EKS');

    expect(option1).toBeInTheDocument();
    expect(option2).toBeInTheDocument();
    expect(option1).toBeDisabled();
    expect(option2).toBeDisabled();
    expect(option1).toBeChecked();
  });

  it('renders disabled CSPM input when editing', () => {
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

  it('selects default KSPM input selector', () => {
    const policy = getMockPolicyK8s();
    // enable all inputs of a policy template, same as fleet does
    policy.inputs = policy.inputs.map((input) => ({
      ...input,
      enabled: input.policy_template === 'kspm',
    }));
    policy.name = 'cloud_security_posture-1';

    (useParams as jest.Mock).mockReturnValue({
      integration: 'kspm',
    });

    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          kspm: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );

    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          items: [
            getPosturePolicy(getMockPolicyAWS(), CLOUDBEAT_AWS),
            getPosturePolicy(getMockPolicyEKS(), CLOUDBEAT_EKS),
            getPosturePolicy(getMockPolicyVulnMgmtAWS(), CLOUDBEAT_AWS),
          ],
        },
      })
    );

    render(
      <WrappedComponent
        newPolicy={policy}
        packageInfo={{ name: 'kspm' } as PackageInfo}
        onChange={onChange}
      />
    );

    onChange({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'kspm',
        })),
        name: 'kspm-2',
      },
    });

    // 1st call happens on mount and selects the default policy template enabled input
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        name: 'cloud_security_posture-1',
      },
    });

    // 2nd call happens on mount and increments kspm template enabled input
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'kspm',
        })),
        name: 'kspm-2',
      },
    });
  });

  it('KSPM - calls onChange with isExtensionLoaded the second time after increment of package version', () => {
    const policy = getMockPolicyK8s();

    // enable all inputs of a policy template, same as fleet does
    policy.inputs = policy.inputs.map((input) => ({
      ...input,
      enabled: input.policy_template === 'kspm',
    }));
    policy.name = 'cloud_security_posture-1';

    (useParams as jest.Mock).mockReturnValue({
      integration: 'kspm',
    });

    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          kspm: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );

    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          items: [getPosturePolicy(getMockPolicyEKS(), CLOUDBEAT_EKS)],
        },
      })
    );

    render(
      <WrappedComponent
        newPolicy={policy}
        packageInfo={{ name: 'kspm' } as PackageInfo}
        onChange={onChange}
        integrationToEnable="kspm"
      />
    );

    // 1st call happens on mount and selects the default policy template enabled input
    expect(onChange).nthCalledWith(1, {
      isExtensionLoaded: undefined,
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        name: 'cloud_security_posture-1',
      },
    });

    // 2nd call happens on mount and increments kspm template enabled input
    expect(onChange).nthCalledWith(2, {
      isExtensionLoaded: undefined,
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.type === 'cloudbeat/cis_k8s',
        })),
        name: 'cloud_security_posture-1',
      },
    });

    /*
      3rd call happens when policies are fetched and the package version is incremented 
      in that case isExtensionLoaded is set to 'true'
    */
    expect(onChange).nthCalledWith(3, {
      isExtensionLoaded: true,
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyK8s(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'kspm',
        })),
        name: 'kspm-1',
      },
    });
  });

  it('selects default VULN_MGMT input selector', () => {
    const policy = getMockPolicyVulnMgmtAWS();
    // enable all inputs of a policy template, same as fleet does
    policy.inputs = policy.inputs.map((input) => ({
      ...input,
      enabled: input.policy_template === 'vuln_mgmt',
    }));
    policy.name = 'cloud_security_posture-1';

    (useParams as jest.Mock).mockReturnValue({
      integration: 'vuln_mgmt',
    });
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          vuln_mgmt: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );
    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          items: [
            getPosturePolicy(getMockPolicyAWS(), CLOUDBEAT_AWS),
            getPosturePolicy(getMockPolicyEKS(), CLOUDBEAT_EKS),
            getPosturePolicy(getMockPolicyVulnMgmtAWS(), CLOUDBEAT_AWS),
          ],
        },
      })
    );

    render(
      <WrappedComponent
        newPolicy={policy}
        packageInfo={{ name: 'vuln_mgmt' } as PackageInfo}
        onChange={onChange}
      />
    );

    onChange({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyVulnMgmtAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'vuln_mgmt',
        })),
        name: 'vuln_mgmt-2',
      },
    });

    // 1st call happens on mount and selects the default policy template enabled input
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyVulnMgmtAWS(),
        name: 'cloud_security_posture-1',
      },
    });

    // 2nd call happens on mount and increments vuln_mgmt template enabled input
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyVulnMgmtAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'vuln_mgmt',
        })),
        name: 'vuln_mgmt-2',
      },
    });
  });

  it('selects default CSPM input selector', () => {
    const policy = getMockPolicyAWS();
    // enable all inputs of a policy template, same as fleet does
    policy.inputs = policy.inputs.map((input) => ({
      ...input,
      enabled: input.policy_template === 'cspm',
    }));
    policy.name = 'cloud_security_posture-1';

    (useParams as jest.Mock).mockReturnValue({
      integration: 'cspm',
    });

    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          cspm: { status: 'not-deployed', healthyAgents: 0, installedPackagePolicies: 1 },
        },
      })
    );
    (usePackagePolicyList as jest.Mock).mockImplementation(() =>
      createReactQueryResponseWithRefetch({
        status: 'success',
        data: {
          items: [
            getPosturePolicy(getMockPolicyAWS(), CLOUDBEAT_AWS),
            getPosturePolicy(getMockPolicyEKS(), CLOUDBEAT_EKS),
            getPosturePolicy(getMockPolicyVulnMgmtAWS(), CLOUDBEAT_AWS),
          ],
        },
      })
    );

    render(
      <WrappedComponent
        newPolicy={policy}
        packageInfo={getMockPackageInfoCspmAWS()}
        onChange={onChange}
      />
    );

    // 1st call happens on mount and selects the CloudFormation template
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        name: 'cloud_security_posture-1',
        inputs: policy.inputs.map((input) => {
          if (input.type === CLOUDBEAT_AWS) {
            return {
              ...input,
              enabled: true,
            };
          }
          return input;
        }),
      },
    });

    // 2nd call happens on mount and increments cspm template enabled input
    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        inputs: policy.inputs.map((input) => {
          if (input.type === CLOUDBEAT_AWS) {
            return {
              ...input,
              enabled: true,
              config: { cloud_formation_template_url: { value: 's3_url' } },
            };
          }
          return input;
        }),
        name: 'cloud_security_posture-1',
      },
    });

    onChange({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'cspm',
        })),
        name: 'cspm-2',
      },
    });

    expect(onChange).toHaveBeenCalledWith({
      isValid: true,
      updatedPolicy: {
        ...getMockPolicyAWS(),
        inputs: policy.inputs.map((input) => ({
          ...input,
          enabled: input.policy_template === 'cspm',
        })),
        name: 'cspm-2',
      },
    });
  });

  describe('K8S', () => {
    it('K8S or KSPM Vanilla should not render any Setup Access option', () => {
      const policy = getMockPolicyK8s();

      const { queryByTestId } = render(<WrappedComponent newPolicy={policy} />);

      expect(queryByTestId('assumeRoleTestId')).not.toBeInTheDocument();
      expect(queryByTestId('directAccessKeyTestId')).not.toBeInTheDocument();
      expect(queryByTestId('temporaryKeyTestId')).not.toBeInTheDocument();
      expect(queryByTestId('sharedCredentialsTestId')).not.toBeInTheDocument();
    });
  });

  describe('EKS Credentials input fields', () => {
    it(`documentation Hyperlink should have correct URL to redirect users to AWS page`, () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByText } = render(<WrappedComponent newPolicy={policy} />);

      expect(getByText('documentation')).toHaveAttribute(
        'href',
        'https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html'
      );
    });
    it(`renders ${CLOUDBEAT_EKS} Assume Role fields`, () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      const option = getByLabelText('Assume role');
      expect(option).toBeChecked();

      expect(getByLabelText('Role ARN')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_EKS} Assume Role fields`, async () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'assume_role' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      await userEvent.type(getByLabelText('Role ARN'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { role_arn: { value: 'a' } });

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_EKS} Direct Access Keys fields`, async () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      const option = getByLabelText('Direct access keys');
      expect(option).toBeChecked();

      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      await waitFor(() => expect(getByLabelText('Secret Access Key')).toBeInTheDocument());
    });

    it(`updates ${CLOUDBEAT_EKS} Direct Access Keys fields`, async () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'direct_access_keys' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      await userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { access_key_id: { value: 'a' } });

      // Ignore 1st call triggered on mount to ensure initial state is valid
      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      await userEvent.type(getByTestId('passwordInput-secret-access-key'), 'c');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { secret_access_key: { value: 'c' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_EKS} Temporary Keys fields`, async () => {
      let policy: NewPackagePolicy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'temporary_keys' },
        'aws.setup.format': { value: 'manual' },
      });

      const { getByLabelText } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      const option = getByLabelText('Temporary keys');
      expect(option).toBeChecked();

      expect(getByLabelText('Access Key ID')).toBeInTheDocument();
      await waitFor(() => expect(getByLabelText('Secret Access Key')).toBeInTheDocument());
      expect(getByLabelText('Session Token')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_EKS} Temporary Keys fields`, async () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'temporary_keys' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender, getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      await userEvent.type(getByLabelText('Access Key ID'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { access_key_id: { value: 'a' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      await userEvent.type(getByTestId('passwordInput-secret-access-key'), 'c');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { secret_access_key: { value: 'c' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(
        <WrappedComponent newPolicy={policy} packageInfo={getMockPackageInfo() as PackageInfo} />
      );

      await userEvent.type(getByLabelText('Session Token'), 'a');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, { session_token: { value: 'a' } });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });

    it(`renders ${CLOUDBEAT_EKS} Shared Credentials fields`, () => {
      let policy: NewPackagePolicy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'shared_credentials' },
      });

      const { getByLabelText } = render(<WrappedComponent newPolicy={policy} />);

      const option = getByLabelText('Shared credentials');
      expect(option).toBeChecked();

      expect(getByLabelText('Shared Credential File')).toBeInTheDocument();
      expect(getByLabelText('Credential Profile Name')).toBeInTheDocument();
    });

    it(`updates ${CLOUDBEAT_EKS} Shared Credentials fields`, async () => {
      let policy = getMockPolicyEKS();
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        'aws.credentials.type': { value: 'shared_credentials' },
        'aws.setup.format': { value: 'manual' },
      });
      const { getByLabelText, rerender } = render(<WrappedComponent newPolicy={policy} />);

      await userEvent.type(getByLabelText('Shared Credential File'), 'a');

      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        shared_credential_file: { value: 'a' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });

      rerender(<WrappedComponent newPolicy={policy} />);

      await userEvent.type(getByLabelText('Credential Profile Name'), 'b');
      policy = getPosturePolicy(policy, CLOUDBEAT_EKS, {
        credential_profile_name: { value: 'b' },
      });

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: policy,
      });
    });
  });

  describe('Vuln Mgmt', () => {
    it('Update Agent Policy CloudFormation template from vars', () => {
      const policy = getMockPolicyVulnMgmtAWS();

      const packageInfo = getMockPackageInfoVulnMgmtAWS();
      const { getByTestId } = render(
        <WrappedComponent newPolicy={policy} packageInfo={packageInfo} />
      );

      expect(getByTestId('additionalChargeCalloutTestSubj')).toBeInTheDocument();
    });

    it('Additional Charge Callout message should be rendered', () => {
      const policy = getMockPolicyVulnMgmtAWS();

      const packageInfo = getMockPackageInfoVulnMgmtAWS();
      render(<WrappedComponent newPolicy={policy} packageInfo={packageInfo} />);

      const expectedUpdatedPolicy = {
        ...policy,
        inputs: policy.inputs.map((input) => {
          if (input.type === 'cloudbeat/vuln_mgmt_aws') {
            return {
              ...input,
              config: { cloud_formation_template_url: { value: 's3_url' } },
            };
          }
          return input;
        }),
      };

      expect(onChange).toHaveBeenCalledWith({
        isValid: true,
        updatedPolicy: expectedUpdatedPolicy,
      });
    });
  });
});
