/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
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

vi.mock('../../../../common/containers/use_search_strategy', () => {
      const mocked = {
      useSearchStrategy: vi.fn().mockReturnValue({
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
        search: vi.fn(),
        refetch: vi.fn(),
        inspect: {},
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@elastic/eui', async () => {
  const original = (await vi.importActual('@elastic/eui'));
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

vi.mock('react-router-dom', () => {
  const original = require('react-router-dom');

  return {
    ...original,
    useParams: vi.fn(),
  };
});
vi.mock('../../containers/details', () => {
      const mocked = {
      useNetworkDetails: vi.fn().mockReturnValue([true, { networkDetails: {} }]),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/containers/use_global_time', () => {
      const mocked = {
      useGlobalTime: vi.fn().mockReturnValue({
        from: '2020-07-07T08:20:18.966Z',
        isInitializing: false,
        to: '2020-07-08T08:20:18.966Z',
        setQuery: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

const useAddToTimeline = () => ({
  beginDrag: vi.fn(),
  cancelDrag: vi.fn(),
  dragToLocation: vi.fn(),
  endDrag: vi.fn(),
  hasDraggableLock: vi.fn(),
  startDragToTimeline: vi.fn(),
});

vi.mock('../../../../common/lib/kibana', async () => {
  const original = (await vi.importActual('../../../../common/lib/kibana'));
  return {
    ...original,
    useNavigation: () => ({
      getAppUrl: vi.fn(),
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
vi.mock('../../../../common/components/search_bar', () => {
      const mocked = {
      SiemSearchBar: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/components/query_bar', () => {
      const mocked = {
      QueryBar: () => null,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../common/components/empty_prompt');

const getMockHistory = (ip: string) => ({
  length: 2,
  location: {
    pathname: `/network/ip/${ip}`,
    search: '',
    state: '',
    hash: '',
  },
  action: pop,
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  goBack: vi.fn(),
  goForward: vi.fn(),
  block: vi.fn(),
  createHref: vi.fn(),
  listen: vi.fn(),
});

describe('Network Details', () => {
  beforeAll(() => {
    global.fetch = vi.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => {
          return null;
        },
      })
    );
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  test('it renders', () => {
    const ip = '123.456.78.90';
    (useParams as Mock).mockReturnValue({
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
    vi.mocked(useDataView).mockReturnValue(withIndices(['test-index']));

    const ip = 'fe80--24ce-f7ff-fede-a571';
    (useParams as Mock).mockReturnValue({
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
    vi.mocked(useDataView).mockReturnValue(defaultImplementation());

    const ip = '123.456.78.90';
    (useParams as Mock).mockReturnValue({
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
