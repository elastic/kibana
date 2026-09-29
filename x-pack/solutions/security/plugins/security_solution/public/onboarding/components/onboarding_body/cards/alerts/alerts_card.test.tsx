/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';
import { AlertsCard } from './alerts_card';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { render } from '@testing-library/react';
import { OnboardingContextProvider } from '../../../onboarding_context';
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';

vi.mock('../../../../../common/experimental_features_service', () => {
  const mocked = {
    ExperimentalFeaturesService: { get: vi.fn() },
  };
  return { ...mocked, default: mocked };
});
const mockExperimentalFeatures = ExperimentalFeaturesService.get as Mock;
const mockIsCardComplete = vi.fn();
const mockIsCardAvailable = vi.fn();

const props = {
  setComplete: vi.fn(),
  checkComplete: vi.fn(),
  isCardComplete: vi.fn(),
  setExpandedCardId: vi.fn(),
  isCardAvailable: vi.fn(),
};

describe('AlertsCard', () => {
  beforeEach(() => {
    mockExperimentalFeatures.mockReturnValue({});
    vi.clearAllMocks();
  });

  it('description should be in the document', () => {
    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <AlertsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('alertsCardDescription')).toBeInTheDocument();
  });

  it('card callout should not be rendered if integrations card is not available', () => {
    mockIsCardAvailable.mockReturnValueOnce(false);

    const { queryByText } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <AlertsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(queryByText('To view alerts add integrations first.')).not.toBeInTheDocument();
  });

  it('card button should be enabled if integrations card is complete', () => {
    mockIsCardAvailable.mockReturnValueOnce(true);
    mockIsCardComplete.mockReturnValueOnce(true);

    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <AlertsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('alertsCardButton').querySelector('button')).not.toBeDisabled();
  });
});
