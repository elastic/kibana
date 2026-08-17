/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  expandRumCcsIndices,
  expandRumEsqlFrom,
  type RumCcsIndexOptions,
  type RumRemoteCluster,
} from '../../common/rum_ccs';
import { readSessionReplaySettings } from '../routes/session_replay/settings';
import type { UxRouteHandlerResources } from '../routes/types';

const expandIndex = (index: unknown, options: RumCcsIndexOptions): unknown => {
  if (typeof index === 'string') {
    return expandRumCcsIndices(index, options);
  }
  if (Array.isArray(index) && index.every((part) => typeof part === 'string')) {
    return expandRumCcsIndices(index.join(','), options);
  }
  return index;
};

const expandSearchParams = (
  params: { index?: unknown } | undefined,
  options: RumCcsIndexOptions
): { index?: unknown; ignore_unavailable: unknown; allow_no_indices: unknown } => ({
  ...(params ?? {}),
  index: expandIndex(params?.index, options),
  ignore_unavailable: params && 'ignore_unavailable' in params ? params.ignore_unavailable : true,
  allow_no_indices: params && 'allow_no_indices' in params ? params.allow_no_indices : true,
});

const expandEsqlParams = <T extends { query?: unknown }>(
  params: T,
  options: RumCcsIndexOptions
): T => {
  if (typeof params.query !== 'string') {
    return params;
  }
  return { ...params, query: expandRumEsqlFrom(params.query, options) };
};

/** Prefix `_search` / `_count` / ES|QL `FROM` with configured remote clusters. */
export const wrapRumSearchClient = (
  client: ElasticsearchClient,
  options: RumCcsIndexOptions
): ElasticsearchClient =>
  new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'search') {
        return (params: Parameters<ElasticsearchClient['search']>[0], requestOptions?: unknown) =>
          target.search(
            expandSearchParams(params, options) as Parameters<ElasticsearchClient['search']>[0],
            requestOptions as Parameters<ElasticsearchClient['search']>[1]
          );
      }
      if (prop === 'count') {
        return (params: Parameters<ElasticsearchClient['count']>[0], requestOptions?: unknown) =>
          target.count(
            expandSearchParams(params, options) as Parameters<ElasticsearchClient['count']>[0],
            requestOptions as Parameters<ElasticsearchClient['count']>[1]
          );
      }
      if (prop === 'esql') {
        const esql = target.esql;
        return new Proxy(esql, {
          get(esqlTarget, esqlProp, esqlReceiver) {
            if (esqlProp === 'query') {
              return (
                params: Parameters<ElasticsearchClient['esql']['query']>[0],
                requestOptions?: unknown
              ) =>
                esqlTarget.query(
                  expandEsqlParams(params, options),
                  requestOptions as Parameters<ElasticsearchClient['esql']['query']>[1]
                );
            }
            const value = Reflect.get(esqlTarget, esqlProp, esqlReceiver);
            return typeof value === 'function' ? value.bind(esqlTarget) : value;
          },
        });
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

export const listRumRemoteClusters = async (
  client: ElasticsearchClient
): Promise<RumRemoteCluster[]> => {
  try {
    const info = await client.cluster.remoteInfo();
    return Object.entries(info).map(([name, remote]) => ({
      name,
      isConnected: Boolean(remote.connected),
    }));
  } catch {
    return [];
  }
};

export const getRumCcsOptions = async ({
  context,
  core,
}: Pick<UxRouteHandlerResources, 'context' | 'core'>): Promise<RumCcsIndexOptions> => {
  const [{ elasticsearch }, coreStart] = await Promise.all([context.core, core.start()]);
  const settings = await readSessionReplaySettings(
    coreStart.savedObjects.createInternalRepository()
  );
  if (!settings.useAllRemoteClusters && settings.selectedRemoteClusters.length === 0) {
    return { useAllRemoteClusters: false, selectedRemoteClusters: [] };
  }
  return {
    useAllRemoteClusters: settings.useAllRemoteClusters,
    selectedRemoteClusters: settings.selectedRemoteClusters,
    remoteClusters: await listRumRemoteClusters(elasticsearch.client.asCurrentUser),
  };
};

/** Current-user ES client with CCS prefixes when remote clusters are selected. */
export const getRumSearchClient = async (
  resources: Pick<UxRouteHandlerResources, 'context' | 'core'>
): Promise<ElasticsearchClient> => {
  const { elasticsearch } = await resources.context.core;
  const options = await getRumCcsOptions(resources);
  if (!options.useAllRemoteClusters && options.selectedRemoteClusters.length === 0) {
    return elasticsearch.client.asCurrentUser;
  }
  return wrapRumSearchClient(elasticsearch.client.asCurrentUser, options);
};
