/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export const PlainIndexSyncUtils = (
  getService: FtrProviderContext['getService'],
  indexName: string,
  namespace: string = 'default'
) => {
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
    const entitySource = {
      type: 'index',
      name: `Entity source for index ${indexName}`,
      managed: true,
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
