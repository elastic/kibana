/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
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
  EndpointField: ({
    label,
    url,
    dataTestSubjSuffix = '',
  }: {
    label?: string;
    url?: string;
    dataTestSubjSuffix?: string;
  }) => (
    <div data-test-subj={`endpointFieldStub${dataTestSubjSuffix}`} data-label={label ?? ''}>
      {url}
    </div>
  ),
}));

jest.mock('./api_key_field', () => ({
  ApiKeyField: ({ dataTestSubjSuffix = '' }: { dataTestSubjSuffix?: string }) => (
    <div data-test-subj={`apiKeyFieldStub${dataTestSubjSuffix}`} />
  ),
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
          additionalEndpoints: [],
        },
      ],
      popoverEndpoints: [],
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
        http: {
          staticAssets: {
            getPluginAssetHref: jest.fn().mockReturnValue('supabase.svg'),
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
          additionalEndpoints: [],
        },
      ],
      popoverEndpoints: [],
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
          additionalEndpoints: [],
        },
        {
          id: ApiEndpointId.OpenTelemetry,
          label: 'OpenTelemetry',
          logo: 'opentelemetry',
          url: 'https://managed-otlp.example.elastic.dev:443',
          usesManagedInput: true,
          additionalEndpoints: [],
        },
      ],
      popoverEndpoints: [],
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

  it('renders a full vendor row with its own API key field on the OpenTelemetry tab', () => {
    mockUseApiEndpoints.mockReturnValue({
      endpoints: [
        {
          id: ApiEndpointId.OpenTelemetry,
          label: 'OpenTelemetry',
          logo: 'opentelemetry',
          url: 'https://otlp.example.com:443',
          usesManagedInput: true,
          additionalEndpoints: [
            {
              id: ApiEndpointId.Supabase,
              cardTitle: 'Supabase',
              fieldLabel: 'Supabase logs endpoint',
              logo: 'supabase' as const,
              url: 'https://otlp.example.com:443/inputs/supabase/_default_/v1/logs',
            },
          ],
        },
      ],
      popoverEndpoints: [],
      isLoading: false,
      isError: false,
    });

    renderApiEndpoints();

    expect(screen.getByTestId('endpointFieldStub-supabase')).toHaveAttribute(
      'data-label',
      'Supabase logs endpoint'
    );
    expect(screen.getByTestId('apiKeyFieldStub-supabase')).toBeInTheDocument();
  });

  it('renders no vendor endpoint fields when the selected endpoint has none', () => {
    renderApiEndpoints();

    expect(screen.queryByTestId('endpointFieldStub-supabase')).not.toBeInTheDocument();
    expect(screen.queryByTestId('endpointFieldStub-vercel')).not.toBeInTheDocument();
  });

  it('hides vendor endpoint fields after switching to a tab without them', () => {
    mockUseApiEndpoints.mockReturnValue({
      endpoints: [
        {
          id: ApiEndpointId.OpenTelemetry,
          label: 'OpenTelemetry',
          logo: 'opentelemetry',
          url: 'https://otlp.example.com:443',
          usesManagedInput: true,
          additionalEndpoints: [
            {
              id: ApiEndpointId.Supabase,
              cardTitle: 'Supabase',
              fieldLabel: 'Supabase logs endpoint',
              logo: 'supabase' as const,
              url: 'https://otlp.example.com:443/inputs/supabase/_default_/v1/logs',
            },
            {
              id: ApiEndpointId.Vercel,
              cardTitle: 'Vercel',
              fieldLabel: 'Vercel endpoint',
              logo: 'vercel_black' as const,
              url: 'https://otlp.example.com:443/inputs/vercel/_default_',
            },
          ],
        },
        {
          id: ApiEndpointId.Prometheus,
          label: 'Prometheus',
          logo: 'prometheus',
          url: 'https://otlp.example.com:443/api/v1/write',
          usesManagedInput: true,
          additionalEndpoints: [],
        },
      ],
      popoverEndpoints: [],
      isLoading: false,
      isError: false,
    });

    renderApiEndpoints();

    expect(screen.getByTestId('endpointFieldStub-supabase')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('observabilityOnboardingApiEndpointTab-prometheus'));

    expect(screen.queryByTestId('endpointFieldStub-supabase')).not.toBeInTheDocument();
    expect(screen.queryByTestId('endpointFieldStub-vercel')).not.toBeInTheDocument();
  });
  it('hides the More button when no popover endpoints resolve', () => {
    renderApiEndpoints();

    expect(
      screen.queryByTestId('observabilityOnboardingMoreEndpointsButton')
    ).not.toBeInTheDocument();
  });

  it('opens the Other endpoints popover with vendor cards', async () => {
    mockUseApiEndpoints.mockReturnValue({
      endpoints: [
        {
          id: ApiEndpointId.OpenTelemetry,
          label: 'OpenTelemetry',
          logo: 'opentelemetry',
          url: 'https://otlp.example.com:443',
          usesManagedInput: true,
          additionalEndpoints: [],
        },
      ],
      popoverEndpoints: [
        {
          id: ApiEndpointId.Supabase,
          cardTitle: 'Supabase',
          fieldLabel: 'Supabase logs endpoint',
          logo: 'supabase' as const,
          url: 'https://otlp.example.com:443/inputs/supabase/_default_/v1/logs',
        },
        {
          id: ApiEndpointId.Vercel,
          cardTitle: 'Vercel',
          fieldLabel: 'Vercel endpoint',
          logo: 'vercel_black' as const,
          url: 'https://otlp.example.com:443/inputs/vercel/_default_',
        },
      ],
      isLoading: false,
      isError: false,
    });

    renderApiEndpoints();

    fireEvent.click(screen.getByTestId('observabilityOnboardingMoreEndpointsButton'));
    await waitForEuiPopoverOpen();

    expect(screen.getByText('Other endpoints')).toBeInTheDocument();
    expect(screen.getByTestId('endpointFieldStub-supabase-popover')).toBeInTheDocument();
    expect(screen.getByTestId('endpointFieldStub-vercel-popover')).toBeInTheDocument();
    expect(screen.getByTestId('apiKeyFieldStub-supabase-popover')).toBeInTheDocument();
    expect(screen.getByTestId('apiKeyFieldStub-vercel-popover')).toBeInTheDocument();
  });
});
