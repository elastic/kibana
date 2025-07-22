/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SearchSearchRequestBody,
  MsearchMultisearchHeader,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  ElasticsearchClient,
  ElasticsearchRequestLoggingOptions,
  SavedObjectsClientContract,
  KibanaRequest,
  CoreRequestHandlerContext,
} from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchResponse, InferSearchResponseOf } from '@kbn/es-types';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { InspectResponse } from '@kbn/observability-plugin/typings/common';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { getInspectResponse } from '@kbn/observability-shared-plugin/common';
import { SYNTHETICS_API_URLS, SYNTHETICS_INDEX_PATTERN } from '../common/constants';
import { SyntheticsServerSetup } from './types';

export interface CountResponse {
  result: {
    body: {
      count: number;
      _shards: {
        total: number;
        successful: number;
        skipped: number;
        failed: number;
      };
    };
  };
  indices: string;
}

export class SyntheticsEsClient {
  isDev: boolean;
  request?: KibanaRequest;
  baseESClient: ElasticsearchClient;
  isInspectorEnabled?: Promise<boolean | undefined>;
  inspectableEsQueries: InspectResponse = [];
  uiSettings?: CoreRequestHandlerContext['uiSettings'];
  savedObjectsClient: SavedObjectsClientContract;

  constructor(
    savedObjectsClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    options?: {
      isDev?: boolean;
      uiSettings?: CoreRequestHandlerContext['uiSettings'];
      request?: KibanaRequest;
      heartbeatIndices?: string;
    }
  ) {
    const { isDev = false, uiSettings, request } = options ?? {};
    this.uiSettings = uiSettings;
    this.baseESClient = esClient;
    this.savedObjectsClient = savedObjectsClient;
    this.request = request;
    this.isDev = isDev;
    this.inspectableEsQueries = [];
    this.getInspectEnabled().catch(() => {});
  }

  async search<DocumentSource extends unknown, TParams extends estypes.SearchRequest>(
    params: TParams,
    operationName?: string
  ): Promise<{ body: ESSearchResponse<DocumentSource, TParams> }> {
    let res: any;
    let esError: any;

    const esParams = { index: SYNTHETICS_INDEX_PATTERN, ...params };
    const startTimeNow = Date.now();

    let esRequestStatus: RequestStatus = RequestStatus.PENDING;

    const isInspectorEnabled = await this.getInspectEnabled();

    try {
      res = await this.baseESClient.search(esParams, {
        meta: true,
        context: {
          loggingOptions: getElasticsearchRequestLoggingOptions(),
        },
      });
      esRequestStatus = RequestStatus.OK;
    } catch (e) {
      esError = e;
      esRequestStatus = RequestStatus.ERROR;
    }

    if ((isInspectorEnabled || this.isDev) && this.request) {
      this.inspectableEsQueries.push(
        getInspectResponse({
          esError,
          esRequestParams: esParams,
          esRequestStatus,
          esResponse: res?.body,
          kibanaRequest: this.request,
          operationName: operationName ?? '',
          startTime: startTimeNow,
        })
      );
    }

    if (esError) {
      throw esError;
    }

    return res;
  }

  async msearch<
    TSearchRequest extends estypes.SearchRequest = estypes.SearchRequest,
    TDocument = unknown
  >(
    requests: SearchSearchRequestBody[],
    operationName?: string
  ): Promise<{ responses: Array<InferSearchResponseOf<TDocument, TSearchRequest>> }> {
    const searches: Array<MsearchMultisearchHeader | SearchSearchRequestBody> = [];
    for (const request of requests) {
      searches.push({ index: SYNTHETICS_INDEX_PATTERN, ignore_unavailable: true });
      searches.push(request);
    }

    const startTimeNow = Date.now();

    let res: any;
    let esError: any;

    try {
      res = await this.baseESClient.msearch(
        {
          searches,
        },
        { meta: true }
      );
    } catch (e) {
      esError = e;
    }

    const isInspectorEnabled = await this.getInspectEnabled();
    if (isInspectorEnabled && this.request) {
      requests.forEach((request, index) => {
        this.inspectableEsQueries.push(
          getInspectResponse({
            esError,
            esRequestParams: { index: SYNTHETICS_INDEX_PATTERN, ...request },
            esRequestStatus: RequestStatus.OK,
            esResponse: res?.body.responses[index],
            kibanaRequest: this.request!,
            operationName: operationName ?? '',
            startTime: startTimeNow,
          })
        );
      });
    }

    return {
      responses:
        (res?.body?.responses as unknown as Array<
          InferSearchResponseOf<TDocument, TSearchRequest>
        >) ?? [],
    };
  }

  async count<TParams>(params: TParams): Promise<CountResponse> {
    let res: any;
    let esError: any;

    const esParams = { index: SYNTHETICS_INDEX_PATTERN, ...params };

    try {
      res = await this.baseESClient.count(esParams, {
        meta: true,
        context: {
          loggingOptions: getElasticsearchRequestLoggingOptions(),
        },
      });
    } catch (e) {
      esError = e;
    }

    if (esError) {
      throw esError;
    }

    return { result: res, indices: SYNTHETICS_INDEX_PATTERN };
  }
  getSavedObjectsClient() {
    return this.savedObjectsClient;
  }

  async getInspectData(path: string) {
    const isInspectorEnabled = await this.getInspectEnabled();
    const showInspectData =
      (isInspectorEnabled || this.isDev) && path !== SYNTHETICS_API_URLS.DYNAMIC_SETTINGS;

    if (showInspectData && this.inspectableEsQueries.length > 0) {
      return { _inspect: this.inspectableEsQueries };
    }
    return {};
  }
  async getInspectEnabled() {
    if (!this.uiSettings) {
      return false;
    }

    if (this.isInspectorEnabled === undefined) {
      this.isInspectorEnabled = this.uiSettings.client.get<boolean>(enableInspectEsQueries);
    }
    return this.isInspectorEnabled;
  }
}

export function createEsParams<T extends estypes.SearchRequest>(params: T): T {
  return params;
}

export const isTestUser = (server: SyntheticsServerSetup) => {
  return server.config.service?.username === 'localKibanaIntegrationTestsUser';
};

function getElasticsearchRequestLoggingOptions(): ElasticsearchRequestLoggingOptions {
  return {
    loggerName: 'synthetics',
  };
}
