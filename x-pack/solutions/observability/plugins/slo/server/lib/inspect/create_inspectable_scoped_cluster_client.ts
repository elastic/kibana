/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IScopedClusterClient,
  IUiSettingsClient,
  KibanaRequest,
} from '@kbn/core/server';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { getInspectResponse } from '@kbn/observability-shared-plugin/common';
import { inspectableEsQueriesMap } from './inspectable_es_queries_map';

const INSPECTABLE_ES_METHODS = new Set(['search', 'msearch']);

function createInspectableEsClient(
  esClient: ElasticsearchClient,
  request: KibanaRequest
): ElasticsearchClient {
  return new Proxy(esClient, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && INSPECTABLE_ES_METHODS.has(prop)) {
        return async (params: Record<string, any>, ...args: any[]) => {
          const startTime = Date.now();
          let res: any;
          let esError: any;
          let esRequestStatus: RequestStatus = RequestStatus.PENDING;

          try {
            res = await (target as any)[prop](params, ...args);
            esRequestStatus = RequestStatus.OK;
          } catch (e) {
            esError = e;
            esRequestStatus = RequestStatus.ERROR;
          }

          const queries = inspectableEsQueriesMap.get(request);
          if (queries) {
            queries.push(
              getInspectResponse({
                esError,
                esRequestParams: params,
                esRequestStatus,
                esResponse: res,
                kibanaRequest: request,
                operationName: '',
                startTime,
              })
            );
          }

          if (esError) {
            throw esError;
          }
          return res;
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}

function createInspectableScopedClusterClient(
  scopedClusterClient: IScopedClusterClient,
  request: KibanaRequest
): IScopedClusterClient {
  const inspectableAsCurrentUser = createInspectableEsClient(
    scopedClusterClient.asCurrentUser,
    request
  );

  return {
    asCurrentUser: inspectableAsCurrentUser,
    asInternalUser: scopedClusterClient.asInternalUser,
    asSecondaryAuthUser: scopedClusterClient.asSecondaryAuthUser,
  };
}

export async function getScopedClusterClientWithInspect({
  scopedClusterClient,
  uiSettingsClient,
  request,
  isDev,
}: {
  scopedClusterClient: IScopedClusterClient;
  uiSettingsClient: IUiSettingsClient;
  request: KibanaRequest;
  isDev: boolean;
}): Promise<IScopedClusterClient> {
  let isInspectorEnabled = false;
  try {
    isInspectorEnabled = (await uiSettingsClient.get<boolean>(enableInspectEsQueries)) || isDev;
  } catch {
    // ignore errors reading ui settings
  }

  return isInspectorEnabled
    ? createInspectableScopedClusterClient(scopedClusterClient, request)
    : scopedClusterClient;
}
