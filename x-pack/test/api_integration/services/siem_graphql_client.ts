/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as formatUrl } from 'url';
import fetch from 'node-fetch';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import { FtrProviderContext } from '../ftr_provider_context';

interface SiemGraphQLClientFactoryOptions {
  username?: string;
  password?: string;
  basePath?: string;
}

export function SiemGraphQLClientProvider(context: FtrProviderContext) {
  return SiemGraphQLClientFactoryProvider(context)();
}

export function SiemGraphQLClientFactoryProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const superAuth: string = config.get('servers.elasticsearch.auth');
  const [superUsername, superPassword] = superAuth.split(':');

  return function(options?: SiemGraphQLClientFactoryOptions) {
    const { username = superUsername, password = superPassword, basePath = null } = options || {};

    const kbnURLWithoutAuth = formatUrl({ ...config.get('servers.kibana'), auth: false });

    const httpLink = new HttpLink({
      credentials: 'same-origin',
      fetch: fetch as any,
      headers: {
        'kbn-xsrf': 'xxx',
        authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      uri: `${kbnURLWithoutAuth}${basePath || ''}/api/siem/graphql`,
    });

    return new ApolloClient({
      cache: new InMemoryCache({}),
      link: httpLink,
    });
  };
}
