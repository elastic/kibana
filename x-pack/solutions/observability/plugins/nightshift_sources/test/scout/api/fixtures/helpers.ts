/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type {
  CreateSourceRequest,
  ListSourcesResponse,
  NightshiftSource,
  UpdateSourceRequest,
} from '@kbn/nightshift-shared';
import type { ApiClientFixture, ApiClientResponse, EsClient } from '@kbn/scout-oblt';
import { COMMON_HEADERS, SOURCES_PATH, TEST_INDEX_PREFIX } from './constants';

type CookieHeader = Record<string, string>;

export interface SourceRequestOptions {
  spaceId?: string;
}

const spacePath = (path: string, spaceId?: string): string =>
  spaceId ? `s/${spaceId}/${path}` : path;

/** A per-run suffix so repeated runs against a shared deployment cannot collide. */
export const uniqueSuffix = (): string => randomUUID().slice(0, 8);

export const testIndexName = (suffix: string): string => `${TEST_INDEX_PREFIX}${suffix}`;

const withHeaders = (cookieHeader: CookieHeader) => ({
  headers: { ...COMMON_HEADERS, ...cookieHeader },
  responseType: 'json' as const,
});

export const createSource = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  body: CreateSourceRequest,
  { spaceId }: SourceRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.post(spacePath(SOURCES_PATH, spaceId), { ...withHeaders(cookieHeader), body });

export const getSource = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string,
  { spaceId }: SourceRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.get(spacePath(`${SOURCES_PATH}/${id}`, spaceId), withHeaders(cookieHeader));

export const listSources = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  query = '',
  { spaceId }: SourceRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.get(
    spacePath(query ? `${SOURCES_PATH}?${query}` : SOURCES_PATH, spaceId),
    withHeaders(cookieHeader)
  );

export const updateSource = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string,
  body: UpdateSourceRequest,
  { spaceId }: SourceRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.put(spacePath(`${SOURCES_PATH}/${id}`, spaceId), {
    ...withHeaders(cookieHeader),
    body,
  });

export const deleteSource = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string,
  { spaceId }: SourceRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.delete(spacePath(`${SOURCES_PATH}/${id}`, spaceId), withHeaders(cookieHeader));

/** 200/404 are gone; anything else is a leak we should fail teardown on. */
export const deleteSourceChecked = async (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string,
  options: SourceRequestOptions = {}
): Promise<void> => {
  const deleted = await deleteSource(apiClient, cookieHeader, id, options);
  if (deleted.statusCode !== 200 && deleted.statusCode !== 404) {
    throw new Error(`Failed to delete source ${id}: ${JSON.stringify(deleted.body)}`);
  }
};

export const setSourceEnabled = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string,
  enabled: boolean,
  { spaceId }: SourceRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.post(spacePath(`${SOURCES_PATH}/${id}/${enabled ? '_enable' : '_disable'}`, spaceId), {
    ...withHeaders(cookieHeader),
    body: {},
  });

export const findListed = (body: ListSourcesResponse, id: string): NightshiftSource | undefined =>
  body.sources.find((source) => source.id === id);

export const listedIds = (body: ListSourcesResponse): string[] =>
  body.sources.map((source) => source.id);

export const createTestIndex = async (esClient: EsClient, index: string): Promise<void> => {
  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        status: { type: 'integer' },
        host: { properties: { name: { type: 'keyword' } } },
      },
    },
  });
  await esClient.index({
    index,
    refresh: 'wait_for',
    document: { '@timestamp': new Date().toISOString(), status: 500, host: { name: 'web-1' } },
  });
};

export const deleteTestIndex = (esClient: EsClient, index: string): Promise<unknown> =>
  esClient.indices.delete({ index }, { ignore: [404] });

export const readView = async (
  esClient: EsClient,
  name: string
): Promise<{ name: string; query: string } | undefined> => {
  const body = (await esClient.esql.getView({ name }, { ignore: [404] })) as {
    views?: Array<{ name: string; query: string }>;
  };
  return Array.isArray(body.views) ? body.views[0] : undefined;
};

export const cleanupSources = async (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  titlePrefix: string,
  { spaceId }: SourceRequestOptions = {}
): Promise<void> => {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const response = await listSources(
      apiClient,
      cookieHeader,
      `search=${encodeURIComponent(titlePrefix)}&per_page=100&page=${page}`,
      { spaceId }
    );
    if (response.statusCode !== 200) {
      throw new Error(`Failed to list sources for cleanup: ${JSON.stringify(response.body)}`);
    }
    const { sources, total } = response.body as ListSourcesResponse;
    ids.push(...sources.map((source) => source.id));
    if (sources.length === 0 || ids.length >= total) {
      break;
    }
  }
  for (const id of ids) {
    await deleteSourceChecked(apiClient, cookieHeader, id, { spaceId });
  }
};
