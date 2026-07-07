/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { useApiEndpoints } from './use_api_endpoints';
import { useApiKeys } from './use_api_keys';
import { useVerificationPolling } from './use_verification_polling';
import { ApiEndpoints } from './api_endpoints';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      share: {
        url: { locators: { get: () => ({ getUrl: () => Promise.resolve('/app/management') }) } },
      },
      application: { capabilities: { api_keys: { save: true } } },
    },
  }),
}));
jest.mock('./use_api_endpoints');
jest.mock('./use_api_keys');
jest.mock('./use_verification_polling', () => ({ useVerificationPolling: jest.fn() }));

const mockUseApiEndpoints = useApiEndpoints as jest.Mock;
const mockUseApiKeys = useApiKeys as jest.Mock;
const mockUseVerificationPolling = useVerificationPolling as jest.Mock;

const elasticsearchKey = {
  encodedApiKey: 'enc-es',
  apiKeyId: 'key-es',
  verificationId: 'obs-onb-es',
  status: 'waiting' as const,
  detectionActive: true,
};

const prometheusKey = {
  encodedApiKey: 'enc-prom',
  apiKeyId: 'key-prom',
  verificationId: 'obs-onb-prom',
  status: 'accepted' as const,
  detectionActive: true,
};

const renderApiEndpoints = async () => {
  let view: ReturnType<typeof render> | undefined;

  await act(async () => {
    view = render(
      <I18nProvider>
        <ApiEndpoints />
      </I18nProvider>
    );
    await Promise.resolve();
  });

  return view!;
};

describe('ApiEndpoints', () => {
  const setVerification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApiEndpoints.mockReturnValue({
      endpoints: [
        { id: ApiEndpointId.Elasticsearch, label: 'Elasticsearch', url: 'https://es.example' },
      ],
      isLoading: false,
      isError: false,
    });
    mockUseApiKeys.mockReturnValue({
      keys: {
        [ApiEndpointId.Elasticsearch]: elasticsearchKey,
      },
      creatingEndpointId: undefined,
      createApiKey: jest.fn(),
      setVerification,
    });
  });

  it('renders the verification status row for the active endpoint key', async () => {
    await renderApiEndpoints();
    expect(screen.getByTestId('obltOnboardingVerificationWaiting')).toBeInTheDocument();
  });

  it('calls useVerificationPolling with the selected endpoint and key details', async () => {
    await renderApiEndpoints();

    expect(mockUseVerificationPolling).toHaveBeenCalledWith({
      endpointId: ApiEndpointId.Elasticsearch,
      verificationId: elasticsearchKey.verificationId,
      status: elasticsearchKey.status,
      detectionActive: true,
      endpointLabel: 'Elasticsearch',
      onStatus: setVerification,
    });
  });

  it('does not render a verification status row when the selected endpoint has no key', async () => {
    mockUseApiKeys.mockReturnValue({
      keys: {},
      creatingEndpointId: undefined,
      createApiKey: jest.fn(),
      setVerification,
    });

    await renderApiEndpoints();

    expect(screen.queryByTestId('obltOnboardingVerificationWaiting')).not.toBeInTheDocument();
    expect(screen.queryByTestId('obltOnboardingVerificationAccepted')).not.toBeInTheDocument();
    expect(screen.queryByTestId('obltOnboardingVerificationExpired')).not.toBeInTheDocument();
    expect(screen.queryByTestId('obltOnboardingVerificationUnavailable')).not.toBeInTheDocument();
    expect(mockUseVerificationPolling).toHaveBeenCalledWith({
      endpointId: ApiEndpointId.Elasticsearch,
      verificationId: undefined,
      status: undefined,
      detectionActive: false,
      endpointLabel: 'Elasticsearch',
      onStatus: setVerification,
    });
  });

  it('shows the selected endpoint key status when switching tabs', async () => {
    mockUseApiEndpoints.mockReturnValue({
      endpoints: [
        { id: ApiEndpointId.Elasticsearch, label: 'Elasticsearch', url: 'https://es.example' },
        { id: ApiEndpointId.Prometheus, label: 'Prometheus', url: 'https://prom.example' },
      ],
      isLoading: false,
      isError: false,
    });
    mockUseApiKeys.mockReturnValue({
      keys: {
        [ApiEndpointId.Elasticsearch]: elasticsearchKey,
        [ApiEndpointId.Prometheus]: prometheusKey,
      },
      creatingEndpointId: undefined,
      createApiKey: jest.fn(),
      setVerification,
    });

    await renderApiEndpoints();

    expect(screen.getByTestId('obltOnboardingVerificationWaiting')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByTestId(`observabilityOnboardingApiEndpointTab-${ApiEndpointId.Prometheus}`)
      );
    });

    expect(screen.queryByTestId('obltOnboardingVerificationWaiting')).not.toBeInTheDocument();
    expect(screen.getByTestId('obltOnboardingVerificationAccepted')).toBeInTheDocument();
    expect(mockUseVerificationPolling).toHaveBeenLastCalledWith({
      endpointId: ApiEndpointId.Prometheus,
      verificationId: prometheusKey.verificationId,
      status: prometheusKey.status,
      detectionActive: true,
      endpointLabel: 'Prometheus',
      onStatus: setVerification,
    });
  });
});
