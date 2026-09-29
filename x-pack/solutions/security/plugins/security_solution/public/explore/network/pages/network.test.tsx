/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import type { Filter } from '@kbn/es-query';
import { createMockStore, TestProviders } from '../../../common/mock';
import { inputsActions } from '../../../common/store/inputs';

import { Network } from './network';
import { NetworkRoutes } from './navigation';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';

import { InputsModelId } from '../../../common/store/inputs/constants';
import { SECURITY_FEATURE_ID } from '../../../../common/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { withMatchedIndices } from '../../../data_view_manager/hooks/__mocks__/use_data_view';

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
vi.mock('../../../common/components/visualization_actions/lens_embeddable');

vi.mock('./navigation', async () => {
  const mocked = {
    ...(await vi.importActual('./navigation')),
    NetworkRoutes: vi.fn(() => <div data-test-subj="network-routes-mock" />),
  };
  return { ...mocked, default: mocked };
});

const NetworkRoutesMocked = NetworkRoutes as MockedFunction<typeof NetworkRoutes>;

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

const to = '2018-03-23T18:49:23.132Z';
const from = '2018-03-24T03:33:52.253Z';

const mockProps = {
  networkPagePath: '',
  to,
  from,
  isInitializing: false,
  setQuery: vi.fn(),
  capabilitiesFetched: true,
  hasMlUserPermissions: true,
};

const mockMapVisibility = vi.fn();
const mockNavigateToApp = vi.fn();
const mockSecurityCapabilities = {
  [SECURITY_FEATURE_ID]: { crud_alerts: true, read_alerts: true },
};
vi.mock('../../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        application: {
          ...original.useKibana().services.application,
          capabilities: {
            ...mockSecurityCapabilities,
            maps_v2: mockMapVisibility(),
          },
          navigateToApp: mockNavigateToApp,
        },
        storage: {
          get: () => true,
        },
        cases: {
          ...mockCasesContract(),
        },
        maps: {
          Map: () => <div data-test-subj="MapPanel">{'mockMap'}</div>,
        },
      },
    }),
    useToasts: vi.fn().mockReturnValue({
      addError: vi.fn(),
      addSuccess: vi.fn(),
      addWarning: vi.fn(),
      addInfo: vi.fn(),
      remove: vi.fn(),
    }),
  };
});

describe('Network page - rendering', () => {
  beforeAll(() => {
    mockMapVisibility.mockReturnValue({ show: true });
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test('it renders getting started page when no index is available', () => {
    render(
      <TestProviders>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );

    expect(screen.getByTestId('empty-prompt')).toBeInTheDocument();
  });

  test('it DOES NOT render getting started page when an index is available', async () => {
    render(
      <TestProviders>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );
    await waitFor(() => {
      expect(mockNavigateToApp).not.toHaveBeenCalled();
    });
  });

  test('it renders the network map if user has permissions', () => {
    // When there are matched indices
    vi.mocked(useDataView).mockImplementation(withMatchedIndices);

    render(
      <TestProviders>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );
    expect(screen.getByTestId('conditional-embeddable-map')).toBeInTheDocument();
  });

  test('it does not render the network map if user does not have permissions', () => {
    mockMapVisibility.mockReturnValue({ show: false });
    render(
      <TestProviders>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );
    expect(screen.queryByTestId('conditional-embeddable-map')).not.toBeInTheDocument();
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
    vi.mocked(useDataView).mockImplementation(withMatchedIndices);

    const myStore = createMockStore();
    render(
      <TestProviders store={myStore}>
        <Router history={mockHistory}>
          <Network {...mockProps} />
        </Router>
      </TestProviders>
    );
    myStore.dispatch(
      inputsActions.setSearchBarFilter({ id: InputsModelId.global, filters: newFilters })
    );

    await waitFor(() => {
      expect(NetworkRoutesMocked).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filterQuery:
            '{"bool":{"must":[],"filter":[{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"ItRocks"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}',
        }),
        expect.anything()
      );
    });
  });
});
