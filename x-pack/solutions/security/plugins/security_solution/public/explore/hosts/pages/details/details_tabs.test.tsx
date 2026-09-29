/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useResizeObserver from 'use-resize-observer/polyfilled';

import {
  createMockStore,
  mockGlobalState,
  mockIndexPattern,
  TestProviders,
} from '../../../../common/mock';
import { HostDetailsTabs } from './details_tabs';
import { hostDetailsPagePath } from '../types';
import { getHostDetailsPageFilters } from './helpers';
import { HostsType, HostsTableType } from '../../store/model';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { TableId } from '@kbn/securitysolution-data-table';
import { AuthenticationsQueryTabBody, UncommonProcessQueryTabBody } from '../navigation';
import { AnomaliesQueryTabBody } from '../../../../common/containers/anomalies/anomalies_query_tab_body';
import { EventsQueryTabBody } from '../../../../common/components/events_tab';

vi.mock('../../../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        cases: mockCasesContract(),
      },
    }),
  };
});

vi.mock('../../../../common/utils/normalize_time_range');

vi.mock('../../../../common/containers/source', () => {
  const mocked = {
    useFetchIndex: () => [false, { indicesExist: true, indexPatterns: mockIndexPattern }],
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

const mockUseResizeObserver: Mock = useResizeObserver as Mock;
vi.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));
vi.mock('../../../../common/components/visualization_actions/actions');
vi.mock('../../../../common/components/visualization_actions/lens_embeddable');

vi.mock('../navigation/authentications_query_tab_body', async () => {
  const original = await vi.importActual('../navigation/authentications_query_tab_body');
  return {
    ...original,
    AuthenticationsQueryTabBody: vi.fn(() => (
      <div data-test-subj="authentications-query-tab-body">{'AuthenticationsQueryTabBody'}</div>
    )),
  };
});
vi.mock('../navigation/uncommon_process_query_tab_body', async () => {
  const original = await vi.importActual('../navigation/uncommon_process_query_tab_body');
  return {
    ...original,
    UncommonProcessQueryTabBody: vi.fn(() => (
      <div data-test-subj="uncommon-process-query-tab-body">{'UncommonProcessQueryTabBody'}</div>
    )),
  };
});
vi.mock('../../../../common/containers/anomalies/anomalies_query_tab_body', async () => {
  const original = await vi.importActual(
    '../../../../common/containers/anomalies/anomalies_query_tab_body'
  );
  return {
    ...original,
    AnomaliesQueryTabBody: vi.fn(() => (
      <div data-test-subj="anomalies-query-tab-body">{'AnomaliesQueryTabBody'}</div>
    )),
  };
});
vi.mock('../../../../common/components/events_tab', async () => {
  const original = await vi.importActual('../../../../common/components/events_tab');
  return {
    ...original,
    EventsQueryTabBody: vi.fn(() => (
      <div data-test-subj="events-query-tab-body">{'EventsQueryTabBody'}</div>
    )),
  };
});

const myStore = createMockStore({
  ...mockGlobalState,
  dataTable: {
    tableById: {
      [TableId.hostsPageEvents]: mockGlobalState.dataTable.tableById['table-test'],
    },
  },
});

const AuthenticationsQueryTabBodyMocked = AuthenticationsQueryTabBody as MockedFunction<
  typeof AuthenticationsQueryTabBody
>;
const UncommonProcessQueryTabBodyMocked = UncommonProcessQueryTabBody as MockedFunction<
  typeof UncommonProcessQueryTabBody
>;
const AnomaliesQueryTabBodyMocked = AnomaliesQueryTabBody as MockedFunction<
  typeof AnomaliesQueryTabBody
>;
const EventsQueryTabBodyMocked = EventsQueryTabBody as MockedFunction<typeof EventsQueryTabBody>;

describe('body', () => {
  const scenariosMap = {
    [HostsTableType.authentications]: AuthenticationsQueryTabBodyMocked,
    [HostsTableType.uncommonProcesses]: UncommonProcessQueryTabBodyMocked,
    [HostsTableType.anomalies]: AnomaliesQueryTabBodyMocked,
    [HostsTableType.events]: EventsQueryTabBodyMocked,
  };

  const mockHostDetailsPageFilters = getHostDetailsPageFilters('host-1');

  const filterQuery = JSON.stringify({
    bool: {
      must: [],
      filter: [{ match_all: {} }, { match_phrase: { 'host.name': { query: 'host-1' } } }],
      should: [],
      must_not: [],
    },
  });

  Object.entries(scenariosMap).forEach(([path, componentName]) =>
    test(`it should pass expected object properties to ${path}`, () => {
      render(
        <TestProviders store={myStore}>
          <MemoryRouter initialEntries={[`/hosts/name/host-1/${path}`]}>
            <HostDetailsTabs
              isInitializing={false}
              detailName={'host-1'}
              setQuery={vi.fn()}
              hostDetailsPagePath={hostDetailsPagePath}
              indexNames={[]}
              type={HostsType.details}
              hostDetailsFilter={mockHostDetailsPageFilters}
              filterQuery={filterQuery}
              from={'2020-07-07T08:20:18.966Z'}
              to={'2020-07-08T08:20:18.966Z'}
            />
          </MemoryRouter>
        </TestProviders>
      );

      // match against everything but the functions to ensure they are there as expected
      expect(componentName.mock.calls[0][0]).toMatchObject({
        endDate: '2020-07-08T08:20:18.966Z',
        filterQuery,
        skip: false,
        startDate: '2020-07-07T08:20:18.966Z',
        type: 'details',
        ...(path === 'events' && { additionalFilters: mockHostDetailsPageFilters }),
      });
    })
  );
});
