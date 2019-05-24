/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';

import {
  UpdateSourceInput,
  UpdateSourceResult,
} from '../../../../plugins/infra/public/graphql/types';

export interface EsArchiver {
  load(name: string): void;
  unload(name: string): void;
}

interface InfraOpsGraphQLClientFactoryOptions {
  username: string;
  password: string;
  basePath: string;
}

interface InfraOpsSourceConfigurationService {
  createConfiguration(
    sourceId: string,
    sourceProperties: UpdateSourceInput
  ): UpdateSourceResult['source']['version'];
}

export interface KbnTestProviderOptions {
  getService(name: string): any;
  getService(name: 'esArchiver'): EsArchiver;
  getService(name: 'infraOpsGraphQLClient'): ApolloClient<InMemoryCache>;
  getService(
    name: 'infraOpsGraphQLClientFactory'
  ): (options: InfraOpsGraphQLClientFactoryOptions) => ApolloClient<InMemoryCache>;
  getService(name: 'infraOpsSourceConfiguration'): InfraOpsSourceConfigurationService;
}

export type KbnTestProvider = (options: KbnTestProviderOptions) => void;
