/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { ElasticsearchHomeAppProps } from '@kbn/elasticsearch-home/public';
import { useKibana } from '../../hooks/use_kibana';
import { IntegratedHomeApp } from './integrated_home_app';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

describe('IntegratedHomeApp', () => {
  const { application } = coreMock.createStart();
  const sharedHomeApp = jest.fn((_props: ElasticsearchHomeAppProps) => null);
  const classicNav = { name: 'Elasticsearch', items: [] };
  const searchNavigation = {
    breadcrumbs: { setSearchBreadCrumbs: jest.fn() },
    useClassicNavigation: jest.fn(() => classicNav),
  };

  const renderApp = (services = {}) => {
    mockUseKibana.mockReturnValue({
      services: {
        application,
        elasticsearchHome: { HomeApp: sharedHomeApp },
        history: {},
        searchNavigation,
        ...services,
      },
    });

    return render(<IntegratedHomeApp />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the shared home app with the search identity and classic solution nav', () => {
    renderApp();

    const [[props]] = sharedHomeApp.mock.calls;
    expect(props).toEqual(
      expect.objectContaining({ telemetryPrefix: 'searchHomepage', solutionNav: classicNav })
    );
  });

  it('applies breadcrumbs through search navigation', () => {
    renderApp();

    const [[{ setBreadcrumbs }]] = sharedHomeApp.mock.calls;
    expect(setBreadcrumbs).toBe(searchNavigation.breadcrumbs.setSearchBreadCrumbs);
  });

  it('renders the embeddable console when the console plugin is available', () => {
    renderApp({
      console: { EmbeddableConsole: () => <div data-test-subj="embeddableConsole" /> },
    });

    expect(screen.getByTestId('embeddableConsole')).toBeInTheDocument();
  });
});
