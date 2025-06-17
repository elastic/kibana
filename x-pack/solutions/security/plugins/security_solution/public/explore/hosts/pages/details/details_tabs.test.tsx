/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useResizeObserver from 'use-resize-observer/polyfilled';

import {
  createMockStore,
  mockDataViewSpec,
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

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');

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

jest.mock('../../../../common/utils/normalize_time_range');

jest.mock('../../../../common/containers/source', () => ({
  useFetchIndex: () => [false, { indicesExist: true, indexPatterns: mockIndexPattern }],
}));

jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));
jest.mock('../../../../common/components/visualization_actions/actions');
jest.mock('../../../../common/components/visualization_actions/lens_embeddable');

jest.mock('../navigation/authentications_query_tab_body', () => {
  const original = jest.requireActual('../navigation/authentications_query_tab_body');
  return {
    ...original,
    AuthenticationsQueryTabBody: jest.fn(() => (
      <div data-test-subj="authentications-query-tab-body">{'AuthenticationsQueryTabBody'}</div>
    )),
  };
});
jest.mock('../navigation/uncommon_process_query_tab_body', () => {
  const original = jest.requireActual('../navigation/uncommon_process_query_tab_body');
  return {
    ...original,
    UncommonProcessQueryTabBody: jest.fn(() => (
      <div data-test-subj="uncommon-process-query-tab-body">{'UncommonProcessQueryTabBody'}</div>
    )),
  };
});
jest.mock('../../../../common/containers/anomalies/anomalies_query_tab_body', () => {
  const original = jest.requireActual(
    '../../../../common/containers/anomalies/anomalies_query_tab_body'
  );
  return {
    ...original,
    AnomaliesQueryTabBody: jest.fn(() => (
      <div data-test-subj="anomalies-query-tab-body">{'AnomaliesQueryTabBody'}</div>
    )),
  };
});
jest.mock('../../../../common/components/events_tab', () => {
  const original = jest.requireActual('../../../../common/components/events_tab');
  return {
    ...original,
    EventsQueryTabBody: jest.fn(() => (
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

const AuthenticationsQueryTabBodyMocked = AuthenticationsQueryTabBody as jest.MockedFunction<
  typeof AuthenticationsQueryTabBody
>;
const UncommonProcessQueryTabBodyMocked = UncommonProcessQueryTabBody as jest.MockedFunction<
  typeof UncommonProcessQueryTabBody
>;
const AnomaliesQueryTabBodyMocked = AnomaliesQueryTabBody as jest.MockedFunction<
  typeof AnomaliesQueryTabBody
>;
const EventsQueryTabBodyMocked = EventsQueryTabBody as jest.MockedFunction<
  typeof EventsQueryTabBody
>;

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
              setQuery={jest.fn()}
              hostDetailsPagePath={hostDetailsPagePath}
              indexNames={[]}
              dataViewSpec={mockDataViewSpec}
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
        indexPattern: {
          fields: {
            '@timestamp': { searchable: true, type: 'date', aggregatable: true },
            '@version': { searchable: true, type: 'string', aggregatable: true },
            'agent.ephemeral_id': { searchable: true, type: 'string', aggregatable: true },
            'agent.hostname': { searchable: true, type: 'string', aggregatable: true },
            'agent.id': { searchable: true, type: 'string', aggregatable: true },
            'agent.test1': { searchable: true, type: 'string', aggregatable: true },
            'agent.test2': { searchable: true, type: 'string', aggregatable: true },
            'agent.test3': { searchable: true, type: 'string', aggregatable: true },
            'agent.test4': { searchable: true, type: 'string', aggregatable: true },
            'agent.test5': { searchable: true, type: 'string', aggregatable: true },
            'agent.test6': { searchable: true, type: 'string', aggregatable: true },
            'agent.test7': { searchable: true, type: 'string', aggregatable: true },
            'agent.test8': { searchable: true, type: 'string', aggregatable: true },
            'host.name': { searchable: true, type: 'string', aggregatable: true },
            'nestedField.firstAttributes': {
              aggregatable: false,
              searchable: true,
              type: 'string',
            },
            'nestedField.secondAttributes': {
              aggregatable: false,
              searchable: true,
              type: 'string',
            },
          },
          title: 'filebeat-*,auditbeat-*,packetbeat-*',
        },
        hostName: 'host-1',
        ...(path === 'events' && { additionalFilters: mockHostDetailsPageFilters }),
      });
    })
  );
});
