/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import type { Filter } from '@kbn/es-query';
import { createMockStore, TestProviders } from '../../../common/mock';
import { inputsActions } from '../../../common/store/inputs';
import { Hosts } from './hosts';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { HostsTabs } from './hosts_tabs';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({ tabName: 'allHosts' }),
}));
jest.mock('../../../common/components/empty_prompt');
// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../../common/components/visualization_actions/actions');
jest.mock('../../../common/components/visualization_actions/lens_embeddable', () => ({
  LensEmbeddable: jest.fn(() => <div data-test-subj="mock-lens-embeddable" />),
}));
const mockNavigateToApp = jest.fn();
jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

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
          ...mockCasesContract(),
        },
      },
    }),
  };
});

jest.mock('./hosts_tabs', () => ({
  ...jest.requireActual('./hosts_tabs'),
  HostsTabs: jest.fn(() => <div data-test-subj="hosts-tabs-mock" />),
}));

const HostsTabsMocked = HostsTabs as jest.MockedFunction<typeof HostsTabs>;

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
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
};
const myStore = createMockStore();

describe('Hosts - rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the Setup Instructions text when no index is available', async () => {
    render(
      <TestProviders store={myStore}>
        <Router history={mockHistory}>
          <Hosts />
        </Router>
      </TestProviders>
    );

    expect(screen.getByTestId('empty-prompt')).toBeInTheDocument();
  });

  test('it DOES NOT render the Setup Instructions text when an index is available', async () => {
    jest.mocked(useDataView).mockReturnValue(withIndices(['test']));

    render(
      <TestProviders store={myStore}>
        <Router history={mockHistory}>
          <Hosts />
        </Router>
      </TestProviders>
    );
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });

  test('it should render tab navigation', async () => {
    render(
      <TestProviders store={myStore}>
        <Router history={mockHistory}>
          <Hosts />
        </Router>
      </TestProviders>
    );

    expect(screen.getByTestId('navigation-container')).toBeInTheDocument();
  });

  test('it should add the new filters after init', async () => {
    const newFilters: Filter[] = [
      {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        'host.name': 'ItRocks',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        meta: {
          alias: '',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value:
            '{"query": {"bool": {"filter": [{"bool": {"should": [{"match_phrase": {"host.name": "ItRocks"}}],"minimum_should_match": 1}}]}}}',
        },
      },
    ];
    render(
      <TestProviders store={myStore}>
        <Router history={mockHistory}>
          <Hosts />
        </Router>
      </TestProviders>
    );

    myStore.dispatch(
      inputsActions.setSearchBarFilter({ id: InputsModelId.global, filters: newFilters })
    );

    await waitFor(() => {
      expect(HostsTabsMocked).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filterQuery:
            '{"bool":{"must":[],"filter":[{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"ItRocks"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
        }),
        {}
      );
    });
  });
});
