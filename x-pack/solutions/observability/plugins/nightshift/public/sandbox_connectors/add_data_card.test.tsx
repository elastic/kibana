/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { AddDataCard } from './add_data_card';
import { mockKibanaServices, renderWithProviders } from './test_utils';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

describe('AddDataCard', () => {
  it('sends to the Observability onboarding flow through its locator', () => {
    const { navigateToUrl, onboardingLocator } = mockKibanaServices();
    renderWithProviders(<AddDataCard />);

    expect(screen.getByTestId('nightshiftAddDataCard')).toHaveTextContent(
      'Add data in 10+ other ways'
    );
    expect(screen.getByTestId('nightshiftAddDataLogos')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftAddDataButton'));

    expect(onboardingLocator.getRedirectUrl).toHaveBeenCalledWith({});
    expect(navigateToUrl).toHaveBeenCalledWith('/app/observabilityOnboarding?from=locator');
  });

  it('falls back to the onboarding app URL without the locator', () => {
    const { navigateToUrl } = mockKibanaServices({ withOnboardingLocator: false });
    renderWithProviders(<AddDataCard />);

    fireEvent.click(screen.getByTestId('nightshiftAddDataButton'));

    expect(navigateToUrl).toHaveBeenCalledWith('/app/observabilityOnboarding');
  });
});
