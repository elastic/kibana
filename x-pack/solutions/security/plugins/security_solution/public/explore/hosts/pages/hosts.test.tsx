/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

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

vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useParams: vi.fn().mockReturnValue({ tabName: 'allHosts' }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/components/empty_prompt');
// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
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
vi.mock('../../../common/components/visualization_actions/lens_embeddable', () => {
  const mocked = {
    LensEmbeddable: vi.fn(() => <div data-test-subj="mock-lens-embeddable" />),
  };
  return { ...mocked, default: mocked };
});
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
          ...mockCasesContract(),
        },
      },
    }),
  };
});

vi.mock('./hosts_tabs', async () => {
  const mocked = {
    ...(await vi.importActual('./hosts_tabs')),
    HostsTabs: vi.fn(() => <div data-test-subj="hosts-tabs-mock" />),
  };
  return { ...mocked, default: mocked };
});

const HostsTabsMocked = HostsTabs as MockedFunction<typeof HostsTabs>;

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
const myStore = createMockStore();

describe('Hosts - rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(useDataView).mockReturnValue(withIndices(['test']));

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
