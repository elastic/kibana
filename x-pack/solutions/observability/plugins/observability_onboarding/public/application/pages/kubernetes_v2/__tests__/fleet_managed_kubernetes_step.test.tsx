/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { renderWithHostPageProviders } from '../../host/__tests__/test_helpers';
import type { FleetManagedKubernetesState } from '../fleet_managed/use_fleet_managed_kubernetes_state';
import { FleetManagedKubernetesStep } from '../fleet_managed/fleet_managed_kubernetes_step';
import { useFleetManagedKubernetesState } from '../fleet_managed/use_fleet_managed_kubernetes_state';

jest.mock('../fleet_managed/use_fleet_managed_kubernetes_state');
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn(),
}));

jest.mock('../../../quickstart_flows/shared/copy_to_clipboard_button', () => ({
  CopyToClipboardButton: ({
    textToCopy,
    'data-test-subj': dataTestSubj,
  }: {
    textToCopy: string;
    'data-test-subj'?: string;
  }) => (
    <button type="button" data-test-subj={dataTestSubj} data-text-to-copy={textToCopy}>
      Copy
    </button>
  ),
}));

const mockUseFleetManagedKubernetesState = useFleetManagedKubernetesState as jest.MockedFunction<
  typeof useFleetManagedKubernetesState
>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const ADD_REPOSITORY_COMMAND = "helm repo add elastic 'https://helm.elastic.co' --force-update";

const createMockState = (
  overrides: Partial<FleetManagedKubernetesState> = {}
): FleetManagedKubernetesState => ({
  isLoadingDefaults: false,
  fleetServerUrl: 'https://fleet.example.com',
  enrollmentToken: 'enrollment-token',
  agentPolicyId: 'fleet-first-agent-policy',
  setFleetServerUrl: jest.fn(),
  setEnrollmentToken: jest.fn(),
  ...overrides,
});

const setupMocks = (stateOverrides: Partial<FleetManagedKubernetesState> = {}) => {
  const state = createMockState(stateOverrides);
  mockUseFleetManagedKubernetesState.mockReturnValue(state);
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        getUrlForApp: jest.fn((_appId: string, { path }: { path: string }) => `/app/fleet${path}`),
      },
    },
  } as ReturnType<typeof useKibana>);
  return state;
};

describe('FleetManagedKubernetesStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows editing the Fleet Server URL input', async () => {
    const state = setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetConnectionInputs')
    ).toBeInTheDocument();
    const fleetServerUrlInput = screen.getByTestId(
      'observabilityOnboardingKubernetesV2FleetServerUrlInput'
    );
    expect(fleetServerUrlInput).toHaveValue('https://fleet.example.com');

    await userEvent.clear(fleetServerUrlInput);
    await userEvent.type(fleetServerUrlInput, 'https://custom.fleet.example.com');

    expect(state.setFleetServerUrl).toHaveBeenCalled();
  });

  it('shows placeholders when Fleet connection defaults are missing', () => {
    setupMocks({
      fleetServerUrl: '',
      enrollmentToken: '',
    });

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetServerUrlInput')
    ).toHaveAttribute('placeholder', 'https://fleet-server:8220');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput')
    ).toHaveAttribute('placeholder', 'Enrollment token');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetDeployCommand')
    ).toHaveTextContent('--set agent.fleet.url="<YOUR_FLEET_SERVER_URL>"');
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetDeployCommand')
    ).toHaveTextContent('--set agent.fleet.token="<YOUR_ENROLLMENT_TOKEN>"');
  });

  it('allows editing the enrollment token input', async () => {
    const state = setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    const enrollmentTokenInput = screen.getByTestId(
      'observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput'
    );
    expect(enrollmentTokenInput).toHaveValue('enrollment-token');
    expect(enrollmentTokenInput).toHaveAttribute('type', 'password');

    await userEvent.clear(enrollmentTokenInput);
    await userEvent.type(enrollmentTokenInput, 'custom-token');

    expect(state.setEnrollmentToken).toHaveBeenCalled();
  });

  it('shows loading state while defaults are loading without inputs or manifest actions', () => {
    setupMocks({ isLoadingDefaults: true });

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetManagedStep')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('observabilityOnboardingEmptyPrompt')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetServerUrlInput')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetManifestPreview')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetManifestCopy')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetManifestDownload')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetApplyCommand')
    ).not.toBeInTheDocument();
  });

  it('renders scoped errors inside the step while keeping inputs visible', () => {
    setupMocks({
      error: new Error('Failed to load Fleet defaults'),
    });

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(screen.getByText('Failed to load Fleet defaults')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetServerUrlInput')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('observabilityOnboardingEmptyPrompt')).not.toBeInTheDocument();
  });

  it('renders Helm commands instead of a generated manifest', () => {
    setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetAddRepositoryCommand')
    ).toHaveTextContent(ADD_REPOSITORY_COMMAND);

    const deployCommand = screen.getByTestId(
      'observabilityOnboardingKubernetesV2FleetDeployCommand'
    );
    expect(deployCommand).toHaveTextContent('helm install elastic-agent elastic/elastic-agent');
    expect(deployCommand).toHaveTextContent('--set agent.fleet.enabled=true');
    expect(deployCommand).toHaveTextContent('--set agent.fleet.url="https://fleet.example.com"');
    expect(deployCommand).toHaveTextContent('--set agent.fleet.token="enrollment-token"');
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetManifestPreview')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetManifestDownload')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('observabilityOnboardingKubernetesV2FleetApplyCommand')
    ).not.toBeInTheDocument();
  });

  it('shows command headings for the Fleet-managed Helm installation', () => {
    setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(screen.getByText('Add the Elastic Helm repository')).toBeInTheDocument();
    expect(screen.getByText('Deploy Elastic Agent')).toBeInTheDocument();
  });

  it('keeps the generated manifest details out of the Fleet-managed step', () => {
    setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.queryByText('Copy or download the Kubernetes manifest, then apply it to your cluster.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'From the directory where the manifest is downloaded, run the apply command.'
      )
    ).not.toBeInTheDocument();
  });

  it('does not render the old kubectl apply command', () => {
    setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.queryByText('kubectl apply -f elastic-agent-managed-kubernetes.yml')
    ).not.toBeInTheDocument();
  });

  it('links to the Fleet Kubernetes integration with the agent policy id', () => {
    const getUrlForApp = jest.fn(
      (_appId: string, { path }: { path: string }) => `/app/fleet${path}`
    );
    mockUseFleetManagedKubernetesState.mockReturnValue(createMockState());
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp,
        },
      },
    } as ReturnType<typeof useKibana>);

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(getUrlForApp).toHaveBeenCalledWith('fleet', {
      path: '/integrations/kubernetes/add-integration?policyId=fleet-first-agent-policy',
    });
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetKubernetesIntegrationCta')
    ).toHaveAttribute(
      'href',
      '/app/fleet/integrations/kubernetes/add-integration?policyId=fleet-first-agent-policy'
    );
  });
});
