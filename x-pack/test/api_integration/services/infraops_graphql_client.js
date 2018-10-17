/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-boost'; // eslint-disable-line 
import { format as formatUrl } from 'url';
import fetch from 'node-fetch';

export function InfraOpsGraphQLProvider({ getService }) {
  const config = getService('config');
  const kbnURL = formatUrl(config.get('servers.kibana'));

  return new ApolloClient({
    uri: `${kbnURL}/api/infra/graphql`,
    fetch,
    request: (operation) => {
      operation.setContext({
        headers: {
          'kbn-xsrf': 'xxx'
        }
      });
    }
  });

}

