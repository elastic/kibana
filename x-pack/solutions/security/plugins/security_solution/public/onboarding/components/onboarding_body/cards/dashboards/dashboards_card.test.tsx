/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { OnboardingContextProvider } from '../../../onboarding_context';
import DashboardsCard from './dashboards_card';
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';

jest.mock('../../../../../common/experimental_features_service', () => ({
  ExperimentalFeaturesService: { get: jest.fn() },
}));
const mockExperimentalFeatures = ExperimentalFeaturesService.get as jest.Mock;

const mockSetComplete = jest.fn();
const mockSetExpandedCardId = jest.fn();
const mockIsCardComplete = jest.fn();
const mockIsCardAvailable = jest.fn();

const props = {
  setComplete: mockSetComplete,
  checkComplete: jest.fn(),
  isCardComplete: mockIsCardComplete,
  setExpandedCardId: mockSetExpandedCardId,
  isExpanded: true,
  isCardAvailable: mockIsCardAvailable,
};

describe('DashboardsCard', () => {
  beforeEach(() => {
    mockExperimentalFeatures.mockReturnValue({});
    jest.clearAllMocks();
  });

  it('description should be in the document', () => {
    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('dashboardsDescription')).toBeInTheDocument();
  });

  it('card callout should be rendered if integrations card is available but not complete', () => {
    mockIsCardAvailable.mockReturnValueOnce(true);
    mockIsCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByText('To view dashboards add integrations first.')).toBeInTheDocument();
  });

  it('card callout should not be rendered if integrations card is not available', () => {
    mockIsCardAvailable.mockReturnValueOnce(false);

    const { queryByText } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(queryByText('To view dashboards add integrations first.')).not.toBeInTheDocument();
  });

  it('renders card callout if integrations card is not complete', () => {
    mockIsCardAvailable.mockReturnValueOnce(true);
    mockIsCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByText('To view dashboards add integrations first.')).toBeInTheDocument();
  });

  it('renders a disabled button if integrations card is not complete', () => {
    mockIsCardAvailable.mockReturnValueOnce(true);
    mockIsCardComplete.mockReturnValueOnce(false);

    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('dashboardsCardButton').querySelector('button')).toBeDisabled();
  });

  it('renders an enabled button if integrations card is complete', () => {
    mockIsCardAvailable.mockReturnValueOnce(true);
    mockIsCardComplete.mockReturnValueOnce(true);

    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('dashboardsCardButton').querySelector('button')).not.toBeDisabled();
  });

  it('calls setExpandedCardId when the callout link is clicked', () => {
    mockIsCardAvailable.mockReturnValueOnce(true);
    mockIsCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    const calloutLink = getByText('Add integrations step');
    fireEvent.click(calloutLink);

    expect(mockSetExpandedCardId).toHaveBeenCalledWith('integrations', { scroll: true });
  });
});
