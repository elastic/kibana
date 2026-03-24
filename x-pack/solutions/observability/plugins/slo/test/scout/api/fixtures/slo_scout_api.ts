/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import type { BulkDeleteInput, CreateSLOInput, UpdateSLOInput } from '@kbn/slo-schema';
import type { StoredSLODefinition } from '../../../../server/domain/models/slo';

const SLO_KIBANA_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

export function mergeSloApiHeaders(apiKeyHeader: Record<string, string>): Record<string, string> {
  return {
    ...SLO_KIBANA_HEADERS,
    ...apiKeyHeader,
  };
}

function withQuery(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  if (!query) {
    return path;
  }
  const entries = Object.entries(query).filter(([, v]) => v !== undefined && v !== null) as Array<
    [string, string | number | boolean]
  >;
  if (entries.length === 0) {
    return path;
  }
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return `${path}?${qs}`;
}

export interface SloScoutApi {
  create(slo: CreateSLOInput): ReturnType<ApiClientFixture['post']>;
  createWithSpace(
    slo: CreateSLOInput & { id?: string },
    spaceId: string
  ): ReturnType<ApiClientFixture['post']>;
  reset(id: string): ReturnType<ApiClientFixture['post']>;
  update(input: { sloId: string; slo: UpdateSLOInput }): ReturnType<ApiClientFixture['put']>;
  enable(sloId: string): ReturnType<ApiClientFixture['post']>;
  disable(sloId: string): ReturnType<ApiClientFixture['post']>;
  delete(id: string): ReturnType<ApiClientFixture['delete']>;
  bulkDelete(params: BulkDeleteInput): ReturnType<ApiClientFixture['post']>;
  bulkDeleteStatus(taskId: string): ReturnType<ApiClientFixture['get']>;
  get(id: string): ReturnType<ApiClientFixture['get']>;
  findDefinitions(params?: Record<string, string>): ReturnType<ApiClientFixture['get']>;
  searchDefinitions(params?: {
    search?: string;
    size?: number;
    searchAfter?: string;
    remoteName?: string;
  }): ReturnType<ApiClientFixture['get']>;
  deleteAllSLOs(): Promise<void>;
  purgeRollupData(
    ids: string[],
    purgePolicy: { purgeType: 'fixed_age' | 'fixed_time'; age?: string; timestamp?: Date },
    _expectedStatus: number,
    force?: boolean
  ): ReturnType<ApiClientFixture['post']>;
  repair(list: string[]): ReturnType<ApiClientFixture['post']>;
  purgeInstances(params: {
    list?: string[];
    staleDuration?: string;
    force?: boolean;
  }): ReturnType<ApiClientFixture['post']>;
  purgeInstancesStatus(taskId: string): ReturnType<ApiClientFixture['get']>;
  findInstances(
    sloId: string,
    params: { search?: string; size?: string; searchAfter?: string }
  ): ReturnType<ApiClientFixture['get']>;
  getSettings(): ReturnType<ApiClientFixture['get']>;
  updateSettings(settings: Record<string, unknown>): ReturnType<ApiClientFixture['put']>;
  getTemplate(templateId: string): ReturnType<ApiClientFixture['get']>;
  findTemplates(params: {
    search?: string;
    tags?: string[];
    page?: number;
    perPage?: number;
  }): ReturnType<ApiClientFixture['get']>;
  getSavedObject(sloId: string): ReturnType<ApiClientFixture['get']>;
  updateSavedObject(
    slo: StoredSLODefinition,
    savedObjectId: string
  ): ReturnType<ApiClientFixture['put']>;
  scheduleHealthScan(params?: { force?: boolean }): ReturnType<ApiClientFixture['post']>;
  getHealthScanResults(
    scanId: string,
    params?: {
      size?: number;
      searchAfter?: string;
      problematic?: boolean;
      allSpaces?: boolean;
    }
  ): ReturnType<ApiClientFixture['get']>;
  listHealthScans(params?: { size?: number }): ReturnType<ApiClientFixture['get']>;
  findSlosWithKql(query: Record<string, string | number>): ReturnType<ApiClientFixture['get']>;
  postGroupedStats(body: Record<string, unknown>): ReturnType<ApiClientFixture['post']>;
}

export function createSloScoutApi(
  apiClient: ApiClientFixture,
  authHeaders: Record<string, string>
): SloScoutApi {
  const jsonHeaders = { ...authHeaders, Accept: 'application/json' };

  return {
    create(slo: CreateSLOInput) {
      return apiClient.post('api/observability/slos', {
        headers: jsonHeaders,
        body: slo,
        responseType: 'json',
      });
    },

    createWithSpace(slo, spaceId) {
      return apiClient.post(`s/${spaceId}/api/observability/slos`, {
        headers: jsonHeaders,
        body: slo,
        responseType: 'json',
      });
    },

    reset(id: string) {
      return apiClient.post(`api/observability/slos/${id}/_reset`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    update({ sloId, slo }) {
      return apiClient.put(`api/observability/slos/${sloId}`, {
        headers: jsonHeaders,
        body: slo,
        responseType: 'json',
      });
    },

    enable(sloId: string) {
      return apiClient.post(`api/observability/slos/${sloId}/enable`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    disable(sloId: string) {
      return apiClient.post(`api/observability/slos/${sloId}/disable`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    delete(id: string) {
      return apiClient.delete(`api/observability/slos/${id}`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    bulkDelete(params: BulkDeleteInput) {
      return apiClient.post('api/observability/slos/_bulk_delete', {
        headers: jsonHeaders,
        body: params,
        responseType: 'json',
      });
    },

    bulkDeleteStatus(taskId: string) {
      return apiClient.get(`api/observability/slos/_bulk_delete/${taskId}`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    get(id: string) {
      return apiClient.get(`api/observability/slos/${id}`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    findDefinitions(params?: Record<string, string>) {
      return apiClient.get(withQuery('api/observability/slos/_definitions', params), {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    searchDefinitions(params) {
      const queryParams: Record<string, string | number> = {};
      if (params?.search !== undefined) {
        queryParams.search = params.search;
      }
      if (params?.size !== undefined) {
        queryParams.size = params.size;
      }
      if (params?.searchAfter !== undefined) {
        queryParams.searchAfter = params.searchAfter;
      }
      if (params?.remoteName !== undefined) {
        queryParams.remoteName = params.remoteName;
      }
      return apiClient.get(
        withQuery('internal/observability/slos/_search_definitions', queryParams),
        {
          headers: jsonHeaders,
          responseType: 'json',
        }
      );
    },

    async deleteAllSLOs() {
      const response = await apiClient.get('api/observability/slos/_definitions', {
        headers: jsonHeaders,
        responseType: 'json',
      });
      if (response.statusCode !== 200) {
        throw new Error(`deleteAllSLOs: findDefinitions failed with ${response.statusCode}`);
      }
      const results = (response.body as { results?: Array<{ id: string }> }).results ?? [];
      for (const { id } of results) {
        const del = await apiClient.delete(`api/observability/slos/${id}`, {
          headers: jsonHeaders,
          responseType: 'json',
        });
        if (del.statusCode !== 204) {
          throw new Error(`deleteAllSLOs: delete ${id} failed with ${del.statusCode}`);
        }
      }
    },

    purgeRollupData(ids, purgePolicy, _expectedStatus, force = false) {
      const suffix = force ? '?force=true' : '';
      return apiClient.post(`api/observability/slos/_bulk_purge_rollup${suffix}`, {
        headers: jsonHeaders,
        body: { ids, purgePolicy },
        responseType: 'json',
      });
    },

    repair(list: string[]) {
      return apiClient.post('api/observability/slos/_repair', {
        headers: jsonHeaders,
        body: { list },
        responseType: 'json',
      });
    },

    purgeInstances(params) {
      return apiClient.post('api/observability/slos/_purge_instances', {
        headers: jsonHeaders,
        body: params,
        responseType: 'json',
      });
    },

    purgeInstancesStatus(taskId: string) {
      return apiClient.get(`api/observability/slos/_purge_instances/${taskId}`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    findInstances(sloId, params) {
      return apiClient.get(withQuery(`internal/observability/slos/${sloId}/_instances`, params), {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    getSettings() {
      return apiClient.get('internal/slo/settings', {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    updateSettings(settings: Record<string, unknown>) {
      return apiClient.put('internal/slo/settings', {
        headers: jsonHeaders,
        body: settings,
        responseType: 'json',
      });
    },

    getTemplate(templateId: string) {
      return apiClient.get(`api/observability/slo_templates/${templateId}`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    findTemplates(params) {
      const queryParams: Record<string, string | number> = {};
      if (params.search !== undefined) {
        queryParams.search = params.search;
      }
      if (params.tags && params.tags.length > 0) {
        queryParams.tags = params.tags.join(',');
      }
      if (params.page !== undefined) {
        queryParams.page = params.page;
      }
      if (params.perPage !== undefined) {
        queryParams.perPage = params.perPage;
      }
      return apiClient.get(withQuery('api/observability/slo_templates', queryParams), {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    getSavedObject(sloId: string) {
      return apiClient.get(`api/saved_objects/_find?type=slo&filter=slo.attributes.id:(${sloId})`, {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    updateSavedObject(slo: StoredSLODefinition, savedObjectId: string) {
      return apiClient.put(`api/saved_objects/slo/${savedObjectId}`, {
        headers: jsonHeaders,
        body: { attributes: slo },
        responseType: 'json',
      });
    },

    scheduleHealthScan(params) {
      return apiClient.post('internal/observability/slos/_health/scans', {
        headers: jsonHeaders,
        body: params ?? {},
        responseType: 'json',
      });
    },

    getHealthScanResults(scanId, params) {
      const queryParams: Record<string, string | number | boolean> = {};
      if (params?.size !== undefined) {
        queryParams.size = params.size;
      }
      if (params?.searchAfter !== undefined) {
        queryParams.searchAfter = params.searchAfter;
      }
      if (params?.problematic !== undefined) {
        queryParams.problematic = params.problematic;
      }
      if (params?.allSpaces !== undefined) {
        queryParams.allSpaces = params.allSpaces;
      }
      return apiClient.get(
        withQuery(`internal/observability/slos/_health/scans/${scanId}`, queryParams),
        {
          headers: jsonHeaders,
          responseType: 'json',
        }
      );
    },

    listHealthScans(params) {
      const queryParams: Record<string, string | number> = {};
      if (params?.size !== undefined) {
        queryParams.size = params.size;
      }
      return apiClient.get(withQuery('internal/observability/slos/_health/scans', queryParams), {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    findSlosWithKql(query: Record<string, string | number>) {
      return apiClient.get(withQuery('api/observability/slos', query), {
        headers: jsonHeaders,
        responseType: 'json',
      });
    },

    postGroupedStats(body: Record<string, unknown>) {
      return apiClient.post('internal/slos/_grouped_stats', {
        headers: jsonHeaders,
        body,
        responseType: 'json',
      });
    },
  };
}
