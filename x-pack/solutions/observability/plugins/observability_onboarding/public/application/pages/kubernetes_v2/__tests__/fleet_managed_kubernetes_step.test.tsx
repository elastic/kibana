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

const SAMPLE_MANIFEST = `apiVersion: v1
kind: Secret
metadata:
  name: elastic-agent-secret`;

const APPLY_COMMAND = 'kubectl apply -f elastic-agent-managed-kubernetes.yml';

const createMockState = (
  overrides: Partial<FleetManagedKubernetesState> = {}
): FleetManagedKubernetesState => ({
  isLoadingDefaults: false,
  isLoadingManifest: false,
  fleetServerUrl: 'https://fleet.example.com',
  enrollmentToken: 'enrollment-token',
  agentPolicyId: 'fleet-first-agent-policy',
  manifest: SAMPLE_MANIFEST,
  downloadHref: '/base/api/fleet/kubernetes/download',
  setFleetServerUrl: jest.fn(),
  setEnrollmentToken: jest.fn(),
  refreshManifest: jest.fn(),
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

    const fleetServerUrlInput = screen.getByTestId(
      'observabilityOnboardingKubernetesV2FleetServerUrlInput'
    );
    expect(fleetServerUrlInput).toHaveValue('https://fleet.example.com');

    await userEvent.clear(fleetServerUrlInput);
    await userEvent.type(fleetServerUrlInput, 'https://custom.fleet.example.com');

    expect(state.setFleetServerUrl).toHaveBeenCalled();
  });

  it('allows editing the enrollment token input', async () => {
    const state = setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    const enrollmentTokenInput = screen.getByTestId(
      'observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput'
    );
    expect(enrollmentTokenInput).toHaveValue('enrollment-token');

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

  it('hides manifest preview and actions while a new manifest is loading', () => {
    setupMocks({
      isLoadingManifest: true,
      manifest: SAMPLE_MANIFEST,
      downloadHref: '/base/api/fleet/kubernetes/download',
    });

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetManifestLoading')
    ).toBeInTheDocument();
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
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetServerUrlInput')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput')
    ).toBeInTheDocument();
  });

  it('renders scoped errors inside the step while keeping inputs visible', () => {
    setupMocks({
      error: new Error('Failed to load manifest'),
    });

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(screen.getByText('Failed to load manifest')).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetServerUrlInput')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetEnrollmentTokenInput')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('observabilityOnboardingEmptyPrompt')).not.toBeInTheDocument();
  });

  it('renders the manifest preview as YAML when a manifest exists', () => {
    setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    const manifestPreview = screen.getByTestId(
      'observabilityOnboardingKubernetesV2FleetManifestPreview'
    );
    expect(manifestPreview).toHaveTextContent('apiVersion: v1');
    expect(manifestPreview).toHaveTextContent('kind: Secret');
  });

  it('shows copy and download actions when a manifest exists', () => {
    setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetManifestCopy')
    ).toHaveAttribute('data-text-to-copy', SAMPLE_MANIFEST);
    const downloadLink = screen.getByTestId(
      'observabilityOnboardingKubernetesV2FleetManifestDownload'
    );
    expect(downloadLink).toHaveAttribute('href', '/base/api/fleet/kubernetes/download');
    expect(downloadLink).not.toHaveAttribute('target', '_blank');
  });

  it('shows the kubectl apply command when a manifest exists', () => {
    setupMocks();

    renderWithHostPageProviders(<FleetManagedKubernetesStep />);

    expect(
      screen.getByTestId('observabilityOnboardingKubernetesV2FleetApplyCommand')
    ).toHaveTextContent(APPLY_COMMAND);
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
