/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { useParams } from 'react-router-dom';

import { TestProviders } from '../../../../common/mock';
import { NetworkDetails } from '.';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import {
  defaultImplementation,
  withIndices,
} from '../../../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('../../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: jest.fn().mockReturnValue({
    loading: false,
    result: {
      edges: [],
      pageInfo: {
        activePage: 0,
        fakeTotalCount: 0,
        showMorePagesIndicator: false,
      },
      totalCount: -1,
    },
    search: jest.fn(),
    refetch: jest.fn(),
    inspect: {},
  }),
}));

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useParams: jest.fn(),
  };
});
jest.mock('../../containers/details', () => ({
  useNetworkDetails: jest.fn().mockReturnValue([true, { networkDetails: {} }]),
}));
jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

const useAddToTimeline = () => ({
  beginDrag: jest.fn(),
  cancelDrag: jest.fn(),
  dragToLocation: jest.fn(),
  endDrag: jest.fn(),
  hasDraggableLock: jest.fn(),
  startDragToTimeline: jest.fn(),
});

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useNavigation: () => ({
      getAppUrl: jest.fn(),
    }),
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        timelines: {
          getUseAddToTimeline: () => useAddToTimeline,
        },
      },
    }),
  };
});

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));
jest.mock('../../../../common/components/empty_prompt');

const getMockHistory = (ip: string) => ({
  length: 2,
  location: {
    pathname: `/network/ip/${ip}`,
    search: '',
    state: '',
    hash: '',
  },
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
});

describe('Network Details', () => {
  beforeAll(() => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => {
          return null;
        },
      })
    );
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    const ip = '123.456.78.90';
    (useParams as jest.Mock).mockReturnValue({
      detailName: ip,
      flowTarget: FlowTargetSourceDest.source,
    });
    render(
      <TestProviders>
        <Router history={getMockHistory(ip)}>
          <NetworkDetails />
        </Router>
      </TestProviders>
    );
    expect(screen.getByTestId('network-details-page')).toBeInTheDocument();
  });

  test('it renders ipv6 headline', async () => {
    jest.mocked(useDataView).mockReturnValue(withIndices(['test-index']));

    const ip = 'fe80--24ce-f7ff-fede-a571';
    (useParams as jest.Mock).mockReturnValue({
      detailName: ip,
      flowTarget: FlowTargetSourceDest.source,
    });
    render(
      <TestProviders>
        <Router history={getMockHistory(ip)}>
          <NetworkDetails />
        </Router>
      </TestProviders>
    );
    expect(
      within(screen.getByTestId('header-page')).getByTestId('header-page-title').textContent
    ).toEqual('fe80::24ce:f7ff:fede:a571');
  });

  test('it renders landing page component when no indices exist', () => {
    jest.mocked(useDataView).mockReturnValue(defaultImplementation());

    const ip = '123.456.78.90';
    (useParams as jest.Mock).mockReturnValue({
      detailName: ip,
      flowTarget: FlowTargetSourceDest.source,
    });

    render(
      <TestProviders>
        <Router history={getMockHistory(ip)}>
          <NetworkDetails />
        </Router>
      </TestProviders>
    );
    expect(screen.getByTestId('empty-prompt')).toBeInTheDocument();
  });
});
