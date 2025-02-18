/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NetworkQueries } from '../../../../../common/search_strategy/security_solution';

import { networkDetails } from './details';
import { networkDns } from './dns';
import { networkHttp } from './http';
import { networkOverview } from './overview';
import { networkTls } from './tls';
import { networkTopCountries } from './top_countries';
import { networkTopNFlow, networkTopNFlowCount } from './top_n_flow';
import { networkUsers } from './users';

// TODO: add safer type for the strategy map
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const networkFactory: Record<NetworkQueries, any> = {
  [NetworkQueries.details]: networkDetails,
  [NetworkQueries.dns]: networkDns,
  [NetworkQueries.http]: networkHttp,
  [NetworkQueries.overview]: networkOverview,
  [NetworkQueries.tls]: networkTls,
  [NetworkQueries.topCountries]: networkTopCountries,
  [NetworkQueries.topNFlowCount]: networkTopNFlowCount,
  [NetworkQueries.topNFlow]: networkTopNFlow,
  [NetworkQueries.users]: networkUsers,
};
