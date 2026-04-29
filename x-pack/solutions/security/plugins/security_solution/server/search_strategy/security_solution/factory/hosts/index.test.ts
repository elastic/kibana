/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostsFactory } from '.';
import { HostsQueries } from '../../../../../common/search_strategy';
import { allHosts } from './all';
import { hostDetails } from './details';
import { hostOverview } from './overview';

import { uncommonProcesses } from './uncommon_processes';

jest.mock('./all');
jest.mock('./details');
jest.mock('./overview');
jest.mock('./uncommon_processes');

describe('hostsFactory', () => {
  test('should include correct apis', () => {
    const expectedHostsFactory = {
      [HostsQueries.details]: hostDetails,
      [HostsQueries.hosts]: allHosts,
      [HostsQueries.overview]: hostOverview,
      [HostsQueries.uncommonProcesses]: uncommonProcesses,
    };
    expect(hostsFactory).toEqual(expectedHostsFactory);
  });
});
