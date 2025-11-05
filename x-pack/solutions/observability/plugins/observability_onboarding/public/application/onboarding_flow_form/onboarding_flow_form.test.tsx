/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OnboardingFlowForm } from './onboarding_flow_form';
import { usePricingFeature } from '../quickstart_flows/shared/use_pricing_feature';
import { MemoryRouter } from 'react-router-dom-v5-compat';
import { I18nProvider } from '@kbn/i18n-react';
import { ObservabilityOnboardingPricingFeature } from '../../../common/pricing_features';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../quickstart_flows/shared/use_pricing_feature');
jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({
    onPageReady: jest.fn(),
  }),
}));

jest.mock('./use_custom_cards', () => ({
  useCustomCards: () => [],
}));

jest.mock('../package_list/package_list', () => ({
  PackageList: ({ list }: { list: any[] }) => (
    <div data-test-subj="package-list">
      {list.map((item, index) => (
        <div key={index} data-test-subj={`package-item-${item.id || index}`}>
          {item.title || item.name}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../package_list_search_form/package_list_search_form', () => ({
  PackageListSearchForm: () => <div data-test-subj="package-search-form">Search Form</div>,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUsePricingFeature = usePricingFeature as jest.MockedFunction<typeof usePricingFeature>;

const renderWithProviders = (children: React.ReactNode) => {
  return render(
    <MemoryRouter>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>
  );
};

describe('OnboardingFlowForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        context: {
          isCloud: false,
        },
      },
    } as any);
  });

  describe('Complete Tier (Metrics Onboarding Enabled)', () => {
    beforeEach(() => {
      mockUsePricingFeature.mockReturnValue(true);
    });

    it('should render all 4 use case tiles including Application', () => {
      renderWithProviders(<OnboardingFlowForm />);

      expect(screen.getByText('Host')).toBeInTheDocument();
      expect(screen.getByText('Kubernetes')).toBeInTheDocument();
      expect(screen.getByText('Cloud')).toBeInTheDocument();
      expect(screen.getByText('Application')).toBeInTheDocument();
    });

    it('should show complete tier description for Host', () => {
      renderWithProviders(<OnboardingFlowForm />);

      expect(
        screen.getByText(/Track your host and its services by setting up SLOs/)
      ).toBeInTheDocument();
    });

    it('should show complete tier description for Kubernetes', () => {
      renderWithProviders(<OnboardingFlowForm />);

      expect(
        screen.getByText(/Monitor your Kubernetes cluster and container workloads using logs/)
      ).toBeInTheDocument();
    });

    it('should call usePricingFeature with the correct feature', () => {
      renderWithProviders(<OnboardingFlowForm />);

      expect(mockUsePricingFeature).toHaveBeenCalledWith(
        ObservabilityOnboardingPricingFeature.METRICS_ONBOARDING
      );
    });

    it('should use 2-column grid layout for complete tier', () => {
      renderWithProviders(<OnboardingFlowForm />);

      const grid = screen.getByTestId('observabilityOnboardingUseCaseGrid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Logs-Essentials Tier (Metrics Onboarding Disabled)', () => {
    beforeEach(() => {
      mockUsePricingFeature.mockReturnValue(false);
    });

    it('should render only 3 use case tiles without Application', () => {
      renderWithProviders(<OnboardingFlowForm />);

      expect(screen.getByText('Host')).toBeInTheDocument();
      expect(screen.getByText('Kubernetes')).toBeInTheDocument();
      expect(screen.getByText('Cloud')).toBeInTheDocument();
      expect(screen.queryByText('Application')).not.toBeInTheDocument();
    });

    it('should show logs-essentials description for Host', () => {
      renderWithProviders(<OnboardingFlowForm />);

      expect(
        screen.getByText(/Ingest and analyze logs on your host such as OS, service/)
      ).toBeInTheDocument();
    });

    it('should show logs-essentials description for Kubernetes', () => {
      renderWithProviders(<OnboardingFlowForm />);

      expect(
        screen.getByText(/Observe logs from your Kubernetes environments/)
      ).toBeInTheDocument();
    });

    it('should use 3-column grid layout for logs-essentials tier', () => {
      renderWithProviders(<OnboardingFlowForm />);

      const grid = screen.getByTestId('observabilityOnboardingUseCaseGrid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Common Elements', () => {
    it('should always show the main question', () => {
      mockUsePricingFeature.mockReturnValue(true);
      renderWithProviders(<OnboardingFlowForm />);

      expect(screen.getByText('What do you want to monitor?')).toBeInTheDocument();
    });

    it('should always show Cloud tile with same description', () => {
      mockUsePricingFeature.mockReturnValue(false);
      renderWithProviders(<OnboardingFlowForm />);

      expect(screen.getByText('Cloud')).toBeInTheDocument();
      expect(
        screen.getByText(/Ingest telemetry data from your cloud services to better understand/)
      ).toBeInTheDocument();
    });

    it('should render search section', () => {
      mockUsePricingFeature.mockReturnValue(true);
      renderWithProviders(<OnboardingFlowForm />);

      expect(screen.getByText(/Search through other ways of ingesting data/)).toBeInTheDocument();
      expect(screen.getByTestId('package-search-form')).toBeInTheDocument();
    });
  });
});
