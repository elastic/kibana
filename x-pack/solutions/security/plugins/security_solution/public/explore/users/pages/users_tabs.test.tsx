/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';

import { TestProviders } from '../../../common/mock';
import { Users } from './users';
import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../data_view_manager/hooks/__mocks__/use_data_view';

vi.mock('../../../common/components/empty_prompt');
vi.mock('../../../common/components/search_bar', () => {
  const mocked = {
    SiemSearchBar: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/components/query_bar', () => {
  const mocked = {
    QueryBar: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/components/visualization_actions/actions');
vi.mock('../../../common/components/visualization_actions/lens_embeddable');
const mockNavigateToApp = vi.fn();
vi.mock('../../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          ...original.useKibana().services.application,
          navigateToApp: mockNavigateToApp,
        },
        cases: {
          ui: {
            getCasesContext: vi.fn().mockReturnValue(mockCasesContext),
          },
        },
      },
    }),
  };
});
type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  goBack: vi.fn(),
  goForward: vi.fn(),
  block: vi.fn(),
  createHref: vi.fn(),
  listen: vi.fn(),
};

describe('Users - rendering', () => {
  test('it renders getting started page when no index is available', async () => {
    render(
      <TestProviders>
        <Router history={mockHistory}>
          <Users />
        </Router>
      </TestProviders>
    );

    expect(screen.getByTestId('empty-prompt')).toBeInTheDocument();
  });

  test('it should render tab navigation', async () => {
    vi.mocked(useDataView).mockReturnValue(withIndices(['test-index']));

    render(
      <TestProviders>
        <Router history={mockHistory}>
          <Users />
        </Router>
      </TestProviders>
    );
    expect(screen.getByTestId('navigation-container')).toBeInTheDocument();
  });
});
