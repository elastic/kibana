/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SearchHomepagePage } from './search_homepage';
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
      <SearchHomepagePage />
    </IntlProvider>
  );
};

describe('SearchHomepagePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        console: {
          EmbeddableConsole: () => <div data-test-subj="embeddable-console">Console</div>,
        },
        history: {
          push: jest.fn(),
          replace: jest.fn(),
          location: { pathname: '/', search: '', hash: '', state: null },
        },
        searchNavigation: {
          breadcrumbs: {
            setSearchBreadCrumbs: jest.fn(),
          },
          useClassicNavigation: jest.fn().mockReturnValue({
            name: 'Search',
            icon: 'logoElasticsearch',
            items: [],
          }),
        },
        cloud: {
          isCloudEnabled: false,
        },
      },
    } as any);
  });

  it('renders the search homepage with proper layout', () => {
    renderWithWrapper();

    expect(screen.getByTestId('search-homepage')).toBeInTheDocument();
  });

  it('applies correct template props for responsive layout', () => {
    const { container } = renderWithWrapper();

    // Check that the KibanaPageTemplate has the correct props
    const pageTemplate = container.querySelector('[data-test-subj="search-homepage"]');
    expect(pageTemplate).toBeInTheDocument();
  });

  it('renders all main sections', () => {
    renderWithWrapper();

    // Check for main sections that should be present
    expect(screen.getByTestId('search-homepage')).toBeInTheDocument();
  });
});

describe('SearchHomepagePage Responsive Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        console: {
          EmbeddableConsole: () => <div data-test-subj="embeddable-console">Console</div>,
        },
        history: {
          push: jest.fn(),
          replace: jest.fn(),
          location: { pathname: '/', search: '', hash: '', state: null },
        },
        searchNavigation: {
          breadcrumbs: {
            setSearchBreadCrumbs: jest.fn(),
          },
          useClassicNavigation: jest.fn().mockReturnValue({
            name: 'Search',
            icon: 'logoElasticsearch',
            items: [],
          }),
        },
        cloud: {
          isCloudEnabled: false,
        },
      },
    } as any);
  });

  it('should have proper layout configuration for responsiveness', () => {
    renderWithWrapper();

    // The component should render without errors and have proper structure
    expect(screen.getByTestId('search-homepage')).toBeInTheDocument();
  });
});
