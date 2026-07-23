/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { ApiEndpoints } from './api_endpoints';
import { useApiEndpoints } from './use_api_endpoints';
import { useApiKeys } from './use_api_keys';

jest.mock('./use_api_endpoints', () => ({
  useApiEndpoints: jest.fn(),
}));

jest.mock('./use_api_keys', () => ({
  useApiKeys: jest.fn(),
}));

jest.mock('./endpoint_field', () => ({
  EndpointField: () => <div data-test-subj="endpointFieldStub" />,
}));

jest.mock('./api_key_field', () => ({
  ApiKeyField: () => <div data-test-subj="apiKeyFieldStub" />,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseApiEndpoints = useApiEndpoints as jest.MockedFunction<typeof useApiEndpoints>;
const mockUseApiKeys = useApiKeys as jest.MockedFunction<typeof useApiKeys>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderApiEndpoints = () =>
  render(
    <I18nProvider>
      <ApiEndpoints />
    </I18nProvider>
  );

describe('ApiEndpoints', () => {
  beforeEach(() => {
    mockUseApiEndpoints.mockReturnValue({
      endpoints: [
        {
          id: ApiEndpointId.Elasticsearch,
          label: 'Elasticsearch',
          euiIconType: 'logoElasticsearch',
          url: 'https://otlp.example.com:443/_es',
          usesManagedInput: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUseApiKeys.mockReturnValue({
      encodedApiKeys: {},
      keyCreatedBeforeByEndpointId: {},
      createApiKey: jest.fn(),
    });
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            api_keys: {
              save: true,
            },
          },
        },
        share: {
          url: {
            locators: {
              get: jest.fn().mockReturnValue({
                getUrl: jest.fn().mockReturnValue(new Promise<string>(() => {})),
              }),
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('describes managed inputs and links to managed inputs documentation', () => {
    const { container } = renderApiEndpoints();
    const learnMoreLink = container.querySelector(
      '[data-test-subj="observabilityOnboardingApiEndpointsLearnMore"]'
    );

    expect(
      screen.getByText(/Send data to your deployment's managed inputs, using an API key./)
    ).toBeInTheDocument();
    expect(learnMoreLink).toHaveAttribute('href', 'https://ela.st/managed-inputs');
  });

  it('describes direct endpoints when managed OTLP is unavailable', () => {
    mockUseApiEndpoints.mockReturnValue({
      endpoints: [
        {
          id: ApiEndpointId.Prometheus,
          label: 'Prometheus',
          logo: 'prometheus',
          url: 'http://localhost:9200/_prometheus/api/v1/write',
          usesManagedInput: false,
        },
      ],
      isLoading: false,
      isError: false,
    });

    const { container } = renderApiEndpoints();
    const learnMoreLink = container.querySelector(
      '[data-test-subj="observabilityOnboardingApiEndpointsLearnMore"]'
    );

    expect(
      screen.getByText(/Access your deployment's endpoints and API keys directly./)
    ).toBeInTheDocument();
    expect(learnMoreLink).toHaveAttribute('href', 'https://ela.st/connect-deployment-endpoints');
  });

  it('updates the helper text to match the selected endpoint type', () => {
    mockUseApiEndpoints.mockReturnValue({
      endpoints: [
        {
          id: ApiEndpointId.Prometheus,
          label: 'Prometheus',
          logo: 'prometheus',
          url: 'http://localhost:9200/_prometheus/api/v1/write',
          usesManagedInput: false,
        },
        {
          id: ApiEndpointId.OpenTelemetry,
          label: 'OpenTelemetry',
          logo: 'opentelemetry',
          url: 'https://managed-otlp.example.elastic.dev:443',
          usesManagedInput: true,
        },
      ],
      isLoading: false,
      isError: false,
    });

    const { container } = renderApiEndpoints();

    expect(
      screen.getByText(/Access your deployment's endpoints and API keys directly./)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /OpenTelemetry/ }));

    expect(
      screen.getByText(/Send data to your deployment's managed inputs, using an API key./)
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="observabilityOnboardingApiEndpointsLearnMore"]')
    ).toHaveAttribute('href', 'https://ela.st/managed-inputs');
  });
});
