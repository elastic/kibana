/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import type { CreateEntitySourceRequestBody } from '@kbn/security-solution-plugin/common/api/entity_analytics/monitoring/monitoring_entity_source/monitoring_entity_source.gen';
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

  return {
    addUsersToIndex,
    deleteUserFromIndex,
    createEntitySourceForIndex,
  };
};
