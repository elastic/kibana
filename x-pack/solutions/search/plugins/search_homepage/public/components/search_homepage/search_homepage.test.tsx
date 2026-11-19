/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { ElasticsearchHomePageProps } from '@kbn/elasticsearch-home/public';
import { useKibana } from '../../hooks/use_kibana';
import { SearchHomepagePage } from './search_homepage';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

describe('SearchHomepagePage', () => {
  const { application } = coreMock.createStart();
  const sharedHomePage = jest.fn((_props: ElasticsearchHomePageProps) => null);
  const classicNav = { name: 'Elasticsearch', items: [] };
  const searchNavigation = {
    breadcrumbs: { setSearchBreadCrumbs: jest.fn() },
    useClassicNavigation: jest.fn(() => classicNav),
  };

  const renderPage = (services = {}) => {
    mockUseKibana.mockReturnValue({
      services: {
        application,
        elasticsearchHome: { HomePage: sharedHomePage },
        history: {},
        searchNavigation,
        ...services,
      },
    });

    return render(<SearchHomepagePage />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the classic solution nav through to the shared home page', () => {
    renderPage();

    const [[{ solutionNav }]] = sharedHomePage.mock.calls;
    expect(solutionNav).toBe(classicNav);
  });

  it('sets the Home breadcrumb', () => {
    renderPage();

    expect(searchNavigation.breadcrumbs.setSearchBreadCrumbs).toHaveBeenCalledWith([
      { text: 'Home' },
    ]);
  });

  it('renders the embeddable console when the console plugin is available', () => {
    renderPage({
      console: { EmbeddableConsole: () => <div data-test-subj="embeddableConsole" /> },
    });

    expect(screen.getByTestId('embeddableConsole')).toBeInTheDocument();
  });
});
