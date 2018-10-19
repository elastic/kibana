/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as formatUrl } from 'url';
import fetch from 'node-fetch';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';

export function InfraOpsGraphQLProvider({ getService }) {
  const config = getService('config');
  const kbnURL = formatUrl(config.get('servers.kibana'));

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      credentials: 'same-origin',
      fetch,
      headers: {
        'kbn-xsrf': 'xxx',
      },
      uri: `${kbnURL}/api/infra/graphql`,
    }),
  });

}

