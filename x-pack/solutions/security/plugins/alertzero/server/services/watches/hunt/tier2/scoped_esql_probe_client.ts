/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { assertEsqlSourcesAllowed } from './assert_esql_sources_allowed';

/**
 * `generateEsql` runs a `LIMIT 1` schema probe of the model's query during generation, and that
 * probe executes the model-authored `FROM` before `assertEsqlSourcesAllowed` runs at publish and
 * execute time. Because the query is steered by externally-authored report prose, an out-of-scope
 * `FROM` would be probe-executed before anything rejects it.
 *
 * This wraps the client handed to `generateEsql` so its `esql.query` enforces the *same* source
 * allowlist the publish/execute steps use, before the probe reaches Elasticsearch. An out-of-scope
 * query is rejected here; `generateEsql` treats that as a probe failure and falls back to the
 * non-executable placeholder, so nothing outside the allowlist is ever probe-executed. The gate
 * lives in one place — `assertEsqlSourcesAllowed` — and now runs at all three points a generated
 * query can touch data (probe, publish, execute).
 *
 * Only `esql.query` is intercepted; every other call delegates unchanged, bound to the real client
 * so its internal state is preserved. The generator's resource resolution reads through the
 * scope-constrained `index` it is given rather than a model-authored source, so it needs no gate.
 */
export const scopedEsqlProbeClient = (
  esClient: ElasticsearchClient,
  allowedPatterns: string[]
): ElasticsearchClient => {
  const gatedQuery = ((...args: Parameters<ElasticsearchClient['esql']['query']>) => {
    const params = args[0] as { query?: unknown } | undefined;
    const query = typeof params?.query === 'string' ? params.query : '';
    const check = assertEsqlSourcesAllowed(query, allowedPatterns);
    if (!check.ok) {
      return Promise.reject(
        new Error(`refused to probe an out-of-scope generated query: ${check.reason}`)
      );
    }
    return esClient.esql.query(...args);
  }) as ElasticsearchClient['esql']['query'];

  const bindThrough = (target: object, prop: string | symbol) => {
    const value = Reflect.get(target, prop);
    return typeof value === 'function' ? value.bind(target) : value;
  };

  const esqlProxy = new Proxy(esClient.esql, {
    get: (target, prop) => (prop === 'query' ? gatedQuery : bindThrough(target, prop)),
  });

  return new Proxy(esClient, {
    get: (target, prop) => (prop === 'esql' ? esqlProxy : bindThrough(target, prop)),
  }) as ElasticsearchClient;
};
