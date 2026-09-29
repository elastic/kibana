/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { NetworkQueries } from '../../../../../common/search_strategy/security_solution';

import { networkFactory } from '.';
import { networkDetails } from './details';
import { networkDns } from './dns';
import { networkHttp } from './http';
import { networkOverview } from './overview';
import { networkTls } from './tls';
import { networkTopCountries } from './top_countries';
import { networkTopNFlow } from './top_n_flow';
import { networkUsers } from './users';

vi.mock('./details');
vi.mock('./dns');
vi.mock('./http');
vi.mock('./overview');
vi.mock('./tls');
vi.mock('./top_countries');
vi.mock('./top_n_flow');
vi.mock('./users');

describe('networkFactory', () => {
  test('should include correct apis', () => {
    const expectedNetworkFactory = {
      [NetworkQueries.details]: networkDetails,
      [NetworkQueries.dns]: networkDns,
      [NetworkQueries.http]: networkHttp,
      [NetworkQueries.overview]: networkOverview,
      [NetworkQueries.tls]: networkTls,
      [NetworkQueries.topCountries]: networkTopCountries,
      [NetworkQueries.topNFlow]: networkTopNFlow,
      [NetworkQueries.users]: networkUsers,
    };
    expect(networkFactory).toEqual(expectedNetworkFactory);
  });
});
