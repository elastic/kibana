/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  KibanaRequest,
  CoreRequestHandlerContext,
  SavedObjectsErrorHelpers,
  type ElasticsearchRequestLoggingOptions,
} from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchResponse } from '@kbn/es-types';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { InspectResponse } from '@kbn/observability-plugin/typings/common';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { getInspectResponse } from '@kbn/observability-shared-plugin/common';
import semver from 'semver/preload';
import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../../constants/settings';
import { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { settingsObjectId, umDynamicSettings } from './saved_objects/uptime_settings';
import { API_URLS } from '../../../common/constants';

export type { UMServerLibs } from '../uptime_server';

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

export class UptimeEsClient {
  isDev: boolean;
  request?: KibanaRequest;
  baseESClient: ElasticsearchClient;
  heartbeatIndices: string;
  isInspectorEnabled?: Promise<boolean | undefined>;
  inspectableEsQueries: InspectResponse = [];
  uiSettings?: CoreRequestHandlerContext['uiSettings'];
  savedObjectsClient: SavedObjectsClientContract;
  isLegacyAlert?: boolean;
  stackVersion?: string;

  constructor(
    savedObjectsClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    options?: {
      isDev?: boolean;
      uiSettings?: CoreRequestHandlerContext['uiSettings'];
      request?: KibanaRequest;
      heartbeatIndices?: string;
      stackVersion?: string;
    }
  ) {
    const {
      stackVersion,
      isDev = false,
      uiSettings,
      request,
      heartbeatIndices = '',
    } = options ?? {};
    this.stackVersion = stackVersion;
    this.uiSettings = uiSettings;
    this.baseESClient = esClient;
    this.savedObjectsClient = savedObjectsClient;
    this.request = request;
    this.heartbeatIndices = heartbeatIndices;
    this.isDev = isDev;
    this.inspectableEsQueries = [];
    this.getInspectEnabled().catch(() => {});
  }

  async initSettings() {
    const self = this;
    const heartbeatIndices = await this.getIndices();
    self.heartbeatIndices = heartbeatIndices || '';
  }

  async search<DocumentSource extends unknown, TParams extends estypes.SearchRequest>(
    params: TParams,
    operationName?: string,
    index?: string
  ): Promise<{ body: ESSearchResponse<DocumentSource, TParams> }> {
    let res: any;
    let esError: any;

    await this.initSettings();

    const esParams = { index: index ?? this.heartbeatIndices, ...params };

    const startTimeNow = Date.now();

    let esRequestStatus: RequestStatus = RequestStatus.PENDING;

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
    if (this.request) {
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
  async count<TParams>(params: TParams): Promise<CountResponse> {
    let res: any;
    let esError: any;

    await this.initSettings();

    const esParams = { index: this.heartbeatIndices, ...params };

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

    return { result: res, indices: this.heartbeatIndices };
  }
  getSavedObjectsClient() {
    return this.savedObjectsClient;
  }

  async getInspectData(path: string) {
    const isInspectorEnabled = await this.getInspectEnabled();
    const showInspectData =
      (isInspectorEnabled || this.isDev) && path !== API_URLS.DYNAMIC_SETTINGS;

    if (showInspectData && this.inspectableEsQueries.length > 0) {
      return { _inspect: this.inspectableEsQueries };
    }
    return {};
  }
  async getInspectEnabled() {
    if (this.isInspectorEnabled !== undefined) {
      return this.isInspectorEnabled;
    }

    if (!this.uiSettings) {
      return false;
    }

    this.isInspectorEnabled = this.uiSettings.client.get<boolean>(enableInspectEsQueries);
  }

  async getIndices() {
    // if isLegacyAlert appends synthetics-* if it's not already there
    let indices = '';
    let syntheticsIndexRemoved = false;
    let settingsChangedByUser = true;
    let settings: DynamicSettingsAttributes = DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES;
    if (this.heartbeatIndices) {
      indices = this.heartbeatIndices;
    } else {
      try {
        const obj = await this.savedObjectsClient.get<DynamicSettingsAttributes>(
          umDynamicSettings.name,
          settingsObjectId
        );
        settings = obj.attributes;
      } catch (getErr) {
        if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
          settingsChangedByUser = false;
        }
      }

      indices = settings?.heartbeatIndices || '';
      syntheticsIndexRemoved = settings.syntheticsIndexRemoved ?? false;
    }
    if (indices.includes('synthetics-')) {
      return indices;
    }
    const appendSyntheticsIndex = shouldAppendSyntheticsIndex(this.stackVersion);

    if (appendSyntheticsIndex && (syntheticsIndexRemoved || !settingsChangedByUser)) {
      indices = indices + ',synthetics-*';
    }
    return indices;
  }
}

export const shouldAppendSyntheticsIndex = (stackVersion?: string) => {
  if (!stackVersion) {
    return false;
  }
  return semver.lt(stackVersion, '8.10.0');
};

export function createEsParams<T extends estypes.SearchRequest>(params: T): T {
  return params;
}

function getElasticsearchRequestLoggingOptions(): ElasticsearchRequestLoggingOptions {
  return {
    loggerName: 'synthetics',
  };
}
