/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import fetch from 'node-fetch';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';

import { FtrProviderContext } from '../ftr_provider_context';
import introspectionQueryResultData from '../../../plugins/security_solution/public/graphql/introspection.json';

interface SecuritySolutionGraphQLClientFactoryOptions {
  username?: string;
  password?: string;
  basePath?: string;
}

export function SecuritySolutionGraphQLClientProvider(context: FtrProviderContext) {
  return SecuritySolutionGraphQLClientFactoryProvider(context)();
}

export function SecuritySolutionGraphQLClientFactoryProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const superAuth: string = config.get('servers.elasticsearch.auth');
  const [superUsername, superPassword] = superAuth.split(':');

  return function (options?: SecuritySolutionGraphQLClientFactoryOptions) {
    const { username = superUsername, password = superPassword, basePath = null } = options || {};

    const kbnURLWithoutAuth = formatUrl({ ...config.get('servers.kibana'), auth: false });

    const httpLink = new HttpLink({
      credentials: 'same-origin',
      fetch: fetch as any,
      headers: {
        'kbn-xsrf': 'xxx',
        authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      uri: `${kbnURLWithoutAuth}${basePath || ''}/api/solutions/security/graphql`,
    });

    return new ApolloClient({
      cache: new InMemoryCache({
        fragmentMatcher: new IntrospectionFragmentMatcher({
          // @ts-expect-error apollo-cache-inmemory types don't match actual introspection data
          introspectionQueryResultData,
        }),
      }),
      link: httpLink,
    });
  };
}
