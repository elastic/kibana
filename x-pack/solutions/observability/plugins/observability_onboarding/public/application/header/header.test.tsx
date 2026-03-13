/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { Header } from './header';

let mockIsSmallScreen = false;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: (breakpoints: string[]) => {
      if (mockIsSmallScreen && (breakpoints.includes('xs') || breakpoints.includes('s'))) {
        return true;
      }
      return false;
    },
  };
});

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => <>{defaultMessage}</>,
}));

describe('Header', () => {
  beforeEach(() => {
    mockIsSmallScreen = false;
  });

  it('should render title and description', () => {
    render(<Header />);

    expect(screen.getByTestId('obltOnboardingHomeTitle')).toBeInTheDocument();
    expect(screen.getByText('Add Observability data')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Start ingesting Observability data into Elastic. Return to this page at any time by clicking Add data.'
      )
    ).toBeInTheDocument();
  });

  describe('responsive behavior', () => {
    it('should render correctly on large screens', () => {
      mockIsSmallScreen = false;
      render(<Header />);

      // Title should be visible on large screens
      expect(screen.getByTestId('obltOnboardingHomeTitle')).toBeInTheDocument();
      expect(screen.getByText('Add Observability data')).toBeInTheDocument();
    });

    it('should render correctly on small screens', () => {
      mockIsSmallScreen = true;
      render(<Header />);

      // Component should still render correctly on small screens
      expect(screen.getByTestId('obltOnboardingHomeTitle')).toBeInTheDocument();
      expect(screen.getByText('Add Observability data')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Start ingesting Observability data into Elastic. Return to this page at any time by clicking Add data.'
        )
      ).toBeInTheDocument();
    });
  });
});
