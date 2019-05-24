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

import introspectionQueryResultData from '../../../plugins/infra/public/graphql/introspection.json';

export function InfraOpsGraphQLClientProvider({ getService }) {
  return new InfraOpsGraphQLClientFactoryProvider({ getService })();
}

export function InfraOpsGraphQLClientFactoryProvider({ getService }) {
  const config = getService('config');
  const [superUsername, superPassword] = config.get('servers.elasticsearch.auth').split(':');

  return function ({ username = superUsername, password = superPassword, basePath = null } = {}) {
    const kbnURLWithoutAuth = formatUrl({ ...config.get('servers.kibana'), auth: false });

    const httpLink = new HttpLink({
      credentials: 'same-origin',
      fetch,
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
          fetchPolicy: 'no-cache'
        },
        watchQuery: {
          fetchPolicy: 'no-cache'
        },
        mutate: {
          fetchPolicy: 'no-cache'
        },
      },
      link: httpLink,
    });
  };
}
