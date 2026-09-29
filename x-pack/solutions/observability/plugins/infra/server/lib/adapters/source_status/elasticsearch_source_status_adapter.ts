/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import { excludeTiersQuery } from '@kbn/observability-utils-common/es/queries/exclude_tiers_query';
import type { KibanaRequest } from '@kbn/core/server';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import { isNoSuchRemoteClusterMessage, NoSuchRemoteClusterError } from '../../sources/errors';
import type { InfraSourceStatusAdapter } from '../../source_status';
import type { InfraDatabaseGetIndicesResponse } from '../framework';
import type { KibanaFramework } from '../framework/kibana_framework_adapter';

/**
 * Timeout applied to the source-status probe.
 *
 * Used as both a server-side per-remote ceiling (`timeout` query param on
 * `_resolve/cluster`) and a transport-level backstop (`requestTimeout`). A
 * remote that misses the server-side bound is reported as not-connected
 * rather than failing the whole call. The transport backstop prevents the
 * entire request from hanging when even the cluster's own coordination
 * layer is unresponsive. See https://github.com/elastic/kibana/issues/279610
 */
const SOURCE_STATUS_REQUEST_TIMEOUT = '30s';

export class InfraElasticsearchSourceStatusAdapter implements InfraSourceStatusAdapter {
  constructor(private readonly framework: KibanaFramework) {}

  public async getIndexNames(requestContext: InfraPluginRequestHandlerContext, aliasName: string) {
    const indexMaps = await Promise.all([
      this.framework
        .callWithRequest(requestContext, 'indices.getAlias', {
          name: aliasName,
          filter_path: '*.settings.index.uuid', // to keep the response size as small as possible
        })
        .catch(withDefaultIfNotFound<InfraDatabaseGetIndicesResponse>({})),
      this.framework
        .callWithRequest(requestContext, 'indices.get', {
          index: aliasName,
          filter_path: '*.settings.index.uuid', // to keep the response size as small as possible
        })
        .catch(withDefaultIfNotFound<InfraDatabaseGetIndicesResponse>({})),
    ]);

    return indexMaps.reduce((indexNames, indexMap) => {
      indexNames.push(...Object.keys(indexMap));
      return indexNames;
    }, [] as string[]);
  }

  public async hasAlias(requestContext: InfraPluginRequestHandlerContext, aliasName: string) {
    return await this.framework.callWithRequest(requestContext, 'indices.existsAlias', {
      name: aliasName,
    });
  }

  public async hasIndices(
    requestContext: InfraPluginRequestHandlerContext,
    indexNames: string,
    request?: KibanaRequest
  ): Promise<boolean> {
    /**
     * Use `_resolve/cluster` to answer "do any indices match?" from cluster
     * state, with no shard fan-out. This is the same approach Kibana core
     * uses in `data_views/server/rest_api_routes/internal/has_es_data.ts`.
     *
     * Both timeout bounds are set:
     * - `timeout` — a server-side per-remote bound. A remote that misses it
     *   is reported as not-connected rather than failing the whole call.
     * - `requestTimeout` — a transport-level backstop so the Kibana → ES
     *   connection itself cannot hang indefinitely.
     *
     * Privilege note: `_resolve/cluster` requires `view_index_metadata`,
     * whereas `_search` needs only `read`. If the caller holds only `read`, a
     * `security_exception` is caught and we fall back to the search-based
     * probe so read-only users keep the same answer as before.
     */
    try {
      const response = await this.framework.callWithRequest(
        requestContext,
        'indices.resolveCluster',
        {
          name: indexNames,
          allow_no_indices: true,
          ignore_unavailable: true,
          expand_wildcards: ['open', 'hidden'],
          timeout: SOURCE_STATUS_REQUEST_TIMEOUT,
          requestTimeout: SOURCE_STATUS_REQUEST_TIMEOUT,
        },
        request
      );

      return Object.values(response).some((cluster) => cluster.matching_indices === true);
    } catch (err) {
      if (err.status === 403) {
        // The caller holds only `read`, not `view_index_metadata`. Fall back to
        // the search-based probe so read-only users keep the same answer.
        return this.hasIndicesViaSearch(requestContext, indexNames, request);
      }

      if (err.status === 404) {
        return false;
      }

      if (isNoSuchRemoteClusterMessage(err.message)) {
        throw new NoSuchRemoteClusterError();
      }

      throw err;
    }
  }

  /**
   * Fallback probe used when the caller lacks `view_index_metadata`. Issues
   * a `size:0, terminate_after:1` search and checks `_shards.total > 0` —
   * the original implementation before the `_resolve/cluster` switch.
   */
  private async hasIndicesViaSearch(
    requestContext: InfraPluginRequestHandlerContext,
    indexNames: string,
    request?: KibanaRequest
  ): Promise<boolean> {
    const { uiSettings } = await requestContext.core;
    const excludedDataTiers = await uiSettings.client.get<DataTier[]>(searchExcludedDataTiers);
    const filter = excludedDataTiers.length ? excludeTiersQuery(excludedDataTiers) : [];

    return this.framework
      .callWithRequest(
        requestContext,
        'search',
        {
          ignore_unavailable: true,
          allow_no_indices: true,
          index: indexNames,
          size: 0,
          terminate_after: 1,
          track_total_hits: 1,
          query: { bool: { filter } },
          requestTimeout: SOURCE_STATUS_REQUEST_TIMEOUT,
        },
        request
      )
      .then(
        (response) => response._shards.total > 0,
        (err) => {
          if (err.status === 404) {
            return false;
          }

          if (isNoSuchRemoteClusterMessage(err.message)) {
            throw new NoSuchRemoteClusterError();
          }

          throw err;
        }
      );
  }
}

const withDefaultIfNotFound =
  <DefaultValue>(defaultValue: DefaultValue) =>
  (error: any): DefaultValue => {
    if (error && error.status === 404) {
      return defaultValue;
    }
    throw error;
  };
