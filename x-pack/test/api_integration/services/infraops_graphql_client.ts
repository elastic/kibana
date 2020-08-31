/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as formatUrl } from 'url';
import fetch from 'node-fetch';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';

import { FtrProviderContext } from '../ftr_provider_context';

import introspectionQueryResultData from '../../../plugins/infra/public/graphql/introspection.json';

export function InfraOpsGraphQLClientProvider(context: FtrProviderContext) {
  return InfraOpsGraphQLClientFactoryProvider(context)();
}

interface InfraOpsGraphQLClientFactoryOptions {
  username?: string;
  password?: string;
  basePath?: string;
}

export function InfraOpsGraphQLClientFactoryProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const superAuth: string = config.get('servers.elasticsearch.auth');
  const [superUsername, superPassword] = superAuth.split(':');

  return function (options?: InfraOpsGraphQLClientFactoryOptions) {
    const { username = superUsername, password = superPassword, basePath = null } = options || {};

    const kbnURLWithoutAuth = formatUrl({ ...config.get('servers.kibana'), auth: false });

    const httpLink = new HttpLink({
      credentials: 'same-origin',
      fetch: fetch as any,
      headers: {
        'kbn-xsrf': 'xxx',
        authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      uri: `${kbnURLWithoutAuth}${basePath || ''}/api/infra/graphql`,
    });

    return new ApolloClient({
      cache: new InMemoryCache({
        fragmentMatcher: new IntrospectionFragmentMatcher({
          introspectionQueryResultData,
        }),
      }),
      defaultOptions: {
        query: {
          fetchPolicy: 'no-cache',
        },
        watchQuery: {
          fetchPolicy: 'no-cache',
        },
        mutate: {
          fetchPolicy: 'no-cache',
        } as any,
      },
      link: httpLink,
    });
  };
}
