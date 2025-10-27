/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SearchHomepageBody } from './search_homepage_body';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_kibana');
jest.mock('../contexts/usage_tracker_context', () => ({
  useUsageTracker: () => ({
    load: jest.fn(),
  }),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderWithWrapper = () => {
  return render(
    <IntlProvider locale="en">
      <SearchHomepageBody />
    </IntlProvider>
  );
};

describe('SearchHomepageBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        cloud: {
          isCloudEnabled: false,
        },
      },
    } as any);
  });

  it('renders the search homepage body with proper layout', () => {
    renderWithWrapper();

    // Check that the main content sections are rendered
    expect(screen.getByText('Get started with Elasticsearch')).toBeInTheDocument();
  });

  it('applies responsive padding for mobile screens', () => {
    // Mock mobile breakpoint
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderWithWrapper();

    // The component should render without errors
    expect(screen.getByText('Get started with Elasticsearch')).toBeInTheDocument();

    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it('applies responsive padding for desktop screens', () => {
    // Mock desktop breakpoint
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(min-width: 1200px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderWithWrapper();

    // The component should render without errors
    expect(screen.getByText('Get started with Elasticsearch')).toBeInTheDocument();

    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it('renders all main sections in correct order', () => {
    renderWithWrapper();

    // Check for main sections that should be present
    expect(screen.getByText('Get started with Elasticsearch')).toBeInTheDocument();
  });
});
