/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { mockDataViewSpec, TestProviders } from '../../../common/mock';
import { OverviewHost } from '../overview_host';
import { OverviewNetwork } from '../overview_network';

import { EventCounts } from '.';

jest.mock('../../../common/components/link_to');
jest.mock('../overview_host', () => ({
  OverviewHost: jest.fn(() => <div data-test-subj="overview-host-mock">{'OverviewHost'}</div>),
}));
jest.mock('../overview_network', () => ({
  OverviewNetwork: jest.fn(() => (
    <div data-test-subj="overview-network-mock">{'OverviewNetwork'}</div>
  )),
}));

const OverviewHostMocked = OverviewHost as jest.MockedFunction<typeof OverviewHost>;
const OverviewNetworkMocked = OverviewNetwork as jest.MockedFunction<typeof OverviewNetwork>;

describe('EventCounts', () => {
  const from = '2020-01-20T20:49:57.080Z';
  const to = '2020-01-21T20:49:57.080Z';

  const testProps = {
    filters: [],
    from,
    indexNames: [],
    dataViewSpec: mockDataViewSpec,
    setQuery: jest.fn(),
    to,
    query: {
      query: '',
      language: 'kuery',
    },
  };

  test('it filters the `Host events` widget with a `host.name` `exists` filter', () => {
    render(
      <TestProviders>
        <EventCounts {...testProps} />
      </TestProviders>
    );

    expect(OverviewHostMocked.mock.calls[0][0].filterQuery).toContain(
      '[{"bool":{"should":[{"exists":{"field":"host.name"}}]'
    );
  });

  test('it filters the `Network events` widget with a `source.ip` or `destination.ip` `exists` filter', () => {
    render(
      <TestProviders>
        <EventCounts {...testProps} />
      </TestProviders>
    );

    expect(OverviewNetworkMocked.mock.calls[0][0].filterQuery).toContain(
      '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"source.ip"}},{"exists":{"field":"destination.ip"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}'
    );
  });
});
