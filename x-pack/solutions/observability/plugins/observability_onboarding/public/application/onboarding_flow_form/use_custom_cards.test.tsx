/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';
import { usePricingFeature } from '../quickstart_flows/shared/use_pricing_feature';
import { useManagedOtlpServiceAvailability } from '../shared/use_managed_otlp_service_availability';
import { useCustomCards } from './use_custom_cards';

vi.mock('@kbn/kibana-react-plugin/public', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/kibana-react-plugin/public')),
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../quickstart_flows/shared/use_pricing_feature');
vi.mock('../shared/use_managed_otlp_service_availability');

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;
const mockUsePricingFeature = usePricingFeature as MockedFunction<typeof usePricingFeature>;
const mockUseManagedOtlpServiceAvailability =
  useManagedOtlpServiceAvailability as MockedFunction<
    typeof useManagedOtlpServiceAvailability
  >;

const CardsProbe: React.FC = () => {
  const cards = useCustomCards(vi.fn());

  return (
    <dl>
      {cards.map((card: IntegrationCardItem) => (
        <React.Fragment key={card.id}>
          <dt>{card.id}</dt>
          <dd data-test-subj={`card-name-${card.id}`}>{card.name}</dd>
          <dd data-test-subj={`card-title-${card.id}`}>{card.title}</dd>
          <dd data-test-subj={`card-description-${card.id}`}>{card.description}</dd>
          <dd data-test-subj={`card-icon-${card.id}`}>{card.icons?.[0]?.src}</dd>
          <dd data-test-subj={`card-url-${card.id}`}>{card.url}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

describe('useCustomCards', () => {
  beforeEach(() => {
    mockUsePricingFeature.mockReturnValue(true);
    mockUseManagedOtlpServiceAvailability.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: vi.fn(() => '/app/mock'),
        },
        http: {
          staticAssets: {
            getPluginAssetHref: vi.fn(
              (asset: string) => `/plugins/observabilityOnboarding/${asset}`
            ),
          },
        },
        featureFlags: {
          useBooleanValue: vi.fn(() => false),
        },
        context: {
          isCloud: false,
          isDev: false,
          isServerless: false,
        },
        share: {
          url: {
            locators: {
              get: vi.fn(() => ({ getRedirectUrl: vi.fn(() => '/app/redirect') })),
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana<ObservabilityOnboardingAppServices>>);
  });

  it('uses the merged Kubernetes OTel quickstart for the Kubernetes add data entry', () => {
    render(
      <MemoryRouter>
        <CardsProbe />
      </MemoryRouter>
    );

    expect(screen.getByTestId('card-url-otel-kubernetes')).toHaveTextContent(/^\/kubernetes$/);
  });

  it('exposes the AWS CloudWatch OTel quickstart card with expected metadata', () => {
    render(
      <MemoryRouter>
        <CardsProbe />
      </MemoryRouter>
    );

    expect(screen.getByText('aws-cloudwatch-otel-virtual')).toBeInTheDocument();
    expect(screen.getByTestId('card-name-aws-cloudwatch-otel-virtual')).toHaveTextContent(
      'aws-cloudwatch-otel'
    );
    expect(screen.getByTestId('card-title-aws-cloudwatch-otel-virtual')).toHaveTextContent('AWS');
    expect(screen.getByTestId('card-description-aws-cloudwatch-otel-virtual')).toHaveTextContent(
      'Collect signals from AWS with OpenTelemetry'
    );
    expect(screen.getByTestId('card-icon-aws-cloudwatch-otel-virtual')).toHaveTextContent(
      'logoAWS'
    );
    expect(screen.getByTestId('card-url-aws-cloudwatch-otel-virtual')).toHaveTextContent(/^\/aws$/);
  });
});
