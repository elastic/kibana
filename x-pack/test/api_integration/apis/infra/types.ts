/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';

export interface EsArchiver {
  load(name: string): void;
  unload(name: string): void;
}

export interface KbnTestProviderOptions {
  getService(name: string): any;
  getService(name: 'esArchiver'): EsArchiver;
  getService(name: 'infraOpsGraphQLClient'): ApolloClient<InMemoryCache>;
}

export type KbnTestProvider = (options: KbnTestProviderOptions) => void;
