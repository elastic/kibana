/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { WebCrawlsPageProps } from '@kbn/elasticsearch-home/public';
import { useKibana } from '../../hooks/use_kibana';
import { SearchWebCrawlsPage } from './web_crawls';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

describe('SearchWebCrawlsPage', () => {
  const { application } = coreMock.createStart();
  const sharedWebCrawlsPage = jest.fn((_props: WebCrawlsPageProps) => null);
  const classicNav = { name: 'Elasticsearch', items: [] };
  const searchNavigation = {
    breadcrumbs: { setSearchBreadCrumbs: jest.fn() },
    useClassicNavigation: jest.fn(() => classicNav),
  };

  const renderPage = (services = {}) => {
    mockUseKibana.mockReturnValue({
      services: {
        application,
        elasticsearchHome: { WebCrawlsPage: sharedWebCrawlsPage },
        history: {},
        searchNavigation,
        ...services,
      },
    });

    return render(<SearchWebCrawlsPage />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    application.getUrlForApp.mockReturnValue('/app/elasticsearch/home');
  });

  it('renders the shared page under the Elasticsearch identity and classic nav', () => {
    renderPage();

    const [[props]] = sharedWebCrawlsPage.mock.calls;
    expect(props).toEqual(
      expect.objectContaining({
        telemetryPrefix: 'searchHomepage',
        storageKeyPrefix: 'searchHomepage',
        solutionNav: classicNav,
      })
    );
  });

  it('returns to the home page from the back link', () => {
    renderPage();

    const [[{ onNavigateHome }]] = sharedWebCrawlsPage.mock.calls;
    onNavigateHome?.();

    expect(application.navigateToApp).toHaveBeenCalledWith('searchHomepage');
  });

  it('sets a breadcrumb trail that leads back to Home', () => {
    renderPage();

    expect(searchNavigation.breadcrumbs.setSearchBreadCrumbs).toHaveBeenCalledWith([
      { text: 'Home', href: '/app/elasticsearch/home' },
      { text: 'Web crawls' },
    ]);
  });

  it('renders the embeddable console when the console plugin is available', () => {
    renderPage({
      console: { EmbeddableConsole: () => <div data-test-subj="embeddableConsole" /> },
    });

    expect(screen.getByTestId('embeddableConsole')).toBeInTheDocument();
  });
});
