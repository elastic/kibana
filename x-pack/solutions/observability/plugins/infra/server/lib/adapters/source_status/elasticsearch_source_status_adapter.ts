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
  constructor(
    private readonly framework: KibanaFramework,
    private readonly isServerless: boolean = false
  ) {}

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
     * `_resolve/cluster` is not exposed in serverless Elasticsearch — it
     * answers `api_not_available_exception` there — so don't spend a
     * guaranteed-failing round trip on it.
     */
    if (this.isServerless) {
      return this.hasIndicesViaSearch(requestContext, indexNames, request);
    }

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

      const clusters = Object.values(response);

      if (clusters.some((cluster) => cluster.matching_indices === true)) {
        return true;
      }

      /**
       * No cluster positively reported a match, which is not the same as
       * "there are no indices". `_resolve/cluster` answers HTTP 200 with a
       * per-cluster `error` and no `matching_indices` when a remote is
       * unreachable, and omits matches the caller cannot see when it lacks
       * `view_index_metadata` on that remote. Verified against a live remote:
       *
       *   {"dead":{"connected":false,"skip_unavailable":true,
       *            "error":"Request timed out before receiving a response ..."}}
       *
       * Nothing rejects in that case, so re-probe with `_search` — which needs
       * only `read` — rather than reporting an onboarding-triggering `false`
       * off the back of a cluster that never answered.
       */
      if (clusters.some((cluster) => cluster.matching_indices === undefined)) {
        return this.hasIndicesViaSearch(requestContext, indexNames, request);
      }

      return false;
    } catch (err) {
      // A missing remote is a real answer about the source configuration and
      // must reach the caller, which renders a dedicated callout for it.
      if (isNoSuchRemoteClusterMessage(err.message)) {
        throw new NoSuchRemoteClusterError();
      }

      /**
       * Anything else — `security_exception` because `_resolve/cluster` needs
       * `view_index_metadata` where `_search` needs only `read`, the API being
       * unavailable on a deployment flavor, a transport failure — must not be
       * reported as "no metric indices", because the caller turns that into an
       * onboarding screen. Fall back to the search probe, which is what this
       * code did before `_resolve/cluster` was introduced.
       */
      return this.hasIndicesViaSearch(requestContext, indexNames, request);
    }
  }

  /**
   * Fallback probe for when `_resolve/cluster` is unusable. Issues a
   * `size:0, terminate_after:1` search and checks `_shards.total > 0` — the
   * original implementation before the `_resolve/cluster` switch.
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
          // `@elastic/transport` exposes `statusCode`; `status` is only present
          // on errors constructed elsewhere, so accept either.
          if ((err.statusCode ?? err.status) === 404) {
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
