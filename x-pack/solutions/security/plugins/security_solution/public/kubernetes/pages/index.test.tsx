/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { KubernetesSecurityDeps } from '@kbn/kubernetes-security-plugin/public/types';
import { TestProviders } from '../../common/mock';
import { DASHBOARDS, KUBERNETES } from '../../app/translations';
import { KubernetesContainer } from '.';

const mockGetKubernetesPage = jest.fn(({ renderHeader, filter }: KubernetesSecurityDeps) => (
  <>
    {renderHeader({
      description: 'Updated now',
      menu: {
        items: [
          {
            id: 'mockToggle',
            label: 'Hide charts',
            iconType: 'eyeSlash',
            run: jest.fn(),
            testId: 'mockToggle',
          },
        ],
      },
    })}
    {filter}
  </>
));

jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        kubernetesSecurity: { getKubernetesPage: mockGetKubernetesPage },
      },
    }),
  };
});
jest.mock('../../common/components/link_to', () => ({
  ...jest.requireActual('../../common/components/link_to'),
  useGetSecuritySolutionUrl:
    () =>
    ({ deepLinkId }: { deepLinkId: string }) =>
      `/app/security/${deepLinkId}`,
}));
jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: ({ displayStyle }: { displayStyle?: string }) => (
    <div data-test-subj="mockSiemSearchBar" data-display-style={displayStyle} />
  ),
}));
jest.mock('../../common/hooks/use_invalid_filter_query');
jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({
    dataView: { id: 'dataViewId', title: 'logs-*', toSpec: () => ({ fields: {} }) },
  }),
}));

const renderKubernetesPage = () =>
  render(
    <TestProviders>
      <MemoryRouter>
        <KubernetesContainer />
      </MemoryRouter>
    </TestProviders>
  );

describe('KubernetesContainer', () => {
  it('renders the Kubernetes title in the app header', () => {
    renderKubernetesPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(KUBERNETES);
  });

  it('renders a back button that points to the Dashboards page', () => {
    renderKubernetesPage();

    const backButton = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(backButton).toHaveAttribute('href', '/app/security/dashboards');
    expect(backButton).toHaveAttribute('aria-label', expect.stringContaining(DASHBOARDS));
  });

  it('renders the description and menu items provided by the Kubernetes page', async () => {
    renderKubernetesPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Updated now'
    );
    await openAppMenuOverflow();
    expect(screen.getByTestId('mockToggle')).toBeInTheDocument();
  });

  it('renders the search bar in the page rather than in the global filters portal', () => {
    renderKubernetesPage();

    expect(screen.getByTestId('mockSiemSearchBar')).toHaveAttribute('data-display-style', 'inPage');
  });
});
