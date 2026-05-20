/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

const PROJECT_ROUTING_ALL = '_alias:*';

// Proxy that pre-sets project_routing on search and esql.query so the maintainer
// covers origin + linked projects in one pass. On non-serverless the CPS handler
// strips the param unconditionally, making this a no-op.
export function createCpsAllClient(esClient: ElasticsearchClient): ElasticsearchClient {
  return new Proxy(esClient, {
    get(target: any, prop: string | symbol, receiver: any) {
      if (prop === 'search') {
        return (params: any, opts?: any) =>
          target.search({ project_routing: PROJECT_ROUTING_ALL, ...params }, opts);
      }
      if (prop === 'esql') {
        const esql = Reflect.get(target, prop, receiver);
        return new Proxy(esql, {
          get(esqlTarget: any, esqlProp: string | symbol, esqlReceiver: any) {
            if (esqlProp === 'query') {
              return (params: any, opts?: any) =>
                esqlTarget.query({ project_routing: PROJECT_ROUTING_ALL, ...params }, opts);
            }
            return Reflect.get(esqlTarget, esqlProp, esqlReceiver);
          },
        });
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as ElasticsearchClient;
}
