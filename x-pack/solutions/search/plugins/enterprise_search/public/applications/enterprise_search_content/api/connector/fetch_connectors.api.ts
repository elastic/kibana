/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/search-connectors';

import type { Meta } from '../../../../../common/types/pagination';

import type { Actions } from '../../../shared/api_logic/create_api_logic';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchConnectorsApiLogicArgs {
  fetchCrawlersOnly: boolean;
  from: number;
  searchQuery?: string;
  size: number;
}
export interface FetchConnectorsApiLogicResponse {
  connectors: Connector[];
  counts: Record<string, number>;
  indexExists: Record<string, boolean>;
  isInitialRequest: boolean;
  meta: Meta;
}

export const fetchConnectors = async ({
  fetchCrawlersOnly,
  from,
  size,
  searchQuery,
}: FetchConnectorsApiLogicArgs): Promise<FetchConnectorsApiLogicResponse> => {
  const isInitialRequest = from === 0 && !searchQuery;
  const route = '/internal/enterprise_search/connectors';
  const query = { fetchCrawlersOnly, from, searchQuery, size };
  const response = await HttpLogic.values.http.get<FetchConnectorsApiLogicResponse>(route, {
    query,
  });
  return { ...response, isInitialRequest };
};

export const FetchConnectorsApiLogic = createApiLogic(
  ['fetch_connectors_api_logic'],
  fetchConnectors
);

export type FetchConnectorsApiLogicActions = Actions<
  FetchConnectorsApiLogicArgs,
  FetchConnectorsApiLogicResponse
>;
