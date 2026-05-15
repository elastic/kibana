/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * `_alias:*` routes queries across the origin project and all linked CPS projects.
 * Equivalent to `PROJECT_ROUTING_ALL` from `@kbn/cps-server-utils`.
 */
const PROJECT_ROUTING_ALL = '_alias:*';

/**
 * Returns a proxy over `esClient` that pre-sets `project_routing: '_alias:*'` on every
 * `search` and `esql.query` call, covering origin + linked CPS projects in one pass.
 *
 * Why this works without a separate client:
 * - Both APIs declare `project_routing` in their `acceptedParams.body`.
 * - The Kibana CPS request handler injects routing only when `project_routing` is absent
 *   from the body — if we set it first, the handler leaves it alone.
 * - On non-serverless (CPS disabled) the handler strips `project_routing` unconditionally,
 *   so this proxy is a no-op on ECH and stateful deployments.
 *
 * Only `search` and `esql.query` are intercepted — all other client methods pass through
 * to the original client unchanged.
 */
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
