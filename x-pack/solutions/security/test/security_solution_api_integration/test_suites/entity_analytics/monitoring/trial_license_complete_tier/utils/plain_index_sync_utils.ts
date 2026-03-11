/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import type { Client } from '@elastic/elasticsearch';
import type { CreateEntitySourceRequestBody } from '@kbn/security-solution-plugin/common/api/entity_analytics/monitoring/monitoring_entity_source/monitoring_entity_source.gen';

interface LoggerService {
  info(message: string): void;
  error(message: string): void;
}

interface EntityAnalyticsApiService {
  createEntitySource(params: { body: CreateEntitySourceRequestBody }): Promise<{ status: number }>;
}

interface GetPlainIndexSyncService {
  (name: 'log'): LoggerService;
  (name: 'es'): Client;
  (name: 'entityAnalyticsApi'): EntityAnalyticsApiService;
}

interface PlainIndexSyncUtilsApi {
  createIndex(): Promise<unknown>;
  addUsersToIndex(users: string[]): Promise<void>;
  deleteUserFromIndex(userName: string): Promise<void>;
  createEntitySourceForIndex(): Promise<{ status: number }>;
  deleteIndex(): Promise<void>;
}

export const PlainIndexSyncUtils = (
  getService: GetPlainIndexSyncService,
  indexName: string,
  namespace: string = 'default'
): PlainIndexSyncUtilsApi => {
  const log = getService('log');
  const es = getService('es');
  const entityAnalyticsApi = getService('entityAnalyticsApi');

  log.info(`Monitoring: Privileged Users: Using namespace ${namespace}`);

  const createIndex = async () =>
    es.indices.create({
      index: indexName,
      mappings: {
        properties: {
          user: {
            properties: {
              name: {
                type: 'keyword',
                fields: {
                  text: { type: 'text' },
                },
              },
              role: {
                type: 'keyword',
              },
            },
          },
        },
      },
    });

  const addUsersToIndex = async (users: string[]) => {
    const ops = users.flatMap((name) => [{ index: {} }, { user: { name, role: 'admin' } }]);
    await es.bulk({
      index: indexName,
      body: ops,
      refresh: true,
    });
  };

  const deleteUserFromIndex = async (userName: string) => {
    await es.deleteByQuery({
      index: indexName,
      query: {
        match: { 'user.name': userName },
      },
      refresh: true,
    });
  };

  const createEntitySourceForIndex = async () => {
    const entitySource: CreateEntitySourceRequestBody = {
      type: 'index',
      name: `Entity source for index ${indexName}`,
      indexPattern: indexName,
      enabled: true,
      matchers: [
        {
          fields: ['user.role'],
          values: ['admin'],
        },
      ],
      filter: {},
    };

    const response = await entityAnalyticsApi.createEntitySource({ body: entitySource });
    expect(response.status).toBe(200);

    return response;
  };

  const deleteIndex = async () => {
    try {
      await es.indices.delete({ index: indexName }, { ignore: [404] });
    } catch (err) {
      log.error(`Error deleting index ${indexName}: ${err}`);
    }
  };

  return {
    createIndex,
    addUsersToIndex,
    deleteUserFromIndex,
    createEntitySourceForIndex,
    deleteIndex,
  };
};
